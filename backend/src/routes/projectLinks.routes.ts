// src/routes/projectLinks.routes.ts
// LOT 2 · Rattachement N-N bénéficiaire ↔ projets, membres ↔ projets, fiche membre (§5.2, §5.3, §8).
// Routeur AJOUTÉ, monté sur /api : il ne répond qu'aux chemins ci-dessous et laisse passer tout le reste.
// Attention : l'authentification est posée route par route (pas de router.use) pour ne pas toucher aux routes publiques.
import { Response, Router } from "express";
import { z } from "zod";

import { authenticate, AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendError } from "../middlewares/error.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { loadScope } from "../services/projectScope.service";
import { db } from "../utils/db";
import {
  LINK_STATUSES,
  canReachBeneficiary,
  canUnlink,
  normalizeLinkStatus,
  parseMemberProfile,
  visibleLinks,
  withPrimary,
} from "../utils/projectLinkRules";
import { canAccessProject } from "../utils/projectScopeRules";

const router = Router();

const BENEF_ROLES = ["ADMIN", "DIRECTION", "COORDINATOR"];
const MEMBER_READ_ROLES = ["ADMIN", "DIRECTION", "RH", "COORDINATOR"];
const MEMBER_WRITE_ROLES = ["ADMIN", "DIRECTION", "RH"];

const idOf = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const bad = (res: Response, message: string, status = 400) => void res.status(status).json({ success: false, message });
const forbidden = (res: Response) => bad(res, "Accès refusé : ce projet ne vous est pas affecté.", 403);

const linkBody = z.object({
  projectId: z.coerce.number().int().positive(),
  status: z.enum(LINK_STATUSES).optional(),
});
const statusBody = z.object({
  status: z.enum(LINK_STATUSES),
  exitedAt: z.coerce.date().optional(),
});

/** Rattachements d'un bénéficiaire : table N-N + projet principal éventuellement absent de la table. */
async function loadLinks(beneficiaryId: number) {
  const ben = await db.beneficiary.findUnique({ where: { id: beneficiaryId }, select: { id: true, projectId: true, createdAt: true } });
  if (!ben) return null;
  const rows = await db.beneficiaryProject.findMany({ where: { beneficiaryId }, orderBy: { joinedAt: "asc" } });
  const projects: Array<{ id: number; name: string }> = await db.project.findMany({
    where: { id: { in: [ben.projectId, ...rows.map((r: { projectId: number }) => r.projectId)] } },
    select: { id: true, name: true },
  });
  const names = new Map(projects.map((p) => [p.id, p.name]));
  const links = withPrimary(ben.projectId, rows, ben.createdAt).map((l) => ({ ...l, projectName: names.get(l.projectId) ?? null }));
  return { beneficiary: ben as { id: number; projectId: number }, links };
}

// ───────────────────────────── Bénéficiaire ↔ projets ─────────────────────────────

/** GET /api/beneficiaries/:id/projects : parcours par projet (filtré selon le périmètre du coordinateur). */
router.get("/beneficiaries/:id/projects", authenticate, authorizeRoles(...BENEF_ROLES), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const found = await loadLinks(id);
    if (!found) return bad(res, "Bénéficiaire introuvable.", 404);
    const scope = await loadScope(req.user!);
    if (!canReachBeneficiary(scope, found.links.map((l) => l.projectId))) return forbidden(res);
    res.json({ success: true, data: visibleLinks(scope, found.links) });
  } catch (error) {
    sendError(res, error, "Erreur lors de la lecture des projets du bénéficiaire");
  }
});

/** POST /api/beneficiaries/:id/projects { projectId, status? } : rattache le bénéficiaire à un projet de plus. */
router.post("/beneficiaries/:id/projects", authenticate, authorizeRoles(...BENEF_ROLES), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const { projectId, status } = linkBody.parse(req.body);
    const found = await loadLinks(id);
    if (!found) return bad(res, "Bénéficiaire introuvable.", 404);
    if (!(await db.project.findUnique({ where: { id: projectId }, select: { id: true } }))) return bad(res, "Projet introuvable.", 404);
    const scope = await loadScope(req.user!);
    if (!canAccessProject(scope, projectId)) return forbidden(res);

    const norm = normalizeLinkStatus(status ?? "ACTIVE");
    const row = await db.beneficiaryProject.upsert({
      where: { beneficiaryId_projectId: { beneficiaryId: id, projectId } },
      create: { beneficiaryId: id, projectId, status: norm.status, exitedAt: norm.exitedAt },
      update: { status: norm.status, exitedAt: norm.exitedAt },
    });
    // S'assure que le projet principal figure aussi dans la table (données antérieures à la reprise).
    await db.beneficiaryProject.upsert({
      where: { beneficiaryId_projectId: { beneficiaryId: id, projectId: found.beneficiary.projectId } },
      create: { beneficiaryId: id, projectId: found.beneficiary.projectId },
      update: {},
    });
    res.status(201).json({ success: true, message: "Bénéficiaire rattaché au projet.", data: row });
  } catch (error) {
    sendError(res, error, "Erreur lors du rattachement au projet");
  }
});

/** PATCH /api/beneficiaries/:id/projects/:projectId/status { status, exitedAt? } : statut du parcours DANS ce projet. */
router.patch("/beneficiaries/:id/projects/:projectId/status", authenticate, authorizeRoles(...BENEF_ROLES), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = idOf(req.params.id), projectId = idOf(req.params.projectId);
    if (!id || !projectId) return bad(res, "Identifiant invalide.");
    const body = statusBody.parse(req.body);
    const scope = await loadScope(req.user!);
    if (!canAccessProject(scope, projectId)) return forbidden(res);
    const existing = await db.beneficiaryProject.findUnique({ where: { beneficiaryId_projectId: { beneficiaryId: id, projectId } } });
    if (!existing) return bad(res, "Rattachement introuvable.", 404);
    const norm = normalizeLinkStatus(body.status, new Date(), body.exitedAt ?? null);
    const row = await db.beneficiaryProject.update({
      where: { beneficiaryId_projectId: { beneficiaryId: id, projectId } },
      data: { status: norm.status, exitedAt: norm.exitedAt },
    });
    res.json({ success: true, message: "Statut du parcours mis à jour pour ce projet.", data: row });
  } catch (error) {
    sendError(res, error, "Erreur lors de la mise à jour du statut");
  }
});

/** PATCH /api/beneficiaries/:id/projects/:projectId/primary : désigne le projet principal (synchronise Beneficiary.projectId). */
router.patch("/beneficiaries/:id/projects/:projectId/primary", authenticate, authorizeRoles("ADMIN", "DIRECTION", "COORDINATOR"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = idOf(req.params.id), projectId = idOf(req.params.projectId);
    if (!id || !projectId) return bad(res, "Identifiant invalide.");
    const scope = await loadScope(req.user!);
    const found = await loadLinks(id);
    if (!found) return bad(res, "Bénéficiaire introuvable.", 404);
    // un coordinateur doit être affecté au projet actuel ET au nouveau
    if (!canAccessProject(scope, projectId) || !canAccessProject(scope, found.beneficiary.projectId)) return forbidden(res);
    if (!found.links.some((l) => l.projectId === projectId)) return bad(res, "Rattachez d'abord le bénéficiaire à ce projet.", 400);
    await db.beneficiary.update({ where: { id }, data: { projectId } });
    res.json({ success: true, message: "Projet principal mis à jour.", data: { beneficiaryId: id, projectId } });
  } catch (error) {
    sendError(res, error, "Erreur lors du changement de projet principal");
  }
});

/** DELETE /api/beneficiaries/:id/projects/:projectId : détache (jamais du projet principal). */
router.delete("/beneficiaries/:id/projects/:projectId", authenticate, authorizeRoles(...BENEF_ROLES), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = idOf(req.params.id), projectId = idOf(req.params.projectId);
    if (!id || !projectId) return bad(res, "Identifiant invalide.");
    const scope = await loadScope(req.user!);
    if (!canAccessProject(scope, projectId)) return forbidden(res);
    const found = await loadLinks(id);
    if (!found) return bad(res, "Bénéficiaire introuvable.", 404);
    if (!canUnlink(found.beneficiary.projectId, projectId)) {
      return bad(res, "Impossible de détacher le projet principal : désignez d'abord un autre projet principal.", 409);
    }
    await db.beneficiaryProject.deleteMany({ where: { beneficiaryId: id, projectId } });
    res.json({ success: true, message: "Rattachement retiré." });
  } catch (error) {
    sendError(res, error, "Erreur lors du retrait du rattachement");
  }
});

/** GET /api/projects/:id/beneficiaries : identifiants, matricule et statut (aucun nom ni contact : donnée protégée). */
router.get("/projects/:id/beneficiaries", authenticate, authorizeRoles(...BENEF_ROLES, "RH", "DAF"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = idOf(req.params.id);
    if (!projectId) return bad(res, "Identifiant invalide.");
    const scope = await loadScope(req.user!);
    if (!canAccessProject(scope, projectId)) return forbidden(res);
    const rows: Array<{ beneficiaryId: number; status: string; joinedAt: Date; exitedAt: Date | null }> = await db.beneficiaryProject.findMany({
      where: { projectId }, orderBy: { joinedAt: "asc" },
    });
    // projet principal absent de la table (donnée ancienne) : on l'ajoute
    const primaries: Array<{ id: number; createdAt: Date }> = await db.beneficiary.findMany({
      where: { projectId, id: { notIn: rows.map((r) => r.beneficiaryId) } }, select: { id: true, createdAt: true },
    });
    const all = [
      ...rows,
      ...primaries.map((b) => ({ beneficiaryId: b.id, status: "ACTIVE", joinedAt: b.createdAt, exitedAt: null as Date | null })),
    ];
    const mats: Array<{ id: number; matricule: string | null; projectId: number }> = await db.beneficiary.findMany({
      where: { id: { in: all.map((r) => r.beneficiaryId) } }, select: { id: true, matricule: true, projectId: true },
    });
    const byId = new Map(mats.map((m) => [m.id, m]));
    res.json({
      success: true,
      data: all.map((r) => ({ ...r, matricule: byId.get(r.beneficiaryId)?.matricule ?? null, isPrimary: byId.get(r.beneficiaryId)?.projectId === projectId })),
    });
  } catch (error) {
    sendError(res, error, "Erreur lors de la lecture des bénéficiaires du projet");
  }
});

// ───────────────────────────── Membres ↔ projets ─────────────────────────────

const memberBody = z.object({
  userId: z.coerce.number().int().positive(),
  projectRole: z.string().trim().max(80).optional(),
  joinedAt: z.coerce.date().optional(),
});

/** GET /api/projects/:id/members */
router.get("/projects/:id/members", authenticate, authorizeRoles(...MEMBER_READ_ROLES), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = idOf(req.params.id);
    if (!projectId) return bad(res, "Identifiant invalide.");
    const scope = await loadScope(req.user!);
    if (!canAccessProject(scope, projectId)) return forbidden(res);
    const rows: Array<{ userId: number }> = await db.projectMember.findMany({ where: { projectId }, orderBy: { joinedAt: "asc" } });
    const users: Array<Record<string, unknown> & { id: number }> = await db.user.findMany({
      where: { id: { in: rows.map((r) => r.userId) } },
      select: { id: true, firstName: true, lastName: true, role: true, jobTitle: true, engagementType: true, department: { select: { id: true, name: true } } },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    res.json({ success: true, data: rows.map((r) => ({ ...r, user: byId.get(r.userId) ?? null })) });
  } catch (error) {
    sendError(res, error, "Erreur lors de la lecture des membres du projet");
  }
});

/** POST /api/projects/:id/members { userId, projectRole?, joinedAt? } */
router.post("/projects/:id/members", authenticate, authorizeRoles(...MEMBER_WRITE_ROLES), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = idOf(req.params.id);
    if (!projectId) return bad(res, "Identifiant invalide.");
    const body = memberBody.parse(req.body);
    if (!(await db.project.findUnique({ where: { id: projectId }, select: { id: true } }))) return bad(res, "Projet introuvable.", 404);
    if (!(await db.user.findUnique({ where: { id: body.userId }, select: { id: true } }))) return bad(res, "Membre introuvable.", 404);
    const row = await db.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: body.userId } },
      create: { projectId, userId: body.userId, projectRole: body.projectRole ?? null, joinedAt: body.joinedAt ?? new Date(), assignedById: req.user!.id },
      update: { projectRole: body.projectRole ?? null, leftAt: null },
    });
    res.status(201).json({ success: true, message: "Membre rattaché au projet.", data: row });
  } catch (error) {
    sendError(res, error, "Erreur lors du rattachement du membre");
  }
});

/** DELETE /api/projects/:id/members/:userId : retire le membre du projet (historique conservé via leftAt si ?soft=1). */
router.delete("/projects/:id/members/:userId", authenticate, authorizeRoles(...MEMBER_WRITE_ROLES), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = idOf(req.params.id), userId = idOf(req.params.userId);
    if (!projectId || !userId) return bad(res, "Identifiant invalide.");
    if (String(req.query.soft ?? "") === "1") {
      await db.projectMember.updateMany({ where: { projectId, userId, leftAt: null }, data: { leftAt: new Date() } });
    } else {
      await db.projectMember.deleteMany({ where: { projectId, userId } });
    }
    res.json({ success: true, message: "Membre retiré du projet." });
  } catch (error) {
    sendError(res, error, "Erreur lors du retrait du membre");
  }
});

// ───────────────────────────── Fiche membre ─────────────────────────────

/** GET /api/members/:id/profile : poste, département, période d'engagement, projets (soi-même ou rôles RH/Direction/Admin/Coordinateur). */
router.get("/members/:id/profile", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const role = req.user!.role.trim().toUpperCase();
    if (req.user!.id !== id && !MEMBER_READ_ROLES.includes(role)) return bad(res, "Accès refusé : rôle insuffisant.", 403);
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true, firstName: true, lastName: true, email: true, role: true, status: true, jobTitle: true,
        engagementType: true, engagementStart: true, engagementEnd: true, department: { select: { id: true, name: true } },
      },
    });
    if (!user) return bad(res, "Membre introuvable.", 404);
    const links: Array<{ projectId: number; projectRole: string | null; joinedAt: Date; leftAt: Date | null }> = await db.projectMember.findMany({ where: { userId: id } });
    const scope = await loadScope(req.user!);
    const visible = req.user!.id === id ? links : visibleLinks(scope, links);
    const projects: Array<{ id: number; name: string }> = await db.project.findMany({ where: { id: { in: visible.map((l) => l.projectId) } }, select: { id: true, name: true } });
    const names = new Map(projects.map((p) => [p.id, p.name]));
    res.json({ success: true, data: { ...user, projects: visible.map((l) => ({ ...l, projectName: names.get(l.projectId) ?? null })) } });
  } catch (error) {
    sendError(res, error, "Erreur lors de la lecture de la fiche membre");
  }
});

/** PUT /api/members/:id/profile { jobTitle?, engagementType?, engagementStart?, engagementEnd? } (ADMIN, RH) */
router.put("/members/:id/profile", authenticate, authorizeRoles("ADMIN", "RH"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const parsed = parseMemberProfile(req.body);
    if ("error" in parsed) return bad(res, parsed.error);
    if (!(await db.user.findUnique({ where: { id }, select: { id: true } }))) return bad(res, "Membre introuvable.", 404);
    const data = await db.user.update({
      where: { id }, data: parsed.data,
      select: { id: true, jobTitle: true, engagementType: true, engagementStart: true, engagementEnd: true },
    });
    res.json({ success: true, message: "Fiche membre mise à jour.", data });
  } catch (error) {
    sendError(res, error, "Erreur lors de la mise à jour de la fiche membre");
  }
});

export const projectLinksRouter = router;
export default router;
