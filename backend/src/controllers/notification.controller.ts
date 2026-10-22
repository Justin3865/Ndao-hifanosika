import { Request, Response } from "express";
import { logger } from "../config/logger";
import { getReqUser } from "../utils/dataScope";
import { db } from "../utils/db";
import { emitToUser } from "../realtime/socket";

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
  recipientId: number;
  title: string;
  message: string;
  type: string;
  replyToId?: number | null;
  attachmentIds: number[];
  location: { latitude: number; longitude: number; accuracy: number | null } | null;
}

/** Crée le message, rattache les pièces jointes puis le pousse en temps réel. */
async function createMessage(input: MessageInput): Promise<Row> {
  const created = await db.$transaction(async (tx: Row) => {
    const row = await tx.notification.create({
      data: {
        userId: input.recipientId,
        senderId: input.senderId,
        replyToId: input.replyToId ?? null,
        title: input.title,
        message: input.message,
        type: input.type,
        latitude: input.location?.latitude ?? null,
        longitude: input.location?.longitude ?? null,
        accuracy: input.location?.accuracy ?? null,
      },
    });

    if (input.attachmentIds.length > 0) {
      await tx.notificationAttachment.updateMany({
        where: { id: { in: input.attachmentIds }, uploaderId: input.senderId, notificationId: null },
        data: { notificationId: row.id },
      });
    }

    return tx.notification.findUnique({ where: { id: row.id }, include: MESSAGE_INCLUDE });
  });

  const dto = toDto(created);
  emitToUser(input.recipientId, "notification:new", dto);
  return dto;
}

/** Vérifie que les pièces jointes existent, appartiennent à l'expéditeur et sont libres. */
async function checkAttachments(userId: number, ids: number[]): Promise<boolean> {
  if (ids.length === 0) return true;

  const count = await db.notificationAttachment.count({
    where: { id: { in: ids }, uploaderId: userId, notificationId: null },
  });

  return count === ids.length;
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

/** Envoi d'un nouveau message (rôles autorisés par la route). */
export async function createNotification(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const { userId, title, message, type } = req.body ?? {};

    const text = String(message ?? "").trim();
    const attachmentIds = parseAttachmentIds(req.body?.attachmentIds);
    const location = parseLocation(req.body);

    if (!userId || !String(title ?? "").trim()) {
      return bad(res, "userId et title sont obligatoires");
    }

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

    const recipient = await db.user.findUnique({
      where: { id: Number(userId) },
      select: { id: true },
    });

    if (!recipient) {
      res.status(404).json({
        success: false,
        message: "Destinataire introuvable",
      });
      return;
    }

    if (!(await checkAttachments(user.id, attachmentIds))) {
      return bad(res, "Pièce jointe introuvable ou déjà utilisée");
    }

    const notification = await createMessage({
      senderId: user.id,
      recipientId: recipient.id,
      title: String(title).trim().slice(0, 200),
      message: text,
      type: normalizedType,
      attachmentIds,
      location,
    });

    res.status(201).json({
      success: true,
      message: "Notification créée avec succès",
      data: notification,
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
        sender: { select: { id: true, status: true } },
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
      return bad(res, "Pièce jointe introuvable ou déjà utilisée");
    }

    const baseTitle = String(original.title).replace(/^(re:\s*)+/i, "");

    const reply = await createMessage({
      senderId: user.id,
      recipientId: original.senderId,
      title: `Re: ${baseTitle}`.slice(0, 200),
      message: text,
      type: "INFO",
      replyToId: original.id,
      attachmentIds,
      location,
    });

    res.status(201).json({
      success: true,
      message: "Réponse envoyée",
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
        where: { notificationId: null, createdAt: { lt: new Date(Date.now() - ORPHAN_TTL_MS) } },
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
        notification: { select: { userId: true, senderId: true } },
      },
    });

    const allowed =
      !!file &&
      (file.uploaderId === user.id ||
        file.notification?.userId === user.id ||
        file.notification?.senderId === user.id);

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
