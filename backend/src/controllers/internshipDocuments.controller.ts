import { Response } from "express";
import { z } from "zod";

import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendError } from "../middlewares/error.middleware";
import { db } from "../utils/db";
import {
  ALLOWED_DOC_MIME,
  INTERNSHIP_DOC_KINDS,
  MAX_DOC_BYTES,
  canReadDocs,
  canUploadDoc,
  cleanBase64,
  safeFileName,
} from "../utils/gapRules";

const intOrUndef = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

const uploadSchema = z.object({
  internshipId: z.number().int().positive(),
  kind: z.enum(INTERNSHIP_DOC_KINDS),
  name: z.string().min(1).max(200),
  mime: z.string().min(3).max(120),
  data: z.string().min(4),
  note: z.string().max(500).optional(),
});

async function loadInternship(id: number) {
  return db.internship.findUnique({
    where: { id },
    select: { id: true, studentId: true, supervisorId: true },
  }) as Promise<{ id: number; studentId: number; supervisorId: number | null } | null>;
}

/** Niveau affiché : niveau libre du stagiaire, sinon déduit de la durée prévue (L3 = 2 mois, M2 = 6 mois). */
function levelOf(durationMonths: number | null | undefined, studentLevel: string | null | undefined): string {
  if (studentLevel && studentLevel.trim()) return studentLevel.trim();
  if (durationMonths === 2) return "L3";
  if (durationMonths === 6) return "M2";
  return "";
}

/**
 * GET /api/internship-documents[?internshipId=]
 * Métadonnées uniquement (jamais le contenu). Sans internshipId : tous les documents que l'utilisateur a le droit de lire,
 * enrichis (propriétaire, thème, niveau, déposant) pour l'affichage en tableau filtrable.
 */
export async function listDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const internshipId = intOrUndef(req.query.internshipId);
    if (req.query.internshipId !== undefined && !internshipId) {
      return void res.status(400).json({ success: false, message: "internshipId invalide." });
    }
    const internships = (await db.internship.findMany({
      where: internshipId ? { id: internshipId } : {},
      select: {
        id: true,
        studentId: true,
        supervisorId: true,
        title: true,
        theme: true,
        durationMonths: true,
        student: { select: { firstName: true, lastName: true, studentLevel: true } },
      },
    })) as Array<{
      id: number;
      studentId: number;
      supervisorId: number | null;
      title: string;
      theme: string | null;
      durationMonths: number | null;
      student: { firstName: string; lastName: string; studentLevel: string | null } | null;
    }>;
    if (internshipId && internships.length === 0) {
      return void res.status(404).json({ success: false, message: "Stage introuvable." });
    }
    if (internshipId && !canReadDocs(req.user!.role, req.user!.id, internships[0])) {
      return void res.status(403).json({ success: false, message: "Accès refusé à ces documents." });
    }
    const readable = internships.filter((i) => canReadDocs(req.user!.role, req.user!.id, i));
    const byId = new Map(readable.map((i) => [i.id, i]));
    const rows: Array<{ id: number; internshipId: number; kind: string; name: string; mime: string; size: number; note: string | null; uploadedById: number | null; createdAt: Date }> = await db.internshipDocument.findMany({
      where: { internshipId: { in: readable.map((i) => i.id) } },
      select: { id: true, internshipId: true, kind: true, name: true, mime: true, size: true, note: true, uploadedById: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    const uploaderIds = [...new Set(rows.map((r) => r.uploadedById).filter((v): v is number => typeof v === "number"))];
    const uploaders: Array<{ id: number; firstName: string; lastName: string }> = uploaderIds.length
      ? await db.user.findMany({ where: { id: { in: uploaderIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const uploaderName = new Map(uploaders.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
    const data = rows.map((r) => {
      const i = byId.get(r.internshipId);
      return {
        ...r,
        ownerName: i?.student ? `${i.student.firstName} ${i.student.lastName}`.trim() : "",
        internshipTitle: i?.title ?? "",
        theme: i?.theme ?? i?.title ?? "",
        level: i ? levelOf(i.durationMonths, i.student?.studentLevel) : "",
        uploadedByName: r.uploadedById ? uploaderName.get(r.uploadedById) ?? "" : "",
      };
    });
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error, "Erreur lors de la lecture des documents de stage");
  }
}

/** POST /api/internship-documents — dépôt en base64 (même mécanisme que les preuves d'activité) */
export async function uploadDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const input = uploadSchema.parse(req.body);
    const internship = await loadInternship(input.internshipId);
    if (!internship) return void res.status(404).json({ success: false, message: "Stage introuvable." });
    if (!canUploadDoc(req.user!.role, req.user!.id, internship, input.kind)) {
      return void res.status(403).json({ success: false, message: "Vous ne pouvez pas déposer ce type de document." });
    }
    if (!ALLOWED_DOC_MIME.includes(input.mime)) {
      return void res.status(400).json({ success: false, message: "Format non accepté (PDF, Word, PNG ou JPEG)." });
    }
    const buffer = Buffer.from(cleanBase64(input.data), "base64");
    if (buffer.length === 0) return void res.status(400).json({ success: false, message: "Fichier vide ou illisible." });
    if (buffer.length > MAX_DOC_BYTES) {
      return void res.status(413).json({ success: false, message: "Fichier trop volumineux (8 Mo maximum)." });
    }
    const created = await db.internshipDocument.create({
      data: {
        internshipId: input.internshipId,
        kind: input.kind,
        name: safeFileName(input.name),
        mime: input.mime,
        size: buffer.length,
        data: buffer,
        note: input.note ?? null,
        uploadedById: req.user!.id,
      },
      select: { id: true, kind: true, name: true, mime: true, size: true, createdAt: true },
    });
    res.status(201).json({ success: true, message: "Document déposé.", data: created });
  } catch (error) {
    sendError(res, error, "Erreur lors du dépôt du document");
  }
}

/** GET /api/internship-documents/:id/download */
export async function downloadDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = intOrUndef(req.params.id);
    if (!id) return void res.status(400).json({ success: false, message: "Identifiant invalide." });
    const doc = await db.internshipDocument.findUnique({ where: { id } });
    if (!doc) return void res.status(404).json({ success: false, message: "Document introuvable." });
    const internship = await loadInternship(doc.internshipId);
    if (!internship || !canReadDocs(req.user!.role, req.user!.id, internship)) {
      return void res.status(403).json({ success: false, message: "Accès refusé à ce document." });
    }
    res.setHeader("Content-Type", doc.mime);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(doc.name)}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(Buffer.from(doc.data));
  } catch (error) {
    sendError(res, error, "Erreur lors du téléchargement du document");
  }
}

/** DELETE /api/internship-documents/:id — l'auteur du dépôt, ou ADMIN/RH */
export async function deleteDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = intOrUndef(req.params.id);
    if (!id) return void res.status(400).json({ success: false, message: "Identifiant invalide." });
    const doc = await db.internshipDocument.findUnique({ where: { id }, select: { id: true, uploadedById: true } });
    if (!doc) return void res.status(404).json({ success: false, message: "Document introuvable." });
    const role = req.user!.role.toUpperCase();
    if (doc.uploadedById !== req.user!.id && role !== "ADMIN" && role !== "RH") {
      return void res.status(403).json({ success: false, message: "Seul l'auteur du dépôt ou la RH peut supprimer." });
    }
    await db.internshipDocument.delete({ where: { id } });
    res.json({ success: true, message: "Document supprimé." });
  } catch (error) {
    sendError(res, error, "Erreur lors de la suppression du document");
  }
}
