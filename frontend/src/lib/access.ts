// src/lib/access.ts
// SOURCE UNIQUE de vérité : quel rôle peut ouvrir quelle route.
// Miroir des routes backend (src/routes/*.routes.ts -> authorizeRoles).
// Si tu changes un authorizeRoles côté backend, change-le ici aussi.

export const ALL_ROLES = [
  "ADMIN",
  "DIRECTION",
  "DSI",
  "DAF",
  "RH",
  "COMMUNICATION",
  "COORDINATOR",
  "TUTEUR_L3",
  "TUTEUR_M2",
  "STAGIAIRE_L3",
  "STAGIAIRE_M2",
] as const;

const TUTEURS = ["TUTEUR_L3", "TUTEUR_M2"] as const;
const STAGIAIRES = ["STAGIAIRE_L3", "STAGIAIRE_M2"] as const;

interface AccessRule {
  pattern: RegExp;
  roles: readonly string[];
}

/**
 * ORDRE IMPORTANT : la première règle qui correspond gagne.
 * Les règles spécifiques (create / edit) passent avant les règles générales.
 */
const ACCESS_RULES: AccessRule[] = [
  // Pages communes à tous les utilisateurs connectés
  // ("*" = tout utilisateur connecté, quel que soit son rôle : jamais de boucle 403 sur ces pages)
  { pattern: /^\/(dashboard|profile|settings|notifications)(\/|$)/, roles: ["*"] },

  // ADMIN uniquement
  { pattern: /^\/administration(\/|$)/, roles: ["ADMIN"] },
  { pattern: /^\/security(\/|$)/, roles: ["ADMIN", "DSI"] },

  // Zones d'intervention (administration)
  { pattern: /^\/zones(\/|$)/, roles: ["ADMIN", "DIRECTION"] },

  // Certificats : liste filtrée côté serveur (chacun voit les siens)
  { pattern: /^\/certificates\/create\/?$/, roles: ["ADMIN", "DIRECTION", "RH"] },
  { pattern: /^\/certificates(\/|$)/, roles: ALL_ROLES },

  // Mission terrain (partage de position de l'agent) : tout le personnel sauf stagiaires
  {
    pattern: /^\/mission(\/|$)/,
    roles: ["ADMIN", "DIRECTION", "DSI", "DAF", "RH", "COMMUNICATION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"],
  },

  // Chatbot + carte des ménages vulnérables : données personnelles
  { pattern: /^\/ai\/models(\/|$)/, roles: ["ADMIN", "DIRECTION", "DSI", "COORDINATOR"] },
  { pattern: /^\/ai\/(chat|vulnerability)(\/|$)/, roles: ["ADMIN", "DIRECTION", "COORDINATOR"] },

  // Suivi terrain en direct (bénéficiaires)
  { pattern: /^\/tracking(\/|$)/, roles: ["ADMIN", "DIRECTION", "COORDINATOR"] },

  // Utilisateurs
  { pattern: /^\/users\/(create|[^/]+\/edit)\/?$/, roles: ["ADMIN"] },
  { pattern: /^\/users(\/|$)/, roles: ["ADMIN", "DSI", "RH"] },

  // Départements
  { pattern: /^\/departements\/(create|[^/]+\/edit)\/?$/, roles: ["ADMIN", "DSI"] },
  { pattern: /^\/departements(\/|$)/, roles: ["ADMIN", "DSI", "RH"] },

  // Sous-pages de /projects qui suivent les règles activités / jalons
  {
    pattern: /^\/projects\/activities(\/|$)/,
    roles: ["ADMIN", "DIRECTION", "COMMUNICATION", "COORDINATOR", ...TUTEURS, ...STAGIAIRES],
  },
  {
    pattern: /^\/projects\/milestones(\/|$)/,
    roles: ["ADMIN", "DIRECTION", "COORDINATOR", ...TUTEURS],
  },

  // Projets
  { pattern: /^\/projects\/(create|[^/]+\/edit)\/?$/, roles: ["ADMIN", "DIRECTION", "DAF", "COORDINATOR"] },
  { pattern: /^\/projects(\/|$)/, roles: ["ADMIN", "DIRECTION", "DAF", "COMMUNICATION", "COORDINATOR"] },

  // Activités
  {
    pattern: /^\/activities\/(create|[^/]+\/edit)\/?$/,
    roles: ["ADMIN", "DIRECTION", "COMMUNICATION", "COORDINATOR", ...TUTEURS],
  },
  {
    pattern: /^\/activities(\/|$)/,
    roles: ["ADMIN", "DIRECTION", "COMMUNICATION", "COORDINATOR", ...TUTEURS, ...STAGIAIRES],
  },

  // Jalons
  { pattern: /^\/milestones(\/|$)/, roles: ["ADMIN", "DIRECTION", "COORDINATOR", ...TUTEURS] },

  // Membres (le staff) : JAMAIS visible par tuteurs / stagiaires
  { pattern: /^\/members\/(create|[^/]+\/edit)\/?$/, roles: ["ADMIN", "RH"] },
  { pattern: /^\/members(\/|$)/, roles: ["ADMIN", "DIRECTION", "RH", "COORDINATOR"] },

  // Bénéficiaires
  { pattern: /^\/beneficiaries(\/|$)/, roles: ["ADMIN", "DIRECTION", "DAF", "COORDINATOR"] },

  // Évaluations : grilles et campagnes = pilotage uniquement
  { pattern: /^\/evaluations\/(grids|campaigns)(\/|$)/, roles: ["ADMIN", "DIRECTION", "COORDINATOR"] },

  // Évaluations
  { pattern: /^\/evaluations\/[^/]+\/edit\/?$/, roles: ["ADMIN", "DIRECTION", "COORDINATOR", ...TUTEURS] },
  {
    pattern: /^\/evaluations(\/|$)/,
    roles: ["ADMIN", "DIRECTION", "COORDINATOR", ...TUTEURS, ...STAGIAIRES],
  },

  // Offres de stage : la page /stages est publique (lecture) ; cette règle sert à afficher
  // les entrées « Offres de stage » / « Nouvelle offre » du menu et à ouvrir la page dans l'application.
  { pattern: /^\/stages(\/|$)/, roles: ["ADMIN", "RH", "COORDINATOR"] },

  // Stages (espace stagiaires) : invisible pour DIRECTION, DSI, DAF, COMMUNICATION
  { pattern: /^\/internships\/(create|[^/]+\/edit)\/?$/, roles: ["ADMIN", "RH", "COORDINATOR", ...TUTEURS] },
  {
    pattern: /^\/internships(\/|$)/,
    roles: ["ADMIN", "RH", "COORDINATOR", ...TUTEURS, ...STAGIAIRES],
  },

  // Rapports
  { pattern: /^\/reports(\/|$)/, roles: ["ADMIN", "DIRECTION", "DAF", "RH", "COMMUNICATION", "COORDINATOR"] },

  // IA
  { pattern: /^\/ai(\/|$)/, roles: ["ADMIN", "DIRECTION", "DSI", "COORDINATOR"] },
];

const ROLE_ALIASES: Record<string, string> = {
  DIRECTEUR: "DIRECTION",
  COORDINATEUR: "COORDINATOR",
};

export function normalizeRole(role?: string | null): string {
  const value = (role ?? "").trim().toUpperCase();
  return ROLE_ALIASES[value] ?? value;
}

/** Rôle de l'utilisateur connecté (localStorage "user"). */
export function getStoredRole(): string {
  if (typeof window === "undefined") return "";

  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "";
    return normalizeRole((JSON.parse(raw) as { role?: string }).role);
  } catch {
    return "";
  }
}

/** true si ce rôle peut ouvrir ce chemin. Chemin inconnu = refusé. */
export function canAccessPath(role: string | null | undefined, pathname: string): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) return false;

  const path = pathname.split("?")[0].split("#")[0] || "/";
  const rule = ACCESS_RULES.find((r) => r.pattern.test(path));

  if (!rule) return false;
  return rule.roles.includes("*") || rule.roles.includes(normalized);
}

/** Première page réellement accessible à ce rôle (destination du bouton « Retour » de la page 403). */
export function homePathFor(role: string | null | undefined): string {
  const candidates = ["/dashboard", "/internships", "/activities", "/notifications", "/profile"];
  return candidates.find((p) => canAccessPath(role, p)) ?? "/login";
}
