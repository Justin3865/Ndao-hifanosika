import crypto from "crypto";
import { Request, Response, Router } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { db } from "../utils/db";
import { getReqUser } from "../utils/dataScope";
import { sendEmail } from "../utils/mailer";
import { notifyUsers } from "../utils/notify";

import { sendError } from "../middlewares/error.middleware";
/* Certificats vérifiables : code unique + QR code pointant vers /verify/<code>. */

const router = Router();
export const publicCertificateRouter = Router();

const TYPES = ["INTERNSHIP", "VOLUNTEER", "STAFF", "TRAINING"];
const ISSUERS = ["ADMIN", "DIRECTION", "RH"] as const;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caractères ambigus

async function newCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const bytes = crypto.randomBytes(8);
    const suffix = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
    const code = `NH-${new Date().getFullYear()}-${suffix}`;

    if (!(await db.certificate.findUnique({ where: { code } }))) return code;
  }

  throw new Error("Impossible de générer un code unique");
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
    sendError(res, error, "Erreur serveur");
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
    sendError(res, error, "Erreur serveur");
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
    const internshipId = body.internshipId ? Number(body.internshipId) : null;

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

    const row = await db.certificate.create({
      data: {
        code: await newCode(),
        type,
        holderName,
        holderEmail,
        title,
        description: body.description ? String(body.description) : null,
        startDate,
        endDate,
        internshipId,
        userId,
        issuedById: getReqUser(req)?.id ?? null,
      },
    });

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
        `Bonjour ${holderName},\n\nVotre certificat « ${title} » a été délivré. Code : ${row.code}\nVérification : ${base}/verify/${row.code}\n\n— Ndao Hifanosika`,
      );
    }

    res.status(201).json({ success: true, data: row });
  } catch (error) {
    logger.error("Erreur délivrance certificat", error);
    sendError(res, error, "Erreur serveur");
  }
});

/** Révocation (le certificat reste visible comme « révoqué » à la vérification). */
router.delete("/:id", authorizeRoles("ADMIN", "DIRECTION"), async (req: Request, res: Response) => {
  try {
    await db.certificate.update({ where: { id: Number(req.params.id) }, data: { revokedAt: new Date() } });
    res.json({ success: true });
  } catch {
    res.status(404).json({ success: false, message: "Certificat introuvable" });
  }
});

/* ---------------- Vérification publique (scan du QR code) ---------------- */

publicCertificateRouter.get("/:code", async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code).toUpperCase();

    if (!/^NH-\d{4}-[A-Z0-9]{8}$/.test(code)) {
      return res.status(404).json({ success: false, status: "NOT_FOUND" });
    }

    const row = await db.certificate.findUnique({ where: { code } });

    if (!row) return res.status(404).json({ success: false, status: "NOT_FOUND" });

    res.json({
      success: true,
      status: row.revokedAt ? "REVOKED" : "VALID",
      data: {
        code: row.code,
        type: row.type,
        holderName: row.holderName,
        title: row.title,
        startDate: row.startDate,
        endDate: row.endDate,
        issuedAt: row.createdAt,
      },
    });
  } catch (error) {
    logger.error("Erreur vérification certificat", error);
    sendError(res, error, "Erreur serveur");
  }
});

export default router;
