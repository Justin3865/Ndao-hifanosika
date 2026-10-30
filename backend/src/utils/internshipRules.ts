/**
 * Règles de cohérence d'un stage (dates, statut, rôles, chevauchement).
 * Utilisées à la création ET à la modification pour que l'application reste logique,
 * quel que soit l'écran (ou l'appel API) utilisé.
 */

import { prisma } from "../config/database";

export const STUDENT_ROLES = ["STAGIAIRE_L3", "STAGIAIRE_M2"];
export const TUTOR_ROLES = ["TUTEUR_L3", "TUTEUR_M2"];

const startOfDay = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Statut « naturel » d'un stage d'après ses dates (l'annulation reste un choix manuel). */
export function deriveStatus(start: Date, end: Date | null, today = new Date()): "PENDING" | "IN_PROGRESS" | "COMPLETED" {
  const t = startOfDay(today);

  if (startOfDay(start) > t) return "PENDING";
  if (end && startOfDay(end) < t) return "COMPLETED";

  return "IN_PROGRESS";
}

/** Dates : début valide, fin obligatoire et STRICTEMENT après le début. Retourne un message d'erreur ou null. */
export function validateDates(start: Date | null | undefined, end: Date | null | undefined): string | null {
  if (!start || Number.isNaN(start.getTime())) return "La date de début du stage est obligatoire.";
  if (!end || Number.isNaN(end.getTime())) return "La date de fin du stage est obligatoire.";
  if (startOfDay(end) <= startOfDay(start)) return "La date de fin doit être postérieure à la date de début.";

  return null;
}

/** Le statut demandé doit rester compatible avec les dates. */
export function validateStatusAgainstDates(status: string | undefined, start: Date, end: Date | null): string | null {
  if (!status || status === "CANCELLED") return null;

  const natural = deriveStatus(start, end);

  if (status === "IN_PROGRESS" && natural === "PENDING") return "Un stage dont la date de début est dans le futur ne peut pas être « En cours ».";
  if (status === "COMPLETED" && natural !== "COMPLETED") return "Un stage ne peut être « Terminé » qu'après sa date de fin.";
  if (status === "PENDING" && natural !== "PENDING") return "Un stage déjà commencé ne peut plus être « En attente ».";

  return null;
}

/** Le stagiaire doit être un stagiaire et le tuteur un tuteur. */
export async function validateParticipants(studentId: number, supervisorId?: number | null): Promise<string | null> {
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { role: true } });

  if (!student || !STUDENT_ROLES.includes(String(student.role))) return "La personne choisie n'est pas un stagiaire.";

  if (supervisorId) {
    const tutor = await prisma.user.findUnique({ where: { id: supervisorId }, select: { role: true } });

    if (!tutor || !TUTOR_ROLES.includes(String(tutor.role))) return "L'encadrant choisi n'est pas un tuteur.";
  }

  return null;
}

/** Un stagiaire ne peut pas avoir deux stages actifs qui se chevauchent. */
export async function findOverlap(studentId: number, start: Date, end: Date, ignoreId?: number): Promise<string | null> {
  const clash = await prisma.internship.findFirst({
    where: {
      studentId,
      status: { not: "CANCELLED" as never },
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
      startDate: { lt: end },
      OR: [{ endDate: null }, { endDate: { gt: start } }],
    },
    select: { title: true },
  });

  return clash ? `Ce stagiaire a déjà un stage sur cette période (« ${clash.title} »).` : null;
}

/** Le CIN est unique : une autre personne ne peut pas déjà l'utiliser. */
export async function cinTakenBy(cin: string | null | undefined, userId: number): Promise<string | null> {
  if (!cin) return null;

  const other = await prisma.user.findFirst({
    where: { cinNumber: cin, id: { not: userId } },
    select: { firstName: true, lastName: true },
  });

  return other ? `Ce numéro de CIN est déjà enregistré pour ${other.firstName} ${other.lastName}.` : null;
}
