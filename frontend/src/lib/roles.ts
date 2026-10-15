// src/lib/roles.ts
// Rôles EXACTS stockés dans la base (colonne User.role).

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  DIRECTION: "Direction",
  DSI: "DSI",
  DAF: "DAF",
  RH: "Ressources Humaines",
  COMMUNICATION: "Communication",
  COORDINATOR: "Coordinateur",
  TUTEUR_L3: "Tuteur L3",
  TUTEUR_M2: "Tuteur M2",
  STAGIAIRE_L3: "Stagiaire L3",
  STAGIAIRE_M2: "Stagiaire M2",
};

/** Rôles attribuables : ADMIN est exclu (un seul administrateur). */
export const ASSIGNABLE_ROLES = Object.keys(ROLE_LABELS).filter(
  (role) => role !== "ADMIN"
);

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
  PENDING: "En attente",
  REJECTED: "Rejeté",
};

export function roleLabel(role?: string | null): string {
  if (!role) return "—";
  return ROLE_LABELS[role.toUpperCase()] ?? role;
}

export function statusLabel(status?: string | null): string {
  if (!status) return "—";
  return STATUS_LABELS[status.toUpperCase()] ?? status;
}
