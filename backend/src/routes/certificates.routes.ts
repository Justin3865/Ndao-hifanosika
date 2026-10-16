import { Request, Response, Router } from "express";
import QRCode from "qrcode";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { getReqUser } from "../utils/dataScope";
import {
  buildCertificateCode,
  isCompletedStatus,
  parseCertificateCode,
} from "../services/certificate.service";

export const certificatesRouter = Router();
export const publicCertificatesRouter = Router();

const include = {
  project: { select: { id: true, name: true } },
  student: { select: { id: true, firstName: true, lastName: true } },
  supervisor: { select: { id: true, firstName: true, lastName: true } },
} as const;

const toPayload = (row: any) => ({
  internshipId: row.id,
  internName: `${row.student?.firstName ?? ""} ${row.student?.lastName ?? ""}`.trim(),
  title: row.title,
  project: row.project?.name ?? row.title,
  supervisor: row.supervisor ? `${row.supervisor.firstName} ${row.supervisor.lastName}` : null,
  startDate: row.startDate,
  endDate: row.endDate,
});

/** GET /api/certificates/internship/:id — données + code + QR (PNG base64). */
certificatesRouter.get(
  "/internship/:id",
  authenticate,
  authorizeRoles("ADMIN", "DIRECTION", "COORDINATOR", "STAGIAIRE_L3", "STAGIAIRE_M2"),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: "Identifiant invalide." });
      const row: any = await prisma.internship.findUnique({ where: { id }, include });
      if (!row) return res.status(404).json({ success: false, message: "Stage introuvable." });

      const user = getReqUser(req);
      const isStaff = user && ["ADMIN", "DIRECTION", "COORDINATOR"].includes(user.role);
      if (!isStaff && row.studentId !== user?.id) {
        return res.status(403).json({ success: false, message: "Accès refusé." });
      }
      if (!isCompletedStatus(row.status)) {
        return res.status(409).json({ success: false, message: "Le certificat n'est disponible qu'une fois le stage terminé." });
      }

      const code = buildCertificateCode(row.id);
      const verifyUrl = `${env.FRONTEND_URL.replace(/\/$/, "")}/verification/${code}`;
      const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 280, errorCorrectionLevel: "M" });
      return res.json({ success: true, data: { ...toPayload(row), code, verifyUrl, qr } });
    } catch (error) {
      logger.error("Erreur génération certificat", error);
      return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
    }
  },
);

/** GET /api/public/certificates/:code — vérification publique (scan du QR). */
publicCertificatesRouter.get("/:code", async (req: Request, res: Response) => {
  try {
    const id = parseCertificateCode(req.params.code);
    if (!id) return res.status(404).json({ success: false, valid: false, message: "Certificat non reconnu." });
    const row: any = await prisma.internship.findUnique({ where: { id }, include });
    if (!row || !isCompletedStatus(row.status)) {
      return res.status(404).json({ success: false, valid: false, message: "Certificat non reconnu." });
    }
    const { internName, project, startDate, endDate } = toPayload(row);
    return res.json({ success: true, valid: true, data: { code: req.params.code.toUpperCase(), internName, project, startDate, endDate } });
  } catch (error) {
    logger.error("Erreur vérification certificat", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
});
