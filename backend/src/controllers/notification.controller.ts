import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { logger } from "../config/logger";
import { getReqUser } from "../utils/dataScope";
import { db } from "../utils/db";
import { emitToUser } from "../realtime/socket";
import { pushToUser } from "../utils/webpush";

import { sendError } from "../middlewares/error.middleware";
/**
 * Notifications / messages persistés en base (table Notification).
 * Chaque utilisateur ne voit / ne modifie QUE ses propres notifications.
 *
 * Messagerie : un message peut avoir un expéditeur, une réponse (replyToId),
 * des pièces jointes (image, vidéo, audio, fichier, archive), une position GPS,
 * et chaque changement est poussé en temps réel (socket "user:<id>") afin que
 * les compteurs se mettent à jour automatiquement.
 */

const NOTIFICATION_TYPES = ["INFO", "SUCCESS", "WARNING", "ERROR"];

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 Mo par pièce jointe
const MAX_ATTACHMENTS = 10;
const MAX_TEXT = 5000;
const ORPHAN_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_SCHEDULE_MS = 90 * 24 * 60 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

const SENDER_SELECT = { id: true, firstName: true, lastName: true, role: true } as const;

const MESSAGE_INCLUDE = {
  sender: { select: SENDER_SELECT },
  attachments: {
    select: { id: true, name: true, mime: true, kind: true, size: true },
    orderBy: { id: "asc" },
  },
  replyTo: {
    select: {
      id: true,
      title: true,
      message: true,
      latitude: true,
      attachments: { select: { id: true, kind: true } },
      sender: { select: SENDER_SELECT },
    },
  },
} as const;

/** Réduit l'aperçu du message cité (on n'expose jamais tout le contenu). */
function toDto(row: Row): Row {
  if (!row) return row;

  const replyTo = row.replyTo
    ? {
        id: row.replyTo.id,
        title: row.replyTo.title,
        message: String(row.replyTo.message ?? "").slice(0, 160),
        sender: row.replyTo.sender ?? null,
        hasAttachments: (row.replyTo.attachments?.length ?? 0) > 0,
        hasLocation: row.replyTo.latitude !== null && row.replyTo.latitude !== undefined,
      }
    : null;

  return { ...row, sender: row.sender ?? null, attachments: row.attachments ?? [], replyTo };
}

function unauthorized(res: Response): void {
  res.status(401).json({
    success: false,
    message: "Utilisateur non authentifié",
  });
}

function parseId(req: Request, res: Response): number | null {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({
      success: false,
      message: "Identifiant notification invalide",
    });
    return null;
  }

  return id;
}

function bad(res: Response, message: string): void {
  res.status(400).json({ success: false, message });
}

/** Position facultative : null si absente, "invalid" si hors limites. */
function parseLocation(
  body: Row,
): { latitude: number; longitude: number; accuracy: number | null } | null | "invalid" {
  const hasLat = body?.latitude !== undefined && body?.latitude !== null && body?.latitude !== "";
  const hasLng = body?.longitude !== undefined && body?.longitude !== null && body?.longitude !== "";

  if (!hasLat && !hasLng) return null;
  if (!hasLat || !hasLng) return "invalid";

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return "invalid";
  }

  const accuracy =
    body.accuracy !== undefined && body.accuracy !== null && Number.isFinite(Number(body.accuracy))
      ? Math.max(0, Number(body.accuracy))
      : null;

  return { latitude, longitude, accuracy };
}

function parseAttachmentIds(raw: unknown): number[] | "invalid" {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return "invalid";

  const ids = Array.from(new Set(raw.map((value) => Number(value))));

  if (ids.some((id) => !Number.isInteger(id) || id <= 0) || ids.length > MAX_ATTACHMENTS) {
    return "invalid";
  }

  return ids;
}

interface MessageInput {
  senderId: number;
  senderName: string;
  recipientIds: number[];
  title: string;
  message: string;
  type: string;
  replyToId?: number | null;
  /** Identifiant commun des messages d'un envoi de groupe (null = message individuel). */
  batchId?: string | null;
  /** Nombre de participants du groupe, expéditeur compris. */
  groupSize?: number | null;
  attachmentIds: number[];
  location: { latitude: number; longitude: number; accuracy: number | null } | null;
}

/** Texte court affiché dans la notification système (PC / téléphone). */
function pushBody(text: string, hasFiles: boolean, hasLocation: boolean): string {
  if (text) return text;
  if (hasFiles) return "📎 Pièce jointe";
  if (hasLocation) return "📍 Position partagée";
  return "";
}

/**
 * Crée un message pour chaque destinataire (envoi individuel ou de groupe), rattache
 * les mêmes pièces jointes à tous, puis le pousse en temps réel et en notification système.
 */
async function createMessages(input: MessageInput): Promise<Row[]> {
  const created: Row[] = await db.$transaction(
    async (tx: Row) => {
      const rows: Row[] = [];

      for (const recipientId of input.recipientIds) {
        rows.push(
          await tx.notification.create({
            data: {
              userId: recipientId,
              senderId: input.senderId,
              replyToId: input.replyToId ?? null,
              batchId: input.batchId ?? null,
              groupSize: input.groupSize ?? null,
              title: input.title,
              message: input.message,
              type: input.type,
              latitude: input.location?.latitude ?? null,
              longitude: input.location?.longitude ?? null,
              accuracy: input.location?.accuracy ?? null,
              ...(input.attachmentIds.length > 0
                ? { attachments: { connect: input.attachmentIds.map((id) => ({ id })) } }
                : {}),
            },
            include: MESSAGE_INCLUDE,
          }),
        );
      }

      return rows;
    },
    { timeout: 120_000, maxWait: 10_000 },
  );

  const body = pushBody(input.message, input.attachmentIds.length > 0, !!input.location);

  return created.map((row) => {
    const dto = toDto(row);

    emitToUser(row.userId, "notification:new", dto);

    void pushToUser(row.userId, {
      title: `${input.senderName} — ${input.title}`,
      body,
      url: `/notifications?source=${encodeURIComponent(`u:${input.senderId}`)}`,
      tag: `ndao-msg-${row.id}`,
    });

    return dto;
  });
}

/** Vérifie que les pièces jointes existent et ont bien été envoyées par l'expéditeur. */
async function checkAttachments(userId: number, ids: number[]): Promise<boolean> {
  if (ids.length === 0) return true;

  const count = await db.notificationAttachment.count({
    where: { id: { in: ids }, uploaderId: userId },
  });

  return count === ids.length;
}

/* ------------------------------------------------------------------ */
/* Destinataires : personne(s), rôles, directions / départements, mission */
/* ------------------------------------------------------------------ */

const AUDIENCE_ROLES = [
  "ADMIN",
  "DIRECTION",
  "DSI",
  "DAF",
  "RH",
  "COMMUNICATION",
  "COORDINATOR",
  "TUTEUR_L3",
  "TUTEUR_M2",
  "STAGIAIRE_L3",
  "STAGIAIRE_M2",
];

const MAX_RECIPIENTS = 500;

interface Audience {
  userIds: number[];
  roles: string[];
  departmentIds: number[];
  onMission: boolean;
}

function toIntList(raw: unknown): number[] | "invalid" {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return "invalid";

  const ids = Array.from(new Set(raw.map((value) => Number(value))));
  return ids.some((id) => !Number.isInteger(id) || id <= 0) ? "invalid" : ids;
}

/** `audience` = { userIds, roles, departmentIds, onMission } ; l'ancien champ `userId` reste accepté. */
function parseAudience(body: Row): Audience | "invalid" {
  const source = body?.audience ?? {};

  const userIds = toIntList(source.userIds);
  const departmentIds = toIntList(source.departmentIds);

  if (userIds === "invalid" || departmentIds === "invalid") return "invalid";

  if (body?.userId !== undefined && body?.userId !== null && body?.userId !== "") {
    const single = Number(body.userId);
    if (!Number.isInteger(single) || single <= 0) return "invalid";
    userIds.push(single);
  }

  const roles: string[] = Array.isArray(source.roles)
    ? Array.from(new Set(source.roles.map((role: unknown) => String(role))))
    : [];

  if (roles.some((role) => !AUDIENCE_ROLES.includes(role))) return "invalid";

  return { userIds, roles, departmentIds, onMission: source.onMission === true };
}

/** Comptes ACTIFS correspondant à l'union des critères (l'expéditeur est exclu). */
async function resolveRecipients(audience: Audience, senderId: number): Promise<number[]> {
  const or: Row[] = [];

  if (audience.userIds.length) or.push({ id: { in: audience.userIds } });
  if (audience.roles.length) or.push({ role: { in: audience.roles } });
  if (audience.departmentIds.length) or.push({ departmentId: { in: audience.departmentIds } });
  if (audience.onMission) or.push({ sharingLocation: true });

  if (or.length === 0) return [];

  const rows = (await db.user.findMany({
    where: { status: "ACTIVE", id: { not: senderId }, OR: or },
    select: { id: true },
    take: MAX_RECIPIENTS + 1,
  })) as Array<{ id: number }>;

  return rows.map((row) => row.id);
}

async function pushUpdate(userId: number, id: number): Promise<Row> {
  const row = await db.notification.findUnique({ where: { id }, include: MESSAGE_INCLUDE });
  const dto = toDto(row);
  if (dto) emitToUser(userId, "notification:update", dto);
  return dto;
}

export async function getNotifications(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    // Ouverture de la boîte : tout ce qui n'était pas encore arrivé est « reçu » maintenant
    await db.notification.updateMany({
      where: { userId: user.id, receivedAt: null },
      data: { receivedAt: new Date() },
    });

    const rows = await db.notification.findMany({
      where: { userId: user.id },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    res.status(200).json({
      success: true,
      data: rows.map(toDto),
    });
  } catch (error) {
    logger.error("Erreur récupération notifications", error);

    sendError(res, error, "Erreur lors de la récupération des notifications");
  }
}

export async function getNotificationById(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const id = parseId(req, res);
    if (id === null) return;

    const notification = await db.notification.findFirst({
      where: { id, userId: user.id },
      include: MESSAGE_INCLUDE,
    });

    if (!notification) {
      res.status(404).json({
        success: false,
        message: "Notification introuvable",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: toDto(notification),
    });
  } catch (error) {
    logger.error("Erreur récupération notification", error);

    sendError(res, error, "Erreur lors de la récupération de la notification");
  }
}

/** POST /api/notifications/audience/preview — nombre de destinataires d'une sélection. */
export async function previewAudience(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const audience = parseAudience(req.body);
    if (audience === "invalid") return bad(res, "Sélection de destinataires invalide");

    const ids = await resolveRecipients(audience, user.id);

    res.status(200).json({
      success: true,
      data: { count: Math.min(ids.length, MAX_RECIPIENTS), tooMany: ids.length > MAX_RECIPIENTS },
    });
  } catch (error) {
    logger.error("Erreur aperçu destinataires", error);

    sendError(res, error, "Erreur lors du calcul des destinataires");
  }
}

/** Envoi d'un nouveau message à une personne OU à un ou plusieurs groupes. */
export async function createNotification(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const { title, message, type } = req.body ?? {};

    const text = String(message ?? "").trim();
    const attachmentIds = parseAttachmentIds(req.body?.attachmentIds);
    const location = parseLocation(req.body);
    const audience = parseAudience(req.body);

    if (!String(title ?? "").trim()) {
      return bad(res, "Le titre est obligatoire");
    }

    if (audience === "invalid") return bad(res, "Sélection de destinataires invalide");
    if (attachmentIds === "invalid") return bad(res, "Pièces jointes invalides");
    if (location === "invalid") return bad(res, "Position invalide");
    if (text.length > MAX_TEXT) return bad(res, "Message trop long");

    if (!text && attachmentIds.length === 0 && !location) {
      return bad(res, "Écrivez un message ou ajoutez une pièce jointe ou une position");
    }

    const normalizedType = String(type ?? "INFO").toUpperCase();

    if (!NOTIFICATION_TYPES.includes(normalizedType)) {
      return bad(res, "Type de notification invalide");
    }

    const recipientIds = await resolveRecipients(audience, user.id);

    if (recipientIds.length === 0) {
      return bad(res, "Aucun destinataire actif pour cette sélection");
    }

    if (recipientIds.length > MAX_RECIPIENTS) {
      return bad(res, `Trop de destinataires (${MAX_RECIPIENTS} maximum par envoi)`);
    }

    if (!(await checkAttachments(user.id, attachmentIds))) {
      return bad(res, "Pièce jointe introuvable");
    }

    // Programmation : le message est enregistré puis envoyé automatiquement à la date choisie
    const scheduledRaw = req.body?.scheduledAt;

    if (scheduledRaw !== undefined && scheduledRaw !== null && scheduledRaw !== "") {
      const when = new Date(String(scheduledRaw));

      if (Number.isNaN(when.getTime())) return bad(res, "Date de programmation invalide");
      if (when.getTime() < Date.now() + 60_000) return bad(res, "Choisissez une date au moins 1 minute dans le futur");
      if (when.getTime() > Date.now() + MAX_SCHEDULE_MS) return bad(res, "La programmation est limitée à 90 jours");

      const row = await db.scheduledMessage.create({
        data: {
          senderId: user.id,
          audience,
          title: String(title).trim().slice(0, 200),
          message: text,
          type: normalizedType,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          accuracy: location?.accuracy ?? null,
          scheduledAt: when,
          recipientCount: recipientIds.length,
          ...(attachmentIds.length > 0 ? { attachments: { connect: attachmentIds.map((id) => ({ id })) } } : {}),
        },
        select: { id: true, scheduledAt: true },
      });

      res.status(201).json({
        success: true,
        scheduled: true,
        message: `Message programmé pour le ${when.toLocaleString("fr-FR")} (${recipientIds.length} destinataire${recipientIds.length > 1 ? "s" : ""})`,
        count: recipientIds.length,
        data: row,
      });
      return;
    }

    const sender = await db.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true },
    });

    const created = await createMessages({
      senderId: user.id,
      senderName: sender ? `${sender.firstName} ${sender.lastName}`.trim() : "Nouveau message",
      recipientIds,
      // Envoi à plusieurs personnes = groupe : chacun pourra répondre à tout le groupe
      batchId: recipientIds.length > 1 ? randomUUID() : null,
      groupSize: recipientIds.length > 1 ? recipientIds.length + 1 : null,
      title: String(title).trim().slice(0, 200),
      message: text,
      type: normalizedType,
      attachmentIds,
      location,
    });

    res.status(201).json({
      success: true,
      message:
        created.length > 1
          ? `Message envoyé à ${created.length} destinataires`
          : "Notification créée avec succès",
      count: created.length,
      data: created[0],
    });
  } catch (error) {
    logger.error("Erreur création notification", error);

    sendError(res, error, "Erreur lors de la création de la notification");
  }
}

/** Réponse à un message reçu : part vers son expéditeur (tous rôles). */
export async function replyToNotification(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const id = parseId(req, res);
    if (id === null) return;

    const text = String(req.body?.message ?? "").trim();
    const attachmentIds = parseAttachmentIds(req.body?.attachmentIds);
    const location = parseLocation(req.body);

    if (attachmentIds === "invalid") return bad(res, "Pièces jointes invalides");
    if (location === "invalid") return bad(res, "Position invalide");
    if (text.length > MAX_TEXT) return bad(res, "Message trop long");

    if (!text && attachmentIds.length === 0 && !location) {
      return bad(res, "Écrivez une réponse ou ajoutez une pièce jointe ou une position");
    }

    const original = await db.notification.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        title: true,
        senderId: true,
        batchId: true,
        sender: { select: { id: true, status: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!original) {
      res.status(404).json({ success: false, message: "Notification introuvable" });
      return;
    }

    if (!original.senderId || !original.sender) {
      return bad(res, "Ce message est automatique : aucune réponse possible");
    }

    if (original.sender.status !== "ACTIVE") {
      return bad(res, "Le destinataire n'est plus actif");
    }

    if (!(await checkAttachments(user.id, attachmentIds))) {
      return bad(res, "Pièce jointe introuvable");
    }

    const baseTitle = String(original.title).replace(/^(re:\s*)+/i, "");

    // Réponse à tout le groupe : expéditeur + tous les autres destinataires du même envoi
    let recipientIds: number[] = [original.senderId];
    let batchId: string | null = null;
    let groupSize: number | null = null;

    if (req.body?.scope === "group") {
      if (!original.batchId) return bad(res, "Ce message n'a pas été envoyé à un groupe");

      const members = (await db.notification.findMany({
        where: { batchId: original.batchId },
        select: { userId: true },
      })) as Array<{ userId: number }>;

      const ids = Array.from(new Set([original.senderId, ...members.map((member) => member.userId)])).filter(
        (memberId) => memberId !== user.id,
      );

      const active = (await db.user.findMany({
        where: { id: { in: ids }, status: "ACTIVE" },
        select: { id: true },
      })) as Array<{ id: number }>;

      recipientIds = active.map((member) => member.id);

      if (recipientIds.length === 0) return bad(res, "Aucun membre actif dans ce groupe");

      batchId = original.batchId;
      groupSize = ids.length + 1;
    }

    const [reply] = await createMessages({
      senderId: user.id,
      senderName: `${original.user?.firstName ?? ""} ${original.user?.lastName ?? ""}`.trim() || "Réponse",
      recipientIds,
      batchId,
      groupSize,
      title: `Re: ${baseTitle}`.slice(0, 200),
      message: text,
      type: "INFO",
      replyToId: original.id,
      attachmentIds,
      location,
    });

    res.status(201).json({
      success: true,
      message: recipientIds.length > 1 ? `Réponse envoyée au groupe (${recipientIds.length} personnes)` : "Réponse envoyée",
      data: reply,
    });
  } catch (error) {
    logger.error("Erreur réponse notification", error);

    sendError(res, error, "Erreur lors de l'envoi de la réponse");
  }
}

async function setRead(req: Request, res: Response, read: boolean): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const id = parseId(req, res);
    if (id === null) return;

    const result = await db.notification.updateMany({
      where: { id, userId: user.id },
      data: { read },
    });

    if (result.count === 0) {
      res.status(404).json({
        success: false,
        message: "Notification introuvable",
      });
      return;
    }

    const notification = await pushUpdate(user.id, id);

    res.status(200).json({
      success: true,
      message: read ? "Notification marquée comme lue" : "Notification marquée comme non lue",
      data: notification,
    });
  } catch (error) {
    logger.error("Erreur lecture notification", error);

    sendError(res, error, "Erreur lors de la mise à jour de la notification");
  }
}

export async function markNotificationAsRead(
  req: Request,
  res: Response,
): Promise<void> {
  return setRead(req, res, true);
}

export async function markNotificationAsUnread(
  req: Request,
  res: Response,
): Promise<void> {
  return setRead(req, res, false);
}

/** PATCH /api/notifications/:id/received — l'appareil confirme la réception (idempotent). */
export async function markNotificationAsReceived(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const id = parseId(req, res);
    if (id === null) return;

    await db.notification.updateMany({
      where: { id, userId: user.id, receivedAt: null },
      data: { receivedAt: new Date() },
    });

    const notification = await db.notification.findFirst({
      where: { id, userId: user.id },
      include: MESSAGE_INCLUDE,
    });

    if (!notification) {
      res.status(404).json({ success: false, message: "Notification introuvable" });
      return;
    }

    res.status(200).json({ success: true, data: toDto(notification) });
  } catch (error) {
    logger.error("Erreur accusé de réception", error);

    sendError(res, error, "Erreur lors de l'accusé de réception");
  }
}

async function setArchived(req: Request, res: Response, archived: boolean): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const id = parseId(req, res);
    if (id === null) return;

    const result = await db.notification.updateMany({
      where: { id, userId: user.id },
      data: { archived },
    });

    if (result.count === 0) {
      res.status(404).json({ success: false, message: "Notification introuvable" });
      return;
    }

    const notification = await pushUpdate(user.id, id);

    res.status(200).json({
      success: true,
      message: archived ? "Notification archivée" : "Notification désarchivée",
      data: notification,
    });
  } catch (error) {
    logger.error("Erreur archivage notification", error);

    sendError(res, error, "Erreur lors de l'archivage de la notification");
  }
}

export async function archiveNotification(req: Request, res: Response): Promise<void> {
  return setArchived(req, res, true);
}

export async function unarchiveNotification(req: Request, res: Response): Promise<void> {
  return setArchived(req, res, false);
}

export async function markAllNotificationsAsRead(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });

    emitToUser(user.id, "notification:read-all", {});

    res.status(200).json({
      success: true,
      message: "Notifications marquées comme lues",
    });
  } catch (error) {
    logger.error("Erreur lecture notifications", error);

    sendError(res, error, "Erreur lors de la mise à jour des notifications");
  }
}

export async function deleteNotification(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const id = parseId(req, res);
    if (id === null) return;

    const result = await db.notification.deleteMany({
      where: { id, userId: user.id },
    });

    if (result.count === 0) {
      res.status(404).json({
        success: false,
        message: "Notification introuvable",
      });
      return;
    }

    emitToUser(user.id, "notification:delete", { id });

    res.status(200).json({
      success: true,
      message: "Notification supprimée avec succès",
    });
  } catch (error) {
    logger.error("Erreur suppression notification", error);

    sendError(res, error, "Erreur lors de la suppression de la notification");
  }
}

/* ------------------------------------------------------------------ */
/* Pièces jointes                                                       */
/* ------------------------------------------------------------------ */

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "heic"];
const VIDEO_EXT = ["mp4", "webm", "mov", "m4v", "ogv", "mkv", "avi", "3gp"];
const AUDIO_EXT = ["mp3", "wav", "ogg", "oga", "m4a", "aac", "flac", "opus", "weba"];
const ARCHIVE_EXT = ["zip", "rar", "7z", "tar", "gz", "tgz", "bz2"];

// Seuls ces types sont affichés « inline » ; le reste est toujours téléchargé
// (jamais d'HTML / SVG exécuté depuis l'API).
const INLINE_SAFE = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "image/bmp",
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm",
  "audio/mp4", "audio/aac", "audio/x-m4a", "audio/flac", "audio/opus",
]);

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function detectKind(mime: string, name: string): "IMAGE" | "VIDEO" | "AUDIO" | "ARCHIVE" | "FILE" {
  const ext = extensionOf(name);

  // 1) Le type MIME annoncé prime (ex. audio/webm ≠ vidéo .webm)
  if (mime === "image/svg+xml") return "FILE";
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime.startsWith("audio/")) return "AUDIO";
  if (/zip|rar|7z|tar|gzip|x-compressed/.test(mime)) return "ARCHIVE";

  // 2) Sinon l'extension (navigateurs qui n'envoient pas de type)
  if (IMAGE_EXT.includes(ext)) return "IMAGE";
  if (VIDEO_EXT.includes(ext)) return "VIDEO";
  if (AUDIO_EXT.includes(ext)) return "AUDIO";
  if (ARCHIVE_EXT.includes(ext)) return "ARCHIVE";

  return "FILE";
}

function cleanName(raw: unknown): string {
  const base = String(raw ?? "")
    .split(/[\\/]/)
    .pop() as string;

  // eslint-disable-next-line no-control-regex
  const name = base.replace(/[\u0000-\u001f\u007f"<>:|?*]/g, "").trim().slice(0, 150);
  return name || "fichier";
}

function cleanMime(raw: unknown): string {
  const mime = String(raw ?? "").split(";")[0].trim().toLowerCase();
  return /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/.test(mime) ? mime : "application/octet-stream";
}

/**
 * POST /api/notifications/attachments?name=...&mime=...
 * Corps binaire brut (Content-Type: application/octet-stream), 25 Mo max.
 */
export async function uploadAttachment(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const buffer = req.body as unknown;

    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return bad(res, "Fichier vide ou format d'envoi invalide");
    }

    if (buffer.length > MAX_FILE_BYTES) {
      res.status(413).json({ success: false, message: "Fichier trop lourd (25 Mo maximum)" });
      return;
    }

    const name = cleanName(req.query.name);
    const mime = cleanMime(req.query.mime);
    const kind = detectKind(mime, name);

    // Nettoyage des envois jamais rattachés à un message
    await db.notificationAttachment
      .deleteMany({
        where: { notifications: { none: {} }, scheduled: { none: {} }, createdAt: { lt: new Date(Date.now() - ORPHAN_TTL_MS) } },
      })
      .catch(() => undefined);

    const row = await db.notificationAttachment.create({
      data: { uploaderId: user.id, name, mime, kind, size: buffer.length, data: buffer },
      select: { id: true, name: true, mime: true, kind: true, size: true },
    });

    res.status(201).json({ success: true, data: row });
  } catch (error) {
    logger.error("Erreur envoi pièce jointe", error);

    sendError(res, error, "Erreur lors de l'envoi de la pièce jointe");
  }
}

/** GET /api/notifications/attachments/:id/file — destinataire, expéditeur ou auteur de l'envoi. */
export async function downloadAttachment(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const id = parseId(req, res);
    if (id === null) return;

    const file = await db.notificationAttachment.findUnique({
      where: { id },
      select: {
        name: true,
        mime: true,
        size: true,
        data: true,
        uploaderId: true,
        notifications: { select: { userId: true, senderId: true } },
      },
    });

    const allowed =
      !!file &&
      (file.uploaderId === user.id ||
        file.notifications.some(
          (n: { userId: number; senderId: number | null }) => n.userId === user.id || n.senderId === user.id,
        ));

    if (!file || !allowed) {
      res.status(404).json({ success: false, message: "Pièce jointe introuvable" });
      return;
    }

    const inline = INLINE_SAFE.has(file.mime);
    const data = Buffer.from(file.data);

    res.status(200);
    res.setHeader("Content-Type", inline ? file.mime : "application/octet-stream");
    res.setHeader("Content-Length", String(data.length));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader(
      "Content-Disposition",
      `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    );
    res.end(data);
  } catch (error) {
    logger.error("Erreur téléchargement pièce jointe", error);

    sendError(res, error, "Erreur lors du téléchargement de la pièce jointe");
  }
}

/* ------------------------------------------------------------------ */
/* Liste détaillée des destinataires d'une sélection                    */
/* ------------------------------------------------------------------ */

/** POST /api/notifications/audience/recipients — qui recevra le message (nom, rôle, direction). */
export async function listAudienceRecipients(req: Request, res: Response): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const audience = parseAudience(req.body);
    if (audience === "invalid") return bad(res, "Sélection de destinataires invalide");

    const ids = await resolveRecipients(audience, user.id);
    const shown = ids.slice(0, MAX_RECIPIENTS);

    const rows = (await db.user.findMany({
      where: { id: { in: shown } },
      select: { id: true, firstName: true, lastName: true, role: true, department: { select: { name: true } } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    })) as Array<{ id: number; firstName: string; lastName: string; role: string; department: { name: string } | null }>;

    res.status(200).json({
      success: true,
      data: {
        count: shown.length,
        tooMany: ids.length > MAX_RECIPIENTS,
        recipients: rows.map((r) => ({
          id: r.id,
          name: `${r.firstName} ${r.lastName}`.trim(),
          role: r.role,
          department: r.department?.name ?? null,
        })),
      },
    });
  } catch (error) {
    logger.error("Erreur liste destinataires", error);

    sendError(res, error, "Erreur lors de la lecture des destinataires");
  }
}

/* ------------------------------------------------------------------ */
/* Messages programmés                                                  */
/* ------------------------------------------------------------------ */

/** GET /api/notifications/scheduled — mes messages en attente (et les échecs récents). */
export async function listScheduled(req: Request, res: Response): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const rows = (await db.scheduledMessage.findMany({
      where: {
        senderId: user.id,
        OR: [
          { status: { in: ["PENDING", "SENDING"] } },
          { status: "FAILED", scheduledAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
        ],
      },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true, title: true, message: true, type: true, scheduledAt: true, status: true, error: true,
        recipientCount: true, latitude: true, _count: { select: { attachments: true } },
      },
    })) as Row[];

    res.status(200).json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        title: r.title,
        message: r.message,
        type: r.type,
        scheduledAt: r.scheduledAt,
        status: r.status,
        error: r.error,
        recipientCount: r.recipientCount,
        attachments: r._count.attachments,
        hasLocation: r.latitude !== null,
      })),
    });
  } catch (error) {
    logger.error("Erreur liste messages programmés", error);

    sendError(res, error, "Erreur lors de la lecture des messages programmés");
  }
}

/** DELETE /api/notifications/scheduled/:id — annule un message pas encore parti. */
export async function cancelScheduled(req: Request, res: Response): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const id = parseId(req, res);
    if (id === null) return;

    const result = await db.scheduledMessage.updateMany({
      where: { id, status: { in: ["PENDING", "FAILED"] }, ...(user.role === "ADMIN" ? {} : { senderId: user.id }) },
      data: { status: "CANCELLED" },
    });

    if (result.count === 0) {
      res.status(404).json({ success: false, message: "Message programmé introuvable ou déjà envoyé" });
      return;
    }

    res.status(200).json({ success: true, message: "Envoi programmé annulé" });
  } catch (error) {
    logger.error("Erreur annulation message programmé", error);

    sendError(res, error, "Erreur lors de l'annulation");
  }
}

async function sendDueScheduled(): Promise<void> {
  const due = (await db.scheduledMessage.findMany({
    where: { status: "PENDING", scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    take: 20,
    include: { attachments: { select: { id: true } } },
  })) as Row[];

  for (const item of due) {
    // « Réservation » atomique : un seul exemplaire du serveur envoie ce message
    const claimed = await db.scheduledMessage.updateMany({
      where: { id: item.id, status: "PENDING" },
      data: { status: "SENDING" },
    });

    if (claimed.count !== 1) continue;

    try {
      const audience = item.audience as Audience;
      const recipientIds = await resolveRecipients(audience, item.senderId);

      if (recipientIds.length === 0) throw new Error("Aucun destinataire actif pour cette sélection");
      if (recipientIds.length > MAX_RECIPIENTS) throw new Error(`Trop de destinataires (${MAX_RECIPIENTS} maximum)`);

      const sender = await db.user.findUnique({
        where: { id: item.senderId },
        select: { firstName: true, lastName: true, status: true },
      });

      if (!sender || sender.status !== "ACTIVE") throw new Error("Expéditeur désactivé");

      await createMessages({
        senderId: item.senderId,
        senderName: `${sender.firstName} ${sender.lastName}`.trim(),
        recipientIds,
        batchId: recipientIds.length > 1 ? randomUUID() : null,
        groupSize: recipientIds.length > 1 ? recipientIds.length + 1 : null,
        title: item.title,
        message: item.message,
        type: item.type,
        attachmentIds: item.attachments.map((a: { id: number }) => a.id),
        location:
          item.latitude !== null && item.longitude !== null
            ? { latitude: item.latitude, longitude: item.longitude, accuracy: item.accuracy ?? null }
            : null,
      });

      await db.scheduledMessage.update({
        where: { id: item.id },
        data: { status: "SENT", sentAt: new Date(), recipientCount: recipientIds.length, error: null },
      });

      emitToUser(item.senderId, "scheduled:update", { id: item.id, status: "SENT" });
      logger.info(`Message programmé #${item.id} envoyé à ${recipientIds.length} destinataire(s)`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.error(`Message programmé #${item.id} en échec : ${reason}`);

      await db.scheduledMessage
        .update({ where: { id: item.id }, data: { status: "FAILED", error: reason.slice(0, 300) } })
        .catch(() => undefined);

      emitToUser(item.senderId, "scheduled:update", { id: item.id, status: "FAILED" });
    }
  }
}

/** Vérifie toutes les 20 s les messages arrivés à échéance. */
export function startScheduledMessageWorker(): void {
  void db.scheduledMessage
    .updateMany({ where: { status: "SENDING" }, data: { status: "FAILED", error: "Interrompu par un redémarrage du serveur" } })
    .catch(() => undefined);

  const run = () => void sendDueScheduled().catch((error) => logger.error("Erreur envoi programmé", error));

  setInterval(run, 20_000).unref();
  run();

  logger.success("Envoi des messages programmés activé");
}
