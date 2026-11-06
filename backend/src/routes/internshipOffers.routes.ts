import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import { NextFunction, Request, Response, Router } from "express";

// ⚠️ Votre schema utilise le générateur "prisma-client" (output: ../generated/prisma).
// Importez donc depuis le client généré, PAS depuis "@prisma/client".
// Ajustez les chemins ci-dessous pour qu'ils correspondent à vos autres routes.
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma"; // la même instance que vos autres routes
import { authenticate } from "../middlewares/auth.middleware";
import { env } from "../config/env";
import { notifyRoles, notifyUsers } from "../utils/notify";

const router = Router();

/** Identifie l'utilisateur SI un token valide est fourni, sans jamais bloquer (candidature publique) */
function optionalUserId(req: Request): number | null {
  try {
    const header = req.headers.authorization;
    if (!header) return null;
    const [type, token] = header.trim().split(/\s+/);
    if (type !== "Bearer" || !token) return null;
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId?: number };
    const id = Number(decoded?.userId);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null; // token expiré / invalide : on traite comme un visiteur
  }
}

/* ---------- Rôles autorisés à gérer les offres ----------
 * ⚠️ Même liste que OFFER_MANAGER_ROLES dans frontend/src/lib/stages.ts
 * (valeurs de l'enum UserRole du schema Prisma). */
const OFFER_MANAGER_ROLES = ["ADMIN", "RH", "COORDINATOR"];

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = String((req as any).user?.role || "").toUpperCase();
  if (!OFFER_MANAGER_ROLES.includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Accès réservé à l'équipe de gestion des stages.",
    });
  }
  next();
}

function parseId(value: string | string[] | undefined) {
  const id = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Date valide ou null ; "invalid" si la chaîne n'est pas une date */
function parseDate(value: unknown): Date | null | "invalid" {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

function cleanOfferBody(body: any) {
  const places = body.places ? Number(body.places) : null;

  return {
    title: String(body.title || "").trim(),
    domain: body.domain ? String(body.domain).trim() : null,
    location: body.location ? String(body.location).trim() : null,
    duration: body.duration ? String(body.duration).trim() : null,
    deadline: parseDate(body.deadline),
    places: places !== null && Number.isFinite(places) && places > 0 ? Math.floor(places) : null,
    description: String(body.description || "").trim(),
  };
}

/** Valide le corps d'une offre ; renvoie un message d'erreur ou null */
function validateOffer(data: ReturnType<typeof cleanOfferBody>) {
  if (!data.title || !data.description) return "Le titre et la description sont obligatoires.";
  if (data.deadline === "invalid") return "La date limite est invalide.";
  return null;
}

/* ---------- Dossier joint + numéro de dossier ---------- */
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_FILES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

/** Vérifie la signature (magic bytes) pour ne pas se fier qu'à l'extension */
function matchesSignature(ext: string, buf: Buffer) {
  const starts = (...bytes: number[]) => bytes.every((b, i) => buf[i] === b);
  switch (ext) {
    case "pdf": return starts(0x25, 0x50, 0x44, 0x46);
    case "png": return starts(0x89, 0x50, 0x4e, 0x47);
    case "jpg":
    case "jpeg": return starts(0xff, 0xd8, 0xff);
    case "docx": return starts(0x50, 0x4b);
    case "doc": return starts(0xd0, 0xcf, 0x11, 0xe0);
    default: return false;
  }
}

const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 7 * 1024 * 1024; // 7 Mo au total

type ParsedFile = { name: string; mime: string; size: number; data: Buffer };

/** Lit et valide un fichier envoyé en base64 : { name, type, data } */
function parseOneFile(raw: any): { ok: true; file: ParsedFile } | { ok: false; message: string } {
  const name = String(raw?.name || "").trim().slice(0, 200);
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (!ALLOWED_FILES[ext]) {
    return { ok: false, message: `Format non accepté pour « ${name || "fichier"} » (PDF, Word, PNG ou JPG).` };
  }

  const base64 = String(raw?.data || "").replace(/^data:[^;]+;base64,/, "");
  const data = Buffer.from(base64, "base64");
  if (data.length === 0) return { ok: false, message: `Le fichier « ${name} » est vide.` };
  if (data.length > MAX_FILE_BYTES) {
    return { ok: false, message: `Le fichier « ${name} » dépasse 5 Mo.` };
  }
  if (!matchesSignature(ext, data)) {
    return { ok: false, message: `Le contenu de « ${name} » ne correspond pas à son format.` };
  }

  return { ok: true, file: { name, mime: ALLOWED_FILES[ext][0], size: data.length, data } };
}

/* ---------- Pièces du dossier (5 catégories, PDF uniquement) ---------- */
const DOC_CATEGORIES: Record<string, string> = {
  cv: "CV",
  lettre: "Lettre de motivation",
  diplomes: "Diplômes et attestations",
  releves: "Relevés de notes",
  certificats: "Certificats et recommandations",
};
const REQUIRED_CATEGORIES = ["cv", "lettre"];

/**
 * Accepte `files: [...]` (nouveau) ou `file: {...}` (ancien format).
 * Si les fichiers portent une `category` (formulaire à 5 pièces) : PDF uniquement, une pièce par
 * catégorie, CV et lettre de motivation obligatoires. Le nom enregistré commence par la catégorie.
 */
function parseUploadedFiles(body: any): { ok: true; files: ParsedFile[] } | { ok: false; message: string } {
  const rawList: any[] = Array.isArray(body?.files) ? body.files : body?.file ? [body.file] : [];
  if (rawList.length > MAX_FILES) {
    return { ok: false, message: `Maximum ${MAX_FILES} fichiers par candidature.` };
  }

  const categorized = rawList.some((raw) => raw && raw.category);
  const seen = new Set<string>();

  const files: ParsedFile[] = [];
  let total = 0;
  for (const raw of rawList) {
    let label = "";

    if (categorized) {
      const category = String(raw?.category || "");
      if (!DOC_CATEGORIES[category]) {
        return { ok: false, message: "Catégorie de document invalide." };
      }
      if (seen.has(category)) {
        return { ok: false, message: `Un seul fichier est accepté pour « ${DOC_CATEGORIES[category]} ».` };
      }
      seen.add(category);
      label = DOC_CATEGORIES[category];

      const name = String(raw?.name || "").trim();
      if (!name.toLowerCase().endsWith(".pdf")) {
        return { ok: false, message: `« ${label} » : seul le format PDF est accepté.` };
      }
    }

    const parsed = parseOneFile(raw);
    if (!parsed.ok) return parsed;
    if (label) parsed.file.name = `${label} - ${parsed.file.name}`.slice(0, 200);
    total += parsed.file.size;
    files.push(parsed.file);
  }

  if (categorized) {
    for (const required of REQUIRED_CATEGORIES) {
      if (!seen.has(required)) {
        return { ok: false, message: `Le document « ${DOC_CATEGORIES[required]} » est obligatoire.` };
      }
    }
  }

  if (total > MAX_TOTAL_BYTES) {
    return { ok: false, message: "Les fichiers dépassent 7 Mo au total." };
  }
  return { ok: true, files };
}

/** Numéro de dossier : 4 blocs de 8 caractères (base 36) = 32 caractères, ex. sfpispvk-cs55qs3x-k29dh1ab-p0x7q2mz */
function generateDossierNumber() {
  const block = () => {
    let n = BigInt("0x" + randomBytes(6).toString("hex")); // 48 bits aléatoires
    let out = n.toString(36);
    while (out.length < 8) out = "0" + out;
    return out.slice(-8);
  };
  return `${block()}-${block()}-${block()}-${block()}`;
}

/** Champs renvoyés pour une candidature (SANS le contenu binaire du fichier) */
const APPLICATION_SELECT = {
  id: true,
  offerId: true,
  userId: true,
  applicantName: true,
  applicantEmail: true,
  phone: true,
  school: true,
  level: true,
  motivation: true,
  status: true,
  createdAt: true,
  dossierNumber: true,
  fileName: true,
  fileMime: true,
  fileSize: true,
  files: { select: { id: true, fileName: true, fileMime: true, fileSize: true }, orderBy: { id: "asc" as const } },
} as const;

/* =========================================================
   PUBLIC : liste des stages disponibles
   GET /api/internship-offers
========================================================= */
router.get("/", async (_req, res) => {
  try {
    const offers = await prisma.internshipOffer.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: offers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

/* =========================================================
   PUBLIC : détail d'un stage
   GET /api/internship-offers/:id
========================================================= */
router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Identifiant invalide." });

  try {
    const offer = await prisma.internshipOffer.findFirst({ where: { id, isActive: true } });
    if (!offer) return res.status(404).json({ success: false, message: "Stage introuvable." });
    res.json({ success: true, data: offer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

/* =========================================================
   GESTION : publier une nouvelle offre
   POST /api/internship-offers          (ADMIN, RH, COORDINATOR)
========================================================= */
router.post("/", authenticate, requireAdmin, async (req, res) => {
  const data = cleanOfferBody(req.body);
  const problem = validateOffer(data);
  if (problem) return res.status(400).json({ success: false, message: problem });

  try {
    const offer = await prisma.internshipOffer.create({
      data: {
        ...data,
        deadline: data.deadline as Date | null,
        createdById: Number((req as any).user?.id) || null,
      },
    });
    res.status(201).json({ success: true, data: offer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Impossible d'ajouter ce stage." });
  }
});

/* =========================================================
   GESTION : modifier une offre
   PATCH /api/internship-offers/:id     (ADMIN, RH, COORDINATOR)
========================================================= */
router.patch("/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Identifiant invalide." });

  const data = cleanOfferBody(req.body);
  const problem = validateOffer(data);
  if (problem) return res.status(400).json({ success: false, message: problem });

  try {
    const offer = await prisma.internshipOffer.update({
      where: { id },
      data: { ...data, deadline: data.deadline as Date | null },
    });
    res.json({ success: true, data: offer });
  } catch (error) {
    if ((error as Prisma.PrismaClientKnownRequestError).code === "P2025") {
      return res.status(404).json({ success: false, message: "Stage introuvable." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

/* =========================================================
   GESTION : retirer une offre (masquée, pas supprimée)
   DELETE /api/internship-offers/:id    (ADMIN, RH, COORDINATOR)
========================================================= */
router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Identifiant invalide." });

  try {
    await prisma.internshipOffer.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: "Stage retiré." });
  } catch (error) {
    if ((error as Prisma.PrismaClientKnownRequestError).code === "P2025") {
      return res.status(404).json({ success: false, message: "Stage introuvable." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

/* =========================================================
   PUBLIC : postuler (aucun compte requis)
   POST /api/internship-offers/:id/applications
   body : { fullName, email, phone, school?, level?, motivation,
            files: [{ name, type, data(base64) }] }
========================================================= */
router.post("/:id/applications", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Identifiant invalide." });

  const userId = optionalUserId(req); // lié au compte si le candidat est connecté
  const fullName = String(req.body.fullName || req.body.applicantName || "").trim().slice(0, 150);
  const email = String(req.body.email || req.body.applicantEmail || "").trim().toLowerCase();
  const phone = req.body.phone ? String(req.body.phone).trim() : "";
  const motivation = String(req.body.motivation || "").trim();

  if (!fullName) {
    return res.status(400).json({ success: false, message: "Votre nom complet est obligatoire." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Une adresse e-mail valide est obligatoire." });
  }
  if (!phone) {
    return res.status(400).json({ success: false, message: "Votre numéro de téléphone est obligatoire." });
  }
  if (!motivation) {
    return res.status(400).json({ success: false, message: "La lettre de motivation est obligatoire." });
  }

  try {
    const offer = await prisma.internshipOffer.findFirst({ where: { id, isActive: true } });
    if (!offer) return res.status(404).json({ success: false, message: "Stage introuvable." });

    if (offer.deadline) {
      const end = new Date(offer.deadline);
      end.setHours(23, 59, 59, 999);
      if (end.getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: "Les candidatures pour ce stage sont fermées." });
      }
    }

    const parsed = parseUploadedFiles(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ success: false, message: parsed.message });
    }
    const files = parsed.files;
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: "Veuillez joindre votre dossier (au moins un fichier)." });
    }

    // Doublon : même e-mail (ou même compte) déjà inscrit sur ce stage
    const duplicate = await prisma.internshipApplication.findFirst({
      where: {
        offerId: id,
        OR: [{ applicantEmail: email }, ...(userId ? [{ userId }] : [])],
      },
      select: { id: true },
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: "Vous avez déjà postulé à ce stage avec cette adresse e-mail." });
    }

    let application: any = null;
    for (let attempt = 0; attempt < 3 && !application; attempt++) {
      try {
        application = await prisma.internshipApplication.create({
          data: {
            offerId: id,
            userId,
            applicantName: fullName,
            applicantEmail: email,
            phone,
            school: req.body.school ? String(req.body.school).trim() : null,
            level: req.body.level ? String(req.body.level).trim() : null,
            motivation,
            dossierNumber: generateDossierNumber(),
            files: {
              create: files.map((f) => ({
                fileName: f.name,
                fileMime: f.mime,
                fileSize: f.size,
                fileData: f.data as any,
              })),
            },
          },
          select: APPLICATION_SELECT,
        });
      } catch (err) {
        const e = err as Prisma.PrismaClientKnownRequestError;
        const target = JSON.stringify((e as any).meta?.target ?? "");
        // collision rarissime sur le numéro de dossier : on retente
        if (e.code === "P2002" && target.includes("dossierNumber") && attempt < 2) continue;
        throw err;
      }
    }

    // Notifications (cloche + système Windows / téléphone) : n'empêchent jamais la candidature
    // Équipe de gestion des stages (mêmes rôles que OFFER_MANAGER_ROLES)
    void notifyRoles(OFFER_MANAGER_ROLES, {
      title: "Nouvelle candidature",
      message: `${fullName} a postulé au stage « ${offer.title} » (dossier ${application.dossierNumber}).`,
      type: "INFO",
      channels: "app",
    });

    // Accusé de réception pour le candidat s'il est connecté
    if (userId) {
      void notifyUsers([userId], {
        title: "Candidature envoyée",
        message: `Votre candidature au stage « ${offer.title} » a bien été reçue (dossier ${application.dossierNumber}).`,
        type: "SUCCESS",
        channels: "app",
      });
    }

    res.status(201).json({ success: true, data: application });
  } catch (error) {
    if ((error as Prisma.PrismaClientKnownRequestError).code === "P2002") {
      return res.status(409).json({ success: false, message: "Vous avez déjà postulé à ce stage avec cette adresse e-mail." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Impossible d'envoyer votre candidature." });
  }
});

/* =========================================================
   GESTION : candidatures d'une offre (avec infos du candidat)
   GET /api/internship-offers/:id/applications   (ADMIN, RH, COORDINATOR)
========================================================= */
router.get("/:id/applications", authenticate, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Identifiant invalide." });

  try {
    const applications = await prisma.internshipApplication.findMany({
      where: { offerId: id },
      orderBy: { createdAt: "desc" },
      select: {
        ...APPLICATION_SELECT,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    res.json({ success: true, data: applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

/* =========================================================
   GESTION : retrouver une candidature par son numéro de dossier
   (utilisé par les notifications)
   GET /api/internship-offers/applications/lookup?dossier=xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx
========================================================= */
router.get("/applications/lookup", authenticate, requireAdmin, async (req, res) => {
  const dossier = String(req.query.dossier || "").trim().toLowerCase();
  // 4 blocs (32 caractères) ; les anciens numéros à 3 blocs restent acceptés
  if (!/^[a-z0-9]{8}(?:-[a-z0-9]{8}){2,3}$/.test(dossier)) {
    return res.status(400).json({ success: false, message: "Numéro de dossier invalide." });
  }

  try {
    const application = await prisma.internshipApplication.findUnique({
      where: { dossierNumber: dossier },
      select: {
        ...APPLICATION_SELECT,
        offer: { select: { id: true, title: true } },
      },
    });
    if (!application) {
      return res.status(404).json({ success: false, message: "Candidature introuvable." });
    }
    res.json({ success: true, data: application });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

/* =========================================================
   GESTION : télécharger un fichier du dossier d'une candidature
   GET /api/internship-offers/applications/:applicationId/file?fileId=
   (sans fileId : premier fichier ; ancien format géré aussi)
========================================================= */
router.get("/applications/:applicationId/file", authenticate, requireAdmin, async (req, res) => {
  const applicationId = parseId(req.params.applicationId);
  if (!applicationId) return res.status(400).json({ success: false, message: "Identifiant invalide." });
  const fileId = parseId(req.query.fileId as string | undefined);

  try {
    let name: string | null = null;
    let mime: string | null = null;
    let data: any = null;

    const stored = await prisma.internshipApplicationFile.findFirst({
      where: { applicationId, ...(fileId ? { id: fileId } : {}) },
      orderBy: { id: "asc" },
    });

    if (stored) {
      name = stored.fileName;
      mime = stored.fileMime;
      data = stored.fileData;
    } else if (!fileId) {
      const legacy = await prisma.internshipApplication.findUnique({
        where: { id: applicationId },
        select: { fileName: true, fileMime: true, fileData: true },
      });
      if (legacy?.fileData) {
        name = legacy.fileName;
        mime = legacy.fileMime;
        data = legacy.fileData;
      }
    }

    if (!data) {
      return res.status(404).json({ success: false, message: "Aucun dossier joint." });
    }

    const safeName = (name || "dossier").replace(/[^\w.\- ]+/g, "_");
    res.setHeader("Content-Type", mime || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(Buffer.from(data));
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

/* =========================================================
   GESTION : accepter / refuser une candidature
   PATCH /api/internship-offers/applications/:applicationId
   body : { status: "PENDING" | "ACCEPTED" | "REJECTED" }
========================================================= */
router.patch("/applications/:applicationId", authenticate, requireAdmin, async (req, res) => {
  const applicationId = parseId(req.params.applicationId);
  if (!applicationId) return res.status(400).json({ success: false, message: "Identifiant invalide." });

  const status = String(req.body.status || "").toUpperCase();
  if (!["PENDING", "ACCEPTED", "REJECTED"].includes(status)) {
    return res.status(400).json({ success: false, message: "Statut invalide." });
  }

  try {
    const application = await prisma.internshipApplication.update({
      where: { id: applicationId },
      data: { status: status as any },
      select: APPLICATION_SELECT,
    });
    res.json({ success: true, data: application });
  } catch (error) {
    if ((error as Prisma.PrismaClientKnownRequestError).code === "P2025") {
      return res.status(404).json({ success: false, message: "Candidature introuvable." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

export default router;