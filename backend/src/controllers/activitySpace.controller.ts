import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { sendError } from "../middlewares/error.middleware";
import { getReqUser } from "../utils/dataScope";
import { notifyUsers } from "../utils/notify";
import { closePeriod, computeMerit, Level, levelOf, MeritRow, validPeriod } from "../services/merit.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

/**
 * Espace « participation » des activités : demande de participation, décision, rapport + preuve,
 * pointage de présence, commentaires, note du tuteur + ordre de mérite et son historique.
 */

const MANAGERS = ["ADMIN", "DIRECTION", "COORDINATOR"];
const TUTORS = ["TUTEUR_L3", "TUTEUR_M2"];
const MERIT_FULL = ["ADMIN", "DIRECTION", "COORDINATOR", "RH"];
const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

const isIntern = (role: string) => role.startsWith("STAGIAIRE_");
const isTutor = (role: string) => TUTORS.includes(role);

const fail = (res: Response, status: number, message: string) => res.status(status).json({ success: false, message });

const wrap =
  (message: string, fn: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      logger.error(message, error);
      sendError(res, error, message);
    }
  };

function me(req: Request): { id: number; role: string } {
  const user = getReqUser(req);
  if (!user) throw new Error("Authentification requise");
  return { id: user.id, role: String(user.role).toUpperCase() };
}

const idParam = (req: Request, name = "id"): number => {
  const value = Number(req.params[name]);
  return Number.isInteger(value) && value > 0 ? value : 0;
};

/** Stagiaires encadrés par ce tuteur. */
async function supervisedInterns(tutorId: number): Promise<number[]> {
  const rows = await db.internship.findMany({ where: { supervisorId: tutorId }, select: { studentId: true } });
  return Array.from(new Set<number>(rows.map((row: { studentId: number }) => row.studentId)));
}

async function supervisorsOf(internId: number): Promise<number[]> {
  const rows = await db.internship.findMany({
    where: { studentId: internId, supervisorId: { not: null } },
    select: { supervisorId: true },
  });
  return Array.from(new Set<number>(rows.map((row: { supervisorId: number }) => row.supervisorId)));
}

/** Peut-il décider / noter cette participation ? */
async function canManage(user: { id: number; role: string }, internId: number): Promise<boolean> {
  if (MANAGERS.includes(user.role)) return true;
  if (isTutor(user.role)) return (await supervisedInterns(user.id)).includes(internId);
  return false;
}

async function getActivity(id: number) {
  return db.activity.findUnique({
    where: { id },
    select: {
      id: true, title: true, status: true, startDate: true, endDate: true, createdById: true, projectId: true,
      project: { select: { createdById: true } },
    },
  });
}

const publicParticipation = (row: Record<string, unknown>) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { proofData, ...rest } = row;
  return { ...rest, hasProof: Boolean(row.proofName) };
};

/* ------------------------------------------------------------------ */
/* Liste : mes participations / état de toutes les activités            */
/* ------------------------------------------------------------------ */

/** GET /mine — mes participations (statut par activité) + compteurs de participants acceptés. */
export const getMine = wrap("Erreur lors du chargement de vos participations", async (req, res) => {
  const user = me(req);

  const mine = await db.activityParticipation.findMany({
    where: { userId: user.id },
    select: {
      id: true, activityId: true, status: true, reportAt: true, checkedInAt: true, rating: true, proofName: true,
      report: true,
    },
  });

  const counts = await db.activityParticipation.groupBy({
    by: ["activityId"],
    where: { status: "ACCEPTED" },
    _count: { _all: true },
  });

  res.json({
    success: true,
    data: {
      mine: mine.map((row: Record<string, unknown> & { report: string | null }) => ({
        id: row.id,
        activityId: row.activityId,
        status: row.status,
        hasReport: Boolean(row.report && row.report.trim()),
        checkedIn: Boolean(row.checkedInAt),
        rating: row.rating,
        hasProof: Boolean(row.proofName),
      })),
      accepted: counts.map((row: { activityId: number; _count: { _all: number } }) => ({
        activityId: row.activityId,
        count: row._count._all,
      })),
    },
  });
});

/* ------------------------------------------------------------------ */
/* Détail d'une activité                                                */
/* ------------------------------------------------------------------ */

/** GET /:id/space — ma participation, commentaires et (pour l'encadrement) la liste des participants. */
export const getSpace = wrap("Erreur lors du chargement de l'espace activité", async (req, res) => {
  const user = me(req);
  const activityId = idParam(req);
  const activity = activityId ? await getActivity(activityId) : null;

  if (!activity) return fail(res, 404, "Activité introuvable.");

  const mine = isIntern(user.role)
    ? await db.activityParticipation.findUnique({ where: { activityId_userId: { activityId, userId: user.id } } })
    : null;

  let participants: unknown[] = [];

  if (MANAGERS.includes(user.role) || isTutor(user.role)) {
    const allowed = isTutor(user.role) ? await supervisedInterns(user.id) : null;
    const rows = await db.activityParticipation.findMany({
      where: { activityId, ...(allowed ? { userId: { in: allowed } } : {}) },
      orderBy: { createdAt: "asc" },
    });
    const users = await db.user.findMany({
      where: { id: { in: rows.map((row: { userId: number }) => row.userId) } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    const byId = new Map<number, { firstName: string; lastName: string; role: string }>(
      users.map((u: { id: number; firstName: string; lastName: string; role: string }) => [u.id, u]),
    );

    participants = rows.map((row: Record<string, unknown> & { userId: number }) => ({
      ...publicParticipation(row),
      name: `${byId.get(row.userId)?.firstName ?? ""} ${byId.get(row.userId)?.lastName ?? ""}`.trim(),
      level: levelOf(byId.get(row.userId)?.role ?? ""),
      report: row.report,
    }));
  }

  const comments = await db.activityComment.findMany({
    where: { activityId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  const authors = await db.user.findMany({
    where: { id: { in: Array.from(new Set<number>(comments.map((c: { userId: number }) => c.userId))) } },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
  const author = new Map<number, { firstName: string; lastName: string; role: string }>(
    authors.map((a: { id: number; firstName: string; lastName: string; role: string }) => [a.id, a]),
  );

  const accepted = await db.activityParticipation.count({ where: { activityId, status: "ACCEPTED" } });

  res.json({
    success: true,
    data: {
      activityId,
      canJoin: isIntern(user.role),
      canManage: MANAGERS.includes(user.role) || isTutor(user.role),
      acceptedCount: accepted,
      mine: mine ? publicParticipation(mine) : null,
      participants,
      comments: comments.map((c: { id: number; userId: number; body: string; createdAt: Date }) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt,
        mine: c.userId === user.id,
        authorName: `${author.get(c.userId)?.firstName ?? "Utilisateur"} ${author.get(c.userId)?.lastName ?? ""}`.trim(),
        authorRole: author.get(c.userId)?.role ?? "",
      })),
    },
  });
});

/* ------------------------------------------------------------------ */
/* Participation : demande / annulation / décision                      */
/* ------------------------------------------------------------------ */

export const join = wrap("Erreur lors de la demande de participation", async (req, res) => {
  const user = me(req);
  if (!isIntern(user.role)) return fail(res, 403, "Seuls les stagiaires peuvent demander à participer.");

  const activity = await getActivity(idParam(req));
  if (!activity) return fail(res, 404, "Activité introuvable.");
  if (activity.status === "CANCELLED" || activity.status === "COMPLETED") {
    return fail(res, 400, "Cette activité n'accepte plus de participants.");
  }

  const existing = await db.activityParticipation.findUnique({
    where: { activityId_userId: { activityId: activity.id, userId: user.id } },
  });
  if (existing) return fail(res, 409, "Vous avez déjà fait une demande pour cette activité.");

  const message = String(req.body?.message ?? "").trim().slice(0, 500) || null;
  const row = await db.activityParticipation.create({ data: { activityId: activity.id, userId: user.id, message } });

  const person = await db.user.findUnique({ where: { id: user.id }, select: { firstName: true, lastName: true } });
  const recipients = [activity.createdById, activity.project?.createdById, ...(await supervisorsOf(user.id))];

  await notifyUsers(
    recipients,
    {
      title: "Demande de participation",
      message: `${person?.firstName ?? ""} ${person?.lastName ?? ""} souhaite participer à « ${activity.title} ».`,
      type: "INFO",
    },
    user.id,
  );

  res.status(201).json({ success: true, data: publicParticipation(row) });
});

export const leave = wrap("Erreur lors de l'annulation", async (req, res) => {
  const user = me(req);
  const activityId = idParam(req);

  const row = await db.activityParticipation.findUnique({ where: { activityId_userId: { activityId, userId: user.id } } });
  if (!row) return fail(res, 404, "Aucune demande à annuler.");
  if (row.status === "ACCEPTED" && (row.report || row.checkedInAt || row.rating !== null)) {
    return fail(res, 400, "Participation déjà engagée (rapport, présence ou note) : contactez votre tuteur.");
  }

  await db.activityParticipation.delete({ where: { id: row.id } });
  res.json({ success: true });
});

export const decide = wrap("Erreur lors de la décision", async (req, res) => {
  const user = me(req);
  const row = await db.activityParticipation.findUnique({ where: { id: idParam(req, "pid") } });
  if (!row) return fail(res, 404, "Participation introuvable.");
  if (!(await canManage(user, row.userId))) return fail(res, 403, "Accès refusé.");

  const status = String(req.body?.status ?? "");
  if (!["ACCEPTED", "REJECTED"].includes(status)) return fail(res, 400, "Statut invalide.");

  const updated = await db.activityParticipation.update({
    where: { id: row.id },
    data: { status, decidedById: user.id, decidedAt: new Date() },
  });

  const activity = await getActivity(row.activityId);

  await notifyUsers(
    [row.userId],
    {
      title: status === "ACCEPTED" ? "Participation acceptée" : "Participation refusée",
      message: `Votre demande pour « ${activity?.title ?? "l'activité"} » a été ${status === "ACCEPTED" ? "acceptée" : "refusée"}.`,
      type: status === "ACCEPTED" ? "SUCCESS" : "WARNING",
    },
    user.id,
  );

  res.json({ success: true, data: publicParticipation(updated) });
});

/* ------------------------------------------------------------------ */
/* Rapport, preuve, présence                                             */
/* ------------------------------------------------------------------ */

async function ownAccepted(req: Request, res: Response) {
  const user = me(req);
  const activityId = idParam(req);

  const row = await db.activityParticipation.findUnique({ where: { activityId_userId: { activityId, userId: user.id } } });

  if (!row || row.status !== "ACCEPTED") {
    fail(res, 403, "Votre participation à cette activité n'est pas encore acceptée.");
    return null;
  }

  return row;
}

export const saveReport = wrap("Erreur lors de l'enregistrement du rapport", async (req, res) => {
  const row = await ownAccepted(req, res);
  if (!row) return;

  const report = String(req.body?.report ?? "").trim().slice(0, 8000);
  if (report.length < 10) return fail(res, 400, "Le rapport doit contenir au moins 10 caractères.");

  const updated = await db.activityParticipation.update({ where: { id: row.id }, data: { report, reportAt: new Date() } });

  const activity = await getActivity(row.activityId);
  const person = await db.user.findUnique({ where: { id: row.userId }, select: { firstName: true, lastName: true } });

  await notifyUsers(
    [...(await supervisorsOf(row.userId)), activity?.createdById],
    {
      title: "Rapport de participation",
      message: `${person?.firstName ?? ""} ${person?.lastName ?? ""} a rendu son rapport pour « ${activity?.title ?? "l'activité"} ».`,
      type: "INFO",
    },
    row.userId,
  );

  res.json({ success: true, data: publicParticipation(updated) });
});

export const saveProof = wrap("Erreur lors de l'envoi de la preuve", async (req, res) => {
  const row = await ownAccepted(req, res);
  if (!row) return;

  const name = String(req.body?.name ?? "preuve").slice(0, 150);
  const mime = String(req.body?.mime ?? "");
  const base64 = String(req.body?.data ?? "").replace(/^data:[^;]+;base64,/, "");

  if (!PROOF_TYPES.includes(mime)) return fail(res, 400, "Format accepté : PDF, PNG, JPEG ou WebP.");

  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) return fail(res, 400, "Fichier vide.");
  if (buffer.length > MAX_PROOF_BYTES) return fail(res, 413, "Fichier trop volumineux (5 Mo maximum).");

  const updated = await db.activityParticipation.update({
    where: { id: row.id },
    data: { proofName: name, proofMime: mime, proofSize: buffer.length, proofData: buffer },
  });

  res.json({ success: true, data: publicParticipation(updated) });
});

export const downloadProof = wrap("Erreur lors du téléchargement", async (req, res) => {
  const user = me(req);
  const row = await db.activityParticipation.findUnique({ where: { id: idParam(req, "pid") } });

  if (!row || !row.proofData) return fail(res, 404, "Aucune preuve.");
  if (row.userId !== user.id && !(await canManage(user, row.userId))) return fail(res, 403, "Accès refusé.");

  res.setHeader("Content-Type", row.proofMime ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(row.proofName ?? "preuve")}"`);
  res.send(Buffer.from(row.proofData));
});

/** Pointage de présence : seulement pendant les dates de l'activité (jour entier). */
export const checkIn = wrap("Erreur lors du pointage", async (req, res) => {
  const row = await ownAccepted(req, res);
  if (!row) return;
  if (row.checkedInAt) return res.json({ success: true, data: publicParticipation(row) });

  const activity = await getActivity(row.activityId);
  const now = Date.now();
  const start = activity?.startDate ? new Date(activity.startDate).setHours(0, 0, 0, 0) : null;
  const end = activity?.endDate ? new Date(activity.endDate).setHours(23, 59, 59, 999) : null;

  const open =
    start !== null || end !== null ? (start === null || now >= start) && (end === null || now <= end) : activity?.status === "IN_PROGRESS";

  if (!open) return fail(res, 400, "Le pointage n'est possible que pendant les dates de l'activité.");

  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  const hasPosition = Number.isFinite(latitude) && Number.isFinite(longitude);

  const updated = await db.activityParticipation.update({
    where: { id: row.id },
    data: {
      checkedInAt: new Date(),
      checkInLatitude: hasPosition ? latitude : null,
      checkInLongitude: hasPosition ? longitude : null,
    },
  });

  res.json({ success: true, data: publicParticipation(updated) });
});

/** Note du tuteur / coordinateur (0-100) : alimente l'ordre de mérite. */
export const rate = wrap("Erreur lors de la notation", async (req, res) => {
  const user = me(req);
  const row = await db.activityParticipation.findUnique({ where: { id: idParam(req, "pid") } });
  if (!row) return fail(res, 404, "Participation introuvable.");
  if (!(await canManage(user, row.userId))) return fail(res, 403, "Accès refusé.");
  if (row.status !== "ACCEPTED") return fail(res, 400, "Seule une participation acceptée peut être notée.");

  const rating = Number(req.body?.rating);
  if (!Number.isFinite(rating) || rating < 0 || rating > 100) return fail(res, 400, "La note doit être comprise entre 0 et 100.");

  const comment = String(req.body?.comment ?? "").trim().slice(0, 500) || null;
  const updated = await db.activityParticipation.update({
    where: { id: row.id },
    data: { rating: Math.round(rating), ratingComment: comment, ratedById: user.id, ratedAt: new Date() },
  });

  const activity = await getActivity(row.activityId);

  await notifyUsers(
    [row.userId],
    {
      title: "Votre participation a été notée",
      message: `« ${activity?.title ?? "Activité"} » : ${Math.round(rating)}/100${comment ? ` — ${comment}` : ""}.`,
      type: "INFO",
    },
    user.id,
  );

  res.json({ success: true, data: publicParticipation(updated) });
});

/* ------------------------------------------------------------------ */
/* Commentaires                                                          */
/* ------------------------------------------------------------------ */

export const addComment = wrap("Erreur lors de l'envoi du commentaire", async (req, res) => {
  const user = me(req);
  const activity = await getActivity(idParam(req));
  if (!activity) return fail(res, 404, "Activité introuvable.");

  const body = String(req.body?.body ?? "").trim().slice(0, 1000);
  if (!body) return fail(res, 400, "Le commentaire est vide.");

  const row = await db.activityComment.create({ data: { activityId: activity.id, userId: user.id, body } });
  const person = await db.user.findUnique({ where: { id: user.id }, select: { firstName: true, lastName: true } });

  await notifyUsers(
    [activity.createdById],
    {
      title: "Nouveau commentaire",
      message: `${person?.firstName ?? ""} ${person?.lastName ?? ""} sur « ${activity.title} » : ${body.slice(0, 120)}`,
      type: "INFO",
    },
    user.id,
  );

  res.status(201).json({ success: true, data: row });
});

export const deleteComment = wrap("Erreur lors de la suppression", async (req, res) => {
  const user = me(req);
  const row = await db.activityComment.findUnique({ where: { id: idParam(req, "cid") } });
  if (!row) return fail(res, 404, "Commentaire introuvable.");
  if (row.userId !== user.id && !MANAGERS.includes(user.role)) return fail(res, 403, "Accès refusé.");

  await db.activityComment.delete({ where: { id: row.id } });
  res.json({ success: true });
});

/* ------------------------------------------------------------------ */
/* Ordre de mérite                                                        */
/* ------------------------------------------------------------------ */

type Visible = { rows: Record<Level, MeritRow[]>; scope: "all" | "supervised" | "self" };

/** Qui voit quoi : encadrement = classement complet ; tuteur = ses stagiaires ; stagiaire = lui seul + tableau d'honneur. */
async function visibleRows(user: { id: number; role: string }, cohorts: Record<Level, MeritRow[]>): Promise<Visible | null> {
  if (MERIT_FULL.includes(user.role)) return { rows: cohorts, scope: "all" };

  if (isTutor(user.role)) {
    const ids = new Set(await supervisedInterns(user.id));
    return {
      scope: "supervised",
      rows: { L3: cohorts.L3.filter((r) => ids.has(r.userId)), M2: cohorts.M2.filter((r) => ids.has(r.userId)) },
    };
  }

  if (isIntern(user.role)) {
    const level = levelOf(user.role);
    const other: Level = level === "L3" ? "M2" : "L3";

    return {
      scope: "self",
      rows: { [level]: cohorts[level].filter((r) => r.userId === user.id), [other]: [] } as Record<Level, MeritRow[]>,
    };
  }

  return null;
}

const honorBoard = (cohort: MeritRow[]) =>
  cohort.slice(0, 3).map((row) => ({ rank: row.rank, name: row.name, score: row.score, badge: row.badge }));

export const getMerit = wrap("Erreur lors du calcul de l'ordre de mérite", async (req, res) => {
  const user = me(req);
  const result = await computeMerit(validPeriod(req.query.period));
  const visible = await visibleRows(user, result.cohorts);

  if (!visible) return fail(res, 403, "Accès refusé.");

  const strip = (rows: MeritRow[]) => rows.map(({ supervisorIds, ...row }) => { void supervisorIds; return row; });

  res.json({
    success: true,
    data: {
      period: result.period,
      scope: visible.scope,
      weights: result.weights,
      target: result.target,
      unranked: visible.scope === "all" ? result.unranked : undefined,
      generatedAt: result.generatedAt,
      cohorts: { L3: strip(visible.rows.L3), M2: strip(visible.rows.M2) },
      // le tableau d'honneur (3 premiers) est visible par tous, dans la promotion du stagiaire
      honor: isIntern(user.role)
        ? { [levelOf(user.role)]: honorBoard(result.cohorts[levelOf(user.role)]) }
        : { L3: honorBoard(result.cohorts.L3), M2: honorBoard(result.cohorts.M2) },
      cohortSizes: isIntern(user.role)
        ? { [levelOf(user.role)]: result.cohorts[levelOf(user.role)].length }
        : { L3: result.cohorts.L3.length, M2: result.cohorts.M2.length },
    },
  });
});

/** GET /merit/me — mon rang pour la période (bandeau de la liste des activités). */
export const getMyMerit = wrap("Erreur lors du calcul de votre rang", async (req, res) => {
  const user = me(req);
  if (!isIntern(user.role)) return res.json({ success: true, data: null });

  const result = await computeMerit(validPeriod(req.query.period));
  const row = result.cohorts[levelOf(user.role)].find((r) => r.userId === user.id) ?? null;

  res.json({
    success: true,
    data: row
      ? { period: result.period, rank: row.rank, cohortSize: row.cohortSize, score: row.score, badge: row.badge, level: row.level }
      : { period: result.period, rank: null, cohortSize: result.cohorts[levelOf(user.role)].length, score: null, badge: null, level: levelOf(user.role) },
  });
});

/** POST /merit/close — enregistre le classement de la période dans l'historique. */
export const closeMerit = wrap("Erreur lors de la clôture de la période", async (req, res) => {
  const user = me(req);
  if (!MERIT_FULL.includes(user.role)) return fail(res, 403, "Accès refusé.");

  const period = validPeriod(req.body?.period);
  const { saved } = await closePeriod(period, user.id);

  res.json({ success: true, data: { period, saved } });
});

/** GET /merit/history — périodes clôturées ; ?period=2025 → classement détaillé de cette période. */
export const getMeritHistory = wrap("Erreur lors de la lecture de l'historique", async (req, res) => {
  const user = me(req);

  // Stagiaire : son propre parcours, période par période
  if (isIntern(user.role)) {
    const rows = await db.meritSnapshot.findMany({ where: { userId: user.id }, orderBy: { period: "desc" } });

    return res.json({
      success: true,
      data: {
        scope: "self",
        periods: [],
        mine: rows.map((r: { period: string; rank: number; cohortSize: number; score: number; badge: string | null; level: string }) => ({
          period: r.period, rank: r.rank, cohortSize: r.cohortSize, score: r.score, badge: r.badge, level: r.level,
        })),
        cohorts: null,
      },
    });
  }

  if (!MERIT_FULL.includes(user.role) && !isTutor(user.role)) return fail(res, 403, "Accès refusé.");

  const allowed = isTutor(user.role) ? await supervisedInterns(user.id) : null;
  const where = allowed ? { userId: { in: allowed } } : {};

  const grouped = await db.meritSnapshot.groupBy({
    by: ["period"],
    where,
    _count: { _all: true },
    _max: { createdAt: true },
    orderBy: { period: "desc" },
  });

  const periods = grouped.map((g: { period: string; _count: { _all: number }; _max: { createdAt: Date } }) => ({
    period: g.period,
    count: g._count._all,
    closedAt: g._max.createdAt,
  }));

  const selected = req.query.period ? String(req.query.period) : periods[0]?.period;
  let cohorts: Record<Level, unknown[]> | null = null;

  if (selected) {
    const rows = await db.meritSnapshot.findMany({
      where: { period: selected, ...where },
      orderBy: [{ level: "asc" }, { rank: "asc" }],
    });
    const users = await db.user.findMany({
      where: { id: { in: rows.map((r: { userId: number }) => r.userId) } },
      select: { id: true, firstName: true, lastName: true },
    });
    const name = new Map<number, string>(users.map((u: { id: number; firstName: string; lastName: string }) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));

    const shape = (level: Level) =>
      rows
        .filter((r: { level: string }) => r.level === level)
        .map((r: { userId: number; rank: number; cohortSize: number; score: number; badge: string | null; details: { components?: unknown; counts?: unknown } | null }) => ({
          userId: r.userId,
          name: name.get(r.userId) ?? "—",
          rank: r.rank,
          cohortSize: r.cohortSize,
          score: r.score,
          badge: r.badge,
          components: r.details?.components ?? null,
          counts: r.details?.counts ?? null,
        }));

    cohorts = { L3: shape("L3"), M2: shape("M2") };
  }

  res.json({ success: true, data: { scope: allowed ? "supervised" : "all", periods, selected: selected ?? null, mine: [], cohorts } });
});
