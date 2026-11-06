import { db } from "../utils/db";
import { ScopeDecision, decideScope } from "../utils/projectScopeRules";

const strictMode = () => (process.env.COORDINATOR_SCOPE ?? "").trim().toLowerCase() === "strict";

export async function loadScope(user: { id: number; role: string }): Promise<ScopeDecision> {
  if (user.role.trim().toUpperCase() !== "COORDINATOR") return { scoped: false, allowed: [] };
  const rows: Array<{ projectId: number }> = await db.projectCoordinator.findMany({
    where: { userId: user.id },
    select: { projectId: true },
  });
  return decideScope(user.role, rows.map((r) => r.projectId), strictMode());
}

export async function beneficiaryProjectId(beneficiaryId: number): Promise<number | null> {
  const row = await db.beneficiary.findUnique({ where: { id: beneficiaryId }, select: { projectId: true } });
  return row ? (row.projectId as number) : null;
}

export async function followUpProjectId(followUpId: number): Promise<number | null> {
  const row = await db.postProgramFollowUp.findUnique({
    where: { id: followUpId },
    select: { beneficiary: { select: { projectId: true } } },
  });
  return row ? (row.beneficiary.projectId as number) : null;
}

export async function evaluationProjectId(evaluationId: number): Promise<number | null> {
  const row = await db.evaluation.findUnique({ where: { id: evaluationId }, select: { projectId: true } });
  return row ? (row.projectId as number) : null;
}

export async function beneficiaryIdsOfProjects(projectIds: number[]): Promise<Set<number>> {
  const rows: Array<{ id: number }> = await db.beneficiary.findMany({
    where: { projectId: { in: projectIds } },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}
