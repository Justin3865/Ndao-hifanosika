// src/utils/dataScope.ts
// Filtrage des données par propriétaire (accès par affectation).
//  - STAGIAIRE_* : uniquement ses propres stages
//  - TUTEUR_*    : uniquement les stages dont il est superviseur
//  - autres rôles autorisés par la route : aucun filtre supplémentaire

import { Request } from "express";
import { prisma } from "../config/database";

export interface ScopeUser {
  id: number;
  role: string;
}

export function getReqUser(req: Request): ScopeUser | undefined {
  return (req as Request & { user?: ScopeUser }).user;
}

const isStagiaire = (role: string) => role.startsWith("STAGIAIRE_");
const isTuteur = (role: string) => role.startsWith("TUTEUR_");

export function isScopedRole(user?: ScopeUser): boolean {
  return !!user && (isStagiaire(user.role) || isTuteur(user.role));
}

/** Clause Prisma `where` pour la table Internship. */
export function internshipScope(user?: ScopeUser): Record<string, unknown> {
  if (!user) return { id: -1 }; // pas d'utilisateur : rien

  if (isStagiaire(user.role)) return { studentId: user.id };
  if (isTuteur(user.role)) return { supervisorId: user.id };

  return {};
}

export function canSeeInternship(
  user: ScopeUser | undefined,
  internship: { studentId: number; supervisorId: number | null },
): boolean {
  if (!user) return false;
  if (isStagiaire(user.role)) return internship.studentId === user.id;
  if (isTuteur(user.role)) return internship.supervisorId === user.id;
  return true;
}

/** Vrai pour un stagiaire (STAGIAIRE_L1 … STAGIAIRE_M2). */
export const isInternRole = (role: string | undefined | null): boolean =>
  String(role ?? "").trim().toUpperCase().startsWith("STAGIAIRE_");

/**
 * Ids de TOUS les projets auxquels l'utilisateur est rattaché :
 *  - projet principal du stage            (Internship.projectId)
 *  - projets cochés en plus               (InternshipProject)
 *  - affectations directes « membre »     (ProjectMember, non terminées) — stagiaires uniquement
 * Pour un tuteur : les projets des stages qu'il supervise.
 */
export async function scopedProjectIds(user: ScopeUser): Promise<number[]> {
  const rows = await prisma.internship.findMany({
    where: internshipScope(user) as never,
    select: { projectId: true, projectLinks: { select: { projectId: true } } },
  });

  const ids = new Set<number>();

  for (const row of rows) {
    if (typeof row.projectId === "number") ids.add(row.projectId);
    for (const link of row.projectLinks ?? []) ids.add(link.projectId);
  }

  if (isStagiaire(user.role)) {
    const memberships = await prisma.projectMember.findMany({
      where: { userId: user.id, leftAt: null },
      select: { projectId: true },
    });
    for (const m of memberships) ids.add(m.projectId);
  }

  return [...ids];
}

/** Clause Prisma `where` pour la table Evaluation. */
export async function evaluationScope(
  user?: ScopeUser,
): Promise<Record<string, unknown>> {
  if (!user) return { id: -1 };
  if (!isScopedRole(user)) return {};

  return { projectId: { in: await scopedProjectIds(user) } };
}
