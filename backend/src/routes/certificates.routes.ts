import { Request, Response, Router } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { db } from "../utils/db";
import { getReqUser } from "../utils/dataScope";
import { sendEmail } from "../utils/mailer";
import { notifyUsers } from "../utils/notify";

/* Certificats vérifiables : code unique + QR code pointant vers /verification/<code>. */

const router = Router();
export const publicCertificateRouter = Router();

const TYPES = ["INTERNSHIP", "VOLUNTEER", "STAFF", "TRAINING"];
const ISSUERS = ["ADMIN", "DIRECTION", "RH"] as const;
// Numéro automatique : NH-<année>-<catégorie>-<n° d'ordre>, ex. NH-2026-STG-0001
// Chaque catégorie a sa propre numérotation, remise à 1 chaque année.
const CATEGORY_CODE: Record<string, string> = {
  INTERNSHIP: "STG", // stage
  VOLUNTEER: "BEN", // bénévolat
  STAFF: "TRV", // certificat de travail
  TRAINING: "FOR", // formation
};

/** Prochain numéro libre pour (catégorie, année) : plus grand numéro existant + 1. */
async function nextCode(type: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `NH-${year}-${CATEGORY_CODE[type] ?? "GEN"}-`;

  const rows: Array<{ code: string }> = await db.certificate.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });

  const max = rows.reduce((m, r) => Math.max(m, Number(r.code.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

router.use(authenticate);

/** ADMIN/DIRECTION/RH : tous. Autres : uniquement leurs propres certificats. */
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = getReqUser(req);
    const all = user && (ISSUERS as readonly string[]).includes(user.role);

    const rows = await db.certificate.findMany({
      where: all ? {} : { userId: user?.id ?? -1 },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error("Erreur liste certificats", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const user = getReqUser(req);
    const row = await db.certificate.findUnique({ where: { id: Number(req.params.id) } });
    const all = user && (ISSUERS as readonly string[]).includes(user.role);

    if (!row || (!all && row.userId !== user?.id)) {
      return res.status(404).json({ success: false, message: "Certificat introuvable" });
    }

    res.json({ success: true, data: row });
  } catch (error) {
    logger.error("Erreur lecture certificat", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

router.post("/", authorizeRoles(...ISSUERS), async (req: Request, res: Response) => {
  try {
    const body: Json = req.body ?? {};
    const type = String(body.type ?? "");

    if (!TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "Type de certificat invalide" });
    }

    let holderName = String(body.holderName ?? "").trim();
    let holderEmail: string | null = body.holderEmail ? String(body.holderEmail).trim() : null;
    let userId: number | null = body.userId ? Number(body.userId) : null;
    let title = String(body.title ?? "").trim();
    let startDate: Date | null = body.startDate ? new Date(body.startDate) : null;
    let endDate: Date | null = body.endDate ? new Date(body.endDate) : null;
    let expiresAt: Date | null = body.expiresAt ? new Date(body.expiresAt) : null;
    const internshipId = body.internshipId ? Number(body.internshipId) : null;

    const invalid = (d: Date | null) => d !== null && Number.isNaN(d.getTime());

    if (invalid(startDate) || invalid(endDate) || invalid(expiresAt)) {
      return res.status(400).json({ success: false, message: "Date invalide" });
    }

    if (body.internshipId && (!Number.isInteger(internshipId) || (internshipId as number) <= 0)) {
      return res.status(400).json({ success: false, message: "Stage invalide" });
    }

    if (holderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(holderEmail)) {
      return res.status(400).json({ success: false, message: "Adresse e-mail invalide" });
    }

    // Certificat de stage : informations lues dans le stage (qui doit être TERMINÉ)
    if (type === "INTERNSHIP") {
      if (!internshipId) return res.status(400).json({ success: false, message: "Stage obligatoire" });

      const internship = await prisma.internship.findUnique({
        where: { id: internshipId },
        include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } },
      });

      if (!internship) return res.status(404).json({ success: false, message: "Stage introuvable" });

      if (internship.status !== "COMPLETED") {
        return res.status(400).json({ success: false, message: "Le stage doit être terminé pour délivrer un certificat" });
      }

      if (await db.certificate.findFirst({ where: { internshipId, revokedAt: null } })) {
        return res.status(409).json({ success: false, message: "Un certificat existe déjà pour ce stage" });
      }

      holderName = `${internship.student.firstName} ${internship.student.lastName}`;
      holderEmail = internship.student.email;
      userId = internship.student.id;
      title = title || internship.title;
      startDate = internship.startDate ?? startDate;
      endDate = internship.endDate ?? endDate;
    }

    if (!holderName || !title) {
      return res.status(400).json({ success: false, message: "Nom du titulaire et intitulé obligatoires" });
    }

    if (startDate && endDate && endDate < startDate) {
      return res.status(400).json({ success: false, message: "La date de fin précède la date de début" });
    }

    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: "La date d'expiration doit être dans le futur" });
    }

    // Deux émissions simultanées peuvent viser le même numéro : la contrainte d'unicité
    // refuse la seconde (P2002) et on recalcule le numéro suivant.
    let row: Awaited<ReturnType<typeof db.certificate.create>> | null = null;

    for (let attempt = 0; attempt < 5 && !row; attempt++) {
      try {
        row = await db.certificate.create({
          data: {
            code: await nextCode(type),
            type,
            holderName,
            holderEmail,
            title,
            description: body.description ? String(body.description) : null,
            startDate,
            endDate,
            expiresAt,
            internshipId,
            userId,
            issuedById: getReqUser(req)?.id ?? null,
          },
        });
      } catch (error) {
        if ((error as { code?: string }).code !== "P2002") throw error;
      }
    }

    if (!row) {
      return res.status(503).json({ success: false, message: "Numérotation indisponible, réessayez." });
    }

    // Prévenir le titulaire (notification + e-mail avec lien de vérification)
    const base = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

    if (userId) {
      await notifyUsers([userId], {
        title: "Certificat délivré",
        message: `Votre certificat « ${title} » est disponible (code ${row.code}).`,
        type: "SUCCESS",
      });
    } else if (holderEmail) {
      await sendEmail(
        holderEmail,
        "Votre certificat — Ndao Hifanosika",
        `Bonjour ${holderName},\n\nVotre certificat « ${title} » a été délivré. Code : ${row.code}\nVérification : ${base}/verification/${row.code}\n\n— Ndao Hifanosika`,
      );
    }

    res.status(201).json({ success: true, data: row });
  } catch (error) {
    logger.error("Erreur délivrance certificat", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

/** Révocation (le certificat reste visible comme « révoqué » à la vérification). */
router.delete("/:id", authorizeRoles("ADMIN", "DIRECTION"), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = Number.isInteger(id) ? await db.certificate.findUnique({ where: { id } }) : null;

    if (!existing) return res.status(404).json({ success: false, message: "Certificat introuvable" });

    // Idempotent : une seconde révocation conserve la date d'origine
    if (!existing.revokedAt) await db.certificate.update({ where: { id }, data: { revokedAt: new Date() } });

    res.json({ success: true });
  } catch (error) {
    logger.error("Erreur révocation certificat", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

/* ---------------- Vérification publique (scan du QR code) ---------------- */

publicCertificateRouter.get("/:code", async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code).toUpperCase();

    if (!/^NH-\d{4}-(?:[A-Z]{3}-\d{4,}|[A-Z0-9]{8})$/.test(code)) {
      return res.status(404).json({ success: false, status: "NOT_FOUND" });
    }

    const row = await db.certificate.findUnique({ where: { code } });

    if (!row) return res.status(404).json({ success: false, status: "NOT_FOUND" });

    res.json({
      success: true,
      status: row.revokedAt ? "REVOKED" : row.expiresAt && row.expiresAt.getTime() <= Date.now() ? "EXPIRED" : "VALID",
      data: {
        code: row.code,
        type: row.type,
        holderName: row.holderName,
        title: row.title,
        startDate: row.startDate,
        endDate: row.endDate,
        expiresAt: row.expiresAt,
        issuedAt: row.createdAt,
      },
    });
  } catch (error) {
    logger.error("Erreur vérification certificat", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

export default router;
