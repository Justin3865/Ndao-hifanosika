import { Response } from "express";
import { z } from "zod";

import { ScopedRequest } from "../middlewares/coordinatorScope.middleware";
import { sendError } from "../middlewares/error.middleware";
import { consentState, isMinor } from "../utils/gapRules";
import { db } from "../utils/db";
import { filterByProject } from "../utils/projectScopeRules";

const intOrUndef = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

const consentSchema = z.object({
  guardianName: z.string().trim().min(2).max(150),
  guardianRelation: z.string().trim().max(60).optional().nullable(),
  guardianContact: z.string().trim().max(60).optional().nullable(),
  scope: z.string().trim().max(300).optional().nullable(),
  consentAt: z.coerce.date().optional(),
});

/** GET /api/consents?projectId=&state= — mineurs et état de consentement (MISSING | GRANTED | REVOKED) */
export async function listConsents(req: ScopedRequest, res: Response): Promise<void> {
  try {
    const projectId = intOrUndef(req.query.projectId);
    const stateFilter = typeof req.query.state === "string" ? req.query.state.toUpperCase() : undefined;
    const beneficiaries: Array<{ id: number; firstName: string; lastName: string; age: number | null; birthDate: Date | null; projectId: number; project: { name: string } | null }> =
      await db.beneficiary.findMany({
        where: projectId ? { projectId } : {},
        select: { id: true, firstName: true, lastName: true, age: true, birthDate: true, projectId: true, project: { select: { name: true } } },
        orderBy: { id: "asc" },
        take: 3000,
      });
    const consents: Array<{ beneficiaryId: number; guardianName: string; guardianRelation: string | null; consentAt: Date; revokedAt: Date | null }> =
      await db.beneficiaryConsent.findMany({ where: { beneficiaryId: { in: beneficiaries.map((b) => b.id) } } });
    const byId = new Map(consents.map((c) => [c.beneficiaryId, c]));
    const merged = beneficiaries
      .map((b) => {
        const c = byId.get(b.id);
        return {
          id: b.id,
          firstName: b.firstName,
          lastName: b.lastName,
          age: b.age,
          projectId: b.projectId,
          project: b.project,
          minor: isMinor(b),
          state: consentState(b, c),
          guardianName: c?.guardianName ?? null,
          guardianRelation: c?.guardianRelation ?? null,
          consentAt: c?.consentAt ?? null,
          revokedAt: c?.revokedAt ?? null,
        };
      })
      // On ne liste que les mineurs et toute personne ayant déjà un consentement enregistré.
      .filter((r) => r.minor || r.state === "GRANTED" || r.state === "REVOKED")
      .filter((r) => (stateFilter ? r.state === stateFilter : true));
    const scope = req.projectScope ?? { scoped: false, allowed: [] };
    const data = filterByProject(scope, merged, (r) => r.projectId);
    res.json({
      success: true,
      data,
      summary: {
        minors: data.filter((r) => r.minor).length,
        missing: data.filter((r) => r.state === "MISSING").length,
        granted: data.filter((r) => r.state === "GRANTED").length,
        revoked: data.filter((r) => r.state === "REVOKED").length,
      },
    });
  } catch (error) {
    sendError(res, error, "Erreur lors de la lecture des consentements");
  }
}

/** PUT /api/consents/beneficiary/:id — enregistre (ou renouvelle) le consentement du tuteur légal */
export async function putConsent(req: ScopedRequest, res: Response): Promise<void> {
  try {
    const id = intOrUndef(req.params.id);
    if (!id) return void res.status(400).json({ success: false, message: "Identifiant invalide." });
    const input = consentSchema.parse(req.body);
    const exists = await db.beneficiary.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return void res.status(404).json({ success: false, message: "Bénéficiaire introuvable." });
    const data = {
      guardianName: input.guardianName,
      guardianRelation: input.guardianRelation ?? null,
      guardianContact: input.guardianContact ?? null,
      scope: input.scope ?? null,
      consentAt: input.consentAt ?? new Date(),
      revokedAt: null,
      recordedById: req.user!.id,
    };
    const saved = await db.beneficiaryConsent.upsert({
      where: { beneficiaryId: id },
      create: { beneficiaryId: id, ...data },
      update: data,
    });
    res.json({ success: true, message: "Consentement enregistré.", data: saved });
  } catch (error) {
    sendError(res, error, "Erreur lors de l'enregistrement du consentement");
  }
}

/** DELETE /api/consents/beneficiary/:id — retrait du consentement (conservé, daté, jamais effacé) */
export async function revokeConsent(req: ScopedRequest, res: Response): Promise<void> {
  try {
    const id = intOrUndef(req.params.id);
    if (!id) return void res.status(400).json({ success: false, message: "Identifiant invalide." });
    const existing = await db.beneficiaryConsent.findUnique({ where: { beneficiaryId: id } });
    if (!existing) return void res.status(404).json({ success: false, message: "Aucun consentement enregistré." });
    const saved = await db.beneficiaryConsent.update({
      where: { beneficiaryId: id },
      data: { revokedAt: new Date(), recordedById: req.user!.id },
    });
    res.json({ success: true, message: "Consentement retiré.", data: saved });
  } catch (error) {
    sendError(res, error, "Erreur lors du retrait du consentement");
  }
}
