// src/routes/personEvaluations.routes.ts
// LOT 1 · Évaluations polymorphes (membre / stagiaire / bénéficiaire), auto-évaluation, évaluation croisée,
// campagnes périodiques, tuteur académique (§5.3, §8). Routeur AJOUTÉ sur son propre préfixe : /api/person-evaluations.
// Les routes /api/evaluations, /api/evaluation-grids, /api/evaluation-campaigns et /api/internships restent inchangées.
import { Response, Router } from "express";
import { z } from "zod";

import { authenticate, AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendError } from "../middlewares/error.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { loadScope } from "../services/projectScope.service";
import { db } from "../utils/db";
import {
  EVALUATOR_ROLES,
  HR_ROLES,
  PERIODICITIES,
  TARGET_TYPES,
  type Target,
  canCreate,
  canTransition,
  cleanScores,
  computeTotal,
  crossGap,
  hasLargeGap,
  isStagiaireRole,
  missingCriteria,
  overdueCount,
  periodLabel,
  planSlots,
  progressSeries,
  slotKey,
  toPerformanceInput,
} from "../utils/personEvaluationRules";
import { canReachBeneficiary } from "../utils/projectLinkRules";

const router = Router();
router.use(authenticate);

const role = (req: AuthenticatedRequest) => req.user!.role.trim().toUpperCase();
const isHr = (req: AuthenticatedRequest) => HR_ROLES.includes(role(req));
const isTutor = (req: AuthenticatedRequest) => role(req).startsWith("TUTEUR_");
const idOf = (v: unknown): number | null => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
const bad = (res: Response, message: string, status = 400) => void res.status(status).json({ success: false, message });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** Grille → critères {label, weight} + barème. */
async function loadGrid(gridId: number | null | undefined): Promise<{ criteria: Array<{ label: string; weight: number }>; maxScore: number } | null> {
  if (!gridId) return null;
  const g: Row | null = await db.evaluationGrid.findUnique({ where: { id: gridId } });
  if (!g) return null;
  const criteria = (Array.isArray(g.criteria) ? g.criteria : [])
    .map((c: Row) => ({ label: String(c.label ?? "").trim(), weight: Number(c.weight) > 0 ? Number(c.weight) : 1 }))
    .filter((c: { label: string }) => c.label);
  return { criteria, maxScore: Number(g.maxScore) > 0 ? Number(g.maxScore) : 20 };
}

/** Stagiaires encadrés par ce tuteur (tuteur entreprise = Internship.supervisorId). */
async function internsOf(tutorId: number): Promise<number[]> {
  const rows: Array<{ studentId: number }> = await db.internship.findMany({ where: { supervisorId: tutorId }, select: { studentId: true } });
  return [...new Set(rows.map((r) => r.studentId))];
}

/** Projets d'un bénéficiaire : principal + rattachements N-N. */
async function beneficiaryProjectIds(beneficiaryId: number): Promise<number[] | null> {
  const b: Row | null = await db.beneficiary.findUnique({ where: { id: beneficiaryId }, select: { projectId: true } });
  if (!b) return null;
  const links: Array<{ projectId: number }> = await db.beneficiaryProject.findMany({ where: { beneficiaryId }, select: { projectId: true } });
  return [...new Set([b.projectId as number, ...links.map((l) => l.projectId)])];
}

/** Filtre Prisma des évaluations visibles par l'appelant (null = toutes). */
async function accessWhere(req: AuthenticatedRequest): Promise<Row | null> {
  if (isHr(req)) return null;
  const me = req.user!.id;
  const or: Row[] = [
    { evaluatorId: me },
    // la personne évaluée voit son auto-évaluation et les évaluations VALIDÉES la concernant
    { targetType: { in: ["MEMBER", "STAGIAIRE"] }, targetId: me, OR: [{ evaluatorRole: "SELF" }, { status: "VALIDATED" }] },
  ];
  if (isTutor(req)) {
    const interns = await internsOf(me);
    if (interns.length) or.push({ targetType: "STAGIAIRE", targetId: { in: interns } });
  }
  if (role(req) === "COORDINATOR") {
    const scope = await loadScope(req.user!);
    or.push(scope.scoped ? { targetType: "BENEFICIARY", projectId: { in: scope.allowed } } : { targetType: "BENEFICIARY" });
  }
  return { OR: or };
}

const withAccess = (access: Row | null, where: Row): Row => (access ? { AND: [where, access] } : where);

// ───────────────────────────── Évaluations ─────────────────────────────

const listQuery = z.object({
  targetType: z.enum(TARGET_TYPES).optional(),
  targetId: z.coerce.number().int().positive().optional(),
  campaignId: z.coerce.number().int().positive().optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "VALIDATED"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

/** GET /api/person-evaluations?targetType=&targetId=&campaignId=&status= */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = listQuery.parse(req.query);
    const { limit, ...filters } = q;
    const where = withAccess(await accessWhere(req), filters);
    const data = await db.personEvaluation.findMany({ where, orderBy: { createdAt: "desc" }, take: limit });
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error, "Erreur lors de la lecture des évaluations");
  }
});

/** GET /api/person-evaluations/history?targetType=&targetId= : progression, auto/croisée, entrée du service IA. */
router.get("/history", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = z.object({ targetType: z.enum(TARGET_TYPES), targetId: z.coerce.number().int().positive() }).parse(req.query);
    const where = withAccess(await accessWhere(req), { targetType: q.targetType, targetId: q.targetId });
    const items: Row[] = await db.personEvaluation.findMany({ where, include: { scores: true }, orderBy: { createdAt: "asc" } });
    const series = progressSeries(items as never);
    const latestOf = (pred: (i: Row) => boolean) => [...items].reverse().find((i) => pred(i) && i.status !== "DRAFT" && typeof i.totalScore === "number")?.totalScore ?? null;
    const self = latestOf((i) => i.evaluatorRole === "SELF");
    const supervisor = latestOf((i) => i.evaluatorRole !== "SELF");
    const gap = crossGap(self, supervisor);
    res.json({
      success: true,
      data: {
        count: series.length,
        series,
        average: series.length ? Math.round((series.reduce((a, p) => a + p.score, 0) / series.length) * 10) / 10 : null,
        cross: { self, supervisor, gap, alert: hasLargeGap(gap) },
        performanceInput: toPerformanceInput(items as never), // à envoyer à POST /ai/score/performance
      },
    });
  } catch (error) {
    sendError(res, error, "Erreur lors de la lecture de l'historique");
  }
});

/** GET /api/person-evaluations/:id */
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const row = await db.personEvaluation.findFirst({ where: withAccess(await accessWhere(req), { id }), include: { scores: true } });
    if (!row) return bad(res, "Évaluation introuvable.", 404);
    res.json({ success: true, data: row });
  } catch (error) {
    sendError(res, error, "Erreur lors de la lecture de l'évaluation");
  }
});

const createBody = z.object({
  targetType: z.enum(TARGET_TYPES),
  targetId: z.coerce.number().int().positive(),
  evaluatorRole: z.enum(EVALUATOR_ROLES).default("SUPERVISOR"),
  gridId: z.coerce.number().int().positive().optional(),
  campaignId: z.coerce.number().int().positive().optional(),
  projectId: z.coerce.number().int().positive().optional(),
  period: z.string().trim().max(40).optional(),
});

/** POST /api/person-evaluations : ouvre une évaluation (ou « prend » un créneau laissé libre par une campagne). */
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const b = createBody.parse(req.body);
    const check = canCreate({ id: req.user!.id, role: req.user!.role }, b.targetType, b.targetId, b.evaluatorRole);
    if (!check.ok) return bad(res, check.message, 403);

    if (b.targetType === "BENEFICIARY") {
      const ids = await beneficiaryProjectIds(b.targetId);
      if (!ids) return bad(res, "Bénéficiaire introuvable.", 404);
      if (role(req) === "COORDINATOR" && !canReachBeneficiary(await loadScope(req.user!), ids)) return bad(res, "Accès refusé : ce bénéficiaire n'est pas dans votre périmètre.", 403);
    } else if (!(await db.user.findUnique({ where: { id: b.targetId }, select: { id: true } }))) {
      return bad(res, "Personne introuvable.", 404);
    }
    // un tuteur n'évalue que SES stagiaires
    if (isTutor(req) && b.evaluatorRole !== "SELF" && !(b.targetType === "STAGIAIRE" && (await internsOf(req.user!.id)).includes(b.targetId))) {
      return bad(res, "Accès refusé : vous n'êtes pas le tuteur de ce stagiaire.", 403);
    }

    const campaign: Row | null = b.campaignId ? await db.evaluationCampaign.findUnique({ where: { id: b.campaignId } }) : null;
    if (b.campaignId && !campaign) return bad(res, "Campagne introuvable.", 404);

    if (b.campaignId) {
      // créneau déjà ouvert par la campagne : on le prend en charge au lieu de créer un doublon
      const mine = await db.personEvaluation.findFirst({ where: { campaignId: b.campaignId, targetType: b.targetType, targetId: b.targetId, evaluatorRole: b.evaluatorRole, evaluatorId: req.user!.id } });
      if (mine) return bad(res, "Une évaluation existe déjà pour ce créneau.", 409);
      const free = await db.personEvaluation.findFirst({ where: { campaignId: b.campaignId, targetType: b.targetType, targetId: b.targetId, evaluatorRole: b.evaluatorRole, evaluatorId: null, status: "DRAFT" } });
      if (free) {
        const row = await db.personEvaluation.update({ where: { id: free.id }, data: { evaluatorId: req.user!.id } });
        return void res.json({ success: true, message: "Évaluation prise en charge.", data: row });
      }
    }
    const row = await db.personEvaluation.create({
      data: {
        targetType: b.targetType, targetId: b.targetId, evaluatorId: req.user!.id, evaluatorRole: b.evaluatorRole,
        gridId: b.gridId ?? campaign?.gridId ?? null, campaignId: b.campaignId ?? null, projectId: b.projectId ?? campaign?.projectId ?? null,
        period: b.period ?? periodLabel(campaign?.periodicity ?? null),
      },
    });
    res.status(201).json({ success: true, message: "Évaluation créée.", data: row });
  } catch (error) {
    sendError(res, error, "Erreur lors de la création de l'évaluation");
  }
});

/** Charge une évaluation modifiable par l'appelant (son évaluation à lui, ou RH/Direction/Admin). */
async function editable(req: AuthenticatedRequest, res: Response, id: number | null): Promise<Row | null> {
  if (!id) { bad(res, "Identifiant invalide."); return null; }
  const ev: Row | null = await db.personEvaluation.findUnique({ where: { id } });
  if (!ev) { bad(res, "Évaluation introuvable.", 404); return null; }
  if (ev.evaluatorId !== req.user!.id && !(isHr(req) && ev.evaluatorRole !== "SELF")) { bad(res, "Accès refusé : ce n'est pas votre évaluation.", 403); return null; }
  return ev;
}

const scoresBody = z.object({ scores: z.array(z.object({ criterion: z.string(), score: z.coerce.number(), maxScore: z.coerce.number().optional(), weight: z.coerce.number().optional(), comment: z.string().nullish() })).min(1), comment: z.string().max(4000).nullish() });

/** PUT /api/person-evaluations/:id/scores { scores:[{criterion,score,maxScore?,comment?}], comment? } (brouillon uniquement) */
router.put("/:id/scores", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ev = await editable(req, res, idOf(req.params.id));
    if (!ev) return;
    if (!canTransition(ev.status, "edit")) return bad(res, "Cette évaluation est soumise : elle n'est plus modifiable.", 409);
    const body = scoresBody.parse(req.body);
    const grid = await loadGrid(ev.gridId);
    const cleaned = cleanScores(body.scores, grid);
    if ("error" in cleaned) return bad(res, cleaned.error);
    const total = computeTotal(cleaned.scores);
    await db.$transaction([
      db.personEvaluationScore.deleteMany({ where: { evaluationId: ev.id } }),
      db.personEvaluationScore.createMany({ data: cleaned.scores.map((s) => ({ ...s, evaluationId: ev.id })) }),
      db.personEvaluation.update({ where: { id: ev.id }, data: { totalScore: total, comment: body.comment ?? ev.comment } }),
    ]);
    res.json({ success: true, message: "Notes enregistrées.", data: { id: ev.id, totalScore: total } });
  } catch (error) {
    sendError(res, error, "Erreur lors de l'enregistrement des notes");
  }
});

/** POST /api/person-evaluations/:id/submit : DRAFT → SUBMITTED (tous les critères de la grille doivent être notés). */
router.post("/:id/submit", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ev = await editable(req, res, idOf(req.params.id));
    if (!ev) return;
    if (!canTransition(ev.status, "submit")) return bad(res, "Évaluation déjà soumise.", 409);
    const scored: Array<{ criterion: string }> = await db.personEvaluationScore.findMany({ where: { evaluationId: ev.id }, select: { criterion: true } });
    const missing = missingCriteria(await loadGrid(ev.gridId), scored);
    if (missing.length) return bad(res, `Critères non notés : ${missing.join(", ")}.`, 422);
    const row = await db.personEvaluation.update({ where: { id: ev.id }, data: { status: "SUBMITTED", submittedAt: new Date() } });
    res.json({ success: true, message: "Évaluation soumise.", data: row });
  } catch (error) {
    sendError(res, error, "Erreur lors de la soumission");
  }
});

/** POST /api/person-evaluations/:id/validate : SUBMITTED → VALIDATED (Direction, RH, Admin). La validation fige l'évaluation. */
router.post("/:id/validate", authorizeRoles(...HR_ROLES), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const ev: Row | null = await db.personEvaluation.findUnique({ where: { id } });
    if (!ev) return bad(res, "Évaluation introuvable.", 404);
    if (!canTransition(ev.status, "validate")) return bad(res, "Seule une évaluation soumise peut être validée.", 409);
    const row = await db.personEvaluation.update({ where: { id }, data: { status: "VALIDATED", validatedById: req.user!.id, validatedAt: new Date() } });
    res.json({ success: true, message: "Évaluation validée.", data: row });
  } catch (error) {
    sendError(res, error, "Erreur lors de la validation");
  }
});

// ───────────────────────────── Campagnes périodiques ─────────────────────────────

/** PATCH /api/person-evaluations/campaigns/:id/meta { periodicity?, targetType? } */
router.patch("/campaigns/:id/meta", authorizeRoles("ADMIN", "DIRECTION", "RH", "COORDINATOR"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const b = z.object({ periodicity: z.enum(PERIODICITIES).nullable().optional(), targetType: z.enum(TARGET_TYPES).nullable().optional() }).parse(req.body);
    if (!(await db.evaluationCampaign.findUnique({ where: { id }, select: { id: true } }))) return bad(res, "Campagne introuvable.", 404);
    res.json({ success: true, data: await db.evaluationCampaign.update({ where: { id }, data: b }) });
  } catch (error) {
    sendError(res, error, "Erreur lors de la mise à jour de la campagne");
  }
});

/** PATCH /api/person-evaluations/grids/:id/meta { projectId?, maxScore?, targetType? } : projet, barème, type de cible de la grille. */
router.patch("/grids/:id/meta", authorizeRoles("ADMIN", "DIRECTION", "RH", "COORDINATOR"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const b = z.object({
      projectId: z.coerce.number().int().positive().nullable().optional(),
      maxScore: z.coerce.number().positive().max(1000).optional(),
      targetType: z.enum(TARGET_TYPES).nullable().optional(),
    }).parse(req.body);
    if (!(await db.evaluationGrid.findUnique({ where: { id }, select: { id: true } }))) return bad(res, "Grille introuvable.", 404);
    if (b.projectId && !(await db.project.findUnique({ where: { id: b.projectId }, select: { id: true } }))) return bad(res, "Projet introuvable.", 404);
    res.json({ success: true, data: await db.evaluationGrid.update({ where: { id }, data: b }) });
  } catch (error) {
    sendError(res, error, "Erreur lors de la mise à jour de la grille");
  }
});

/** POST /api/person-evaluations/campaigns/:id/launch : ouvre les évaluations (auto + responsable + tuteurs) de la campagne. Idempotent. */
router.post("/campaigns/:id/launch", authorizeRoles(...HR_ROLES), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const c: Row | null = await db.evaluationCampaign.findUnique({ where: { id } });
    if (!c) return bad(res, "Campagne introuvable.", 404);
    if (!c.gridId) return bad(res, "Associez d'abord une grille à la campagne.", 422);
    if (!(TARGET_TYPES as readonly string[]).includes(c.targetType)) return bad(res, "Définissez le type de cible de la campagne (MEMBER, STAGIAIRE ou BENEFICIARY).", 422);
    if (c.status === "CLOSED") return bad(res, "Campagne clôturée.", 409);

    let targets: Target[] = [];
    if (c.targetType === "BENEFICIARY") {
      if (!c.projectId) return bad(res, "Une campagne bénéficiaires doit avoir un projet.", 422);
      const links: Array<{ beneficiaryId: number }> = await db.beneficiaryProject.findMany({ where: { projectId: c.projectId, status: "ACTIVE" }, select: { beneficiaryId: true } });
      const prim: Array<{ id: number }> = await db.beneficiary.findMany({ where: { projectId: c.projectId }, select: { id: true } });
      targets = [...new Set([...links.map((l) => l.beneficiaryId), ...prim.map((p) => p.id)])].map((targetId) => ({ targetType: "BENEFICIARY" as const, targetId }));
    } else {
      let users: Array<{ id: number; role: string }> = await db.user.findMany({ where: { status: "ACTIVE" }, select: { id: true, role: true } });
      if (c.projectId) {
        const members: Array<{ userId: number }> = await db.projectMember.findMany({ where: { projectId: c.projectId, leftAt: null }, select: { userId: true } });
        const ok = new Set(members.map((m) => m.userId));
        users = users.filter((u) => ok.has(u.id));
      }
      const wantStag = c.targetType === "STAGIAIRE";
      users = users.filter((u) => isStagiaireRole(u.role) === wantStag);
      const tut = new Map<number, { tutor: number | null; academic: boolean }>();
      if (wantStag && users.length) {
        const ints: Row[] = await db.internship.findMany({ where: { studentId: { in: users.map((u) => u.id) } }, orderBy: { startDate: "desc" }, select: { studentId: true, supervisorId: true, academicSupervisorName: true } });
        for (const i of ints) if (!tut.has(i.studentId)) tut.set(i.studentId, { tutor: i.supervisorId ?? null, academic: !!i.academicSupervisorName });
      }
      targets = users.map((u) => ({ targetType: c.targetType, targetId: u.id, tutorEnterpriseId: tut.get(u.id)?.tutor ?? null, hasAcademicTutor: tut.get(u.id)?.academic ?? false }));
    }

    const existing: Row[] = await db.personEvaluation.findMany({ where: { campaignId: id }, select: { targetType: true, targetId: true, evaluatorRole: true, evaluatorId: true } });
    const slots = planSlots(targets, existing.map((e) => slotKey(e as never)));
    const period = periodLabel(c.periodicity);
    if (slots.length) {
      await db.personEvaluation.createMany({ data: slots.map((s) => ({ ...s, gridId: c.gridId, campaignId: id, projectId: c.projectId ?? null, period })) });
    }
    if (c.status === "DRAFT") await db.evaluationCampaign.update({ where: { id }, data: { status: "ACTIVE" } });
    res.status(201).json({ success: true, message: `${slots.length} évaluation(s) ouverte(s).`, data: { created: slots.length, alreadyOpen: existing.length, targets: targets.length } });
  } catch (error) {
    sendError(res, error, "Erreur lors du lancement de la campagne");
  }
});

/** GET /api/person-evaluations/campaigns/:id/progress : taux de complétion et évaluations en retard (KPI §13, alertes RH §5.3). */
router.get("/campaigns/:id/progress", authorizeRoles(...HR_ROLES), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const c: Row | null = await db.evaluationCampaign.findUnique({ where: { id } });
    if (!c) return bad(res, "Campagne introuvable.", 404);
    const rows: Array<{ status: string }> = await db.personEvaluation.findMany({ where: { campaignId: id }, select: { status: true } });
    const count = (s: string) => rows.filter((r) => r.status === s).length;
    const total = rows.length, done = count("SUBMITTED") + count("VALIDATED");
    res.json({
      success: true,
      data: {
        total, draft: count("DRAFT"), submitted: count("SUBMITTED"), validated: count("VALIDATED"),
        completionRate: total ? Math.round((done / total) * 1000) / 10 : null,
        overdue: overdueCount(c as never, count("DRAFT")),
      },
    });
  } catch (error) {
    sendError(res, error, "Erreur lors du calcul de l'avancement");
  }
});

// ───────────────────────────── Tuteur académique ─────────────────────────────

/** PATCH /api/person-evaluations/internships/:id/academic-supervisor { name, email? } (tuteur entreprise = supervisorId existant) */
router.patch("/internships/:id/academic-supervisor", authorizeRoles("ADMIN", "DIRECTION", "RH"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const b = z.object({ name: z.string().trim().max(120).nullable(), email: z.string().trim().email().max(160).nullish() }).parse(req.body);
    if (!(await db.internship.findUnique({ where: { id }, select: { id: true } }))) return bad(res, "Stage introuvable.", 404);
    const data = await db.internship.update({
      where: { id }, data: { academicSupervisorName: b.name || null, academicSupervisorEmail: b.name ? b.email ?? null : null },
      select: { id: true, supervisorId: true, supervisorName: true, academicSupervisorName: true, academicSupervisorEmail: true },
    });
    res.json({ success: true, message: "Tuteur académique enregistré.", data });
  } catch (error) {
    sendError(res, error, "Erreur lors de l'enregistrement du tuteur académique");
  }
});

// ───────────────────────────── Performance IA (§5.7, §9.2) ─────────────────────────────

/**
 * GET /api/person-evaluations/performance/members/:id
 * Score de performance 0-100, tendance, points forts et axes d'amélioration d'un membre/stagiaire (RH, Direction, Admin, tuteur du stagiaire).
 * Calculé par le service IA (POST /ai/score/performance) ; si le service est indisponible, la réponse garde l'historique
 * et indique source = "unavailable" (dégradation gracieuse : jamais d'erreur bloquante).
 */
router.get("/performance/members/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const allowed = isHr(req) || (isTutor(req) && (await internsOf(req.user!.id)).includes(id));
    if (!allowed) return bad(res, "Accès refusé : réservé au RH, à la Direction et au tuteur du stagiaire.", 403);

    const items: Row[] = await db.personEvaluation.findMany({
      where: { targetType: { in: ["MEMBER", "STAGIAIRE"] }, targetId: id, status: { in: ["SUBMITTED", "VALIDATED"] } },
      include: { scores: true }, orderBy: { createdAt: "asc" },
    });
    const input = toPerformanceInput(items as never);
    const base = { memberId: id, count: input.length, history: progressSeries(items as never) };
    const url = process.env.AI_SERVICE_URL?.trim().replace(/\/+$/, "");
    if (!url || input.length === 0) {
      return void res.json({ success: true, data: { ...base, source: input.length === 0 ? "no-data" : "unavailable", performance: null } });
    }
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 3000);
      const r = await fetch(`${url}/ai/score/performance`, {
        method: "POST", signal: ctl.signal,
        headers: { "Content-Type": "application/json", "x-service-key": process.env.AI_SERVICE_KEY ?? "" },
        body: JSON.stringify({ evaluations: input }),
      }).finally(() => clearTimeout(timer));
      if (!r.ok) throw new Error(`IA ${r.status}`);
      res.json({ success: true, data: { ...base, source: "ai-service", performance: await r.json() } });
    } catch {
      res.json({ success: true, data: { ...base, source: "unavailable", performance: null } });
    }
  } catch (error) {
    sendError(res, error, "Erreur lors du calcul de la performance");
  }
});

export const personEvaluationsRouter = router;
export default router;
