// src/lib/permissions.ts
// Définition des permissions par module

export const Permissions = {
  // Utilisateurs
  USERS_READ: "users.read",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",
  USERS_MANAGE: "users.manage",

  // Départements
  DEPARTEMENTS_READ: "departements.read",
  DEPARTEMENTS_CREATE: "departements.create",
  DEPARTEMENTS_EDIT: "departements.edit",
  DEPARTEMENTS_DELETE: "departements.delete",

  // Projets
  PROJECTS_READ: "projects.read",
  PROJECTS_CREATE: "projects.create",
  PROJECTS_EDIT: "projects.edit",
  PROJECTS_DELETE: "projects.delete",
  PROJECTS_MANAGE: "projects.manage",

  // Activités
  ACTIVITIES_READ: "activities.read",
  ACTIVITIES_CREATE: "activities.create",
  ACTIVITIES_EDIT: "activities.edit",
  ACTIVITIES_DELETE: "activities.delete",

  // Jalons
  MILESTONES_READ: "milestones.read",
  MILESTONES_CREATE: "milestones.create",
  MILESTONES_EDIT: "milestones.edit",
  MILESTONES_DELETE: "milestones.delete",

  // Membres
  MEMBERS_READ: "members.read",
  MEMBERS_CREATE: "members.create",
  MEMBERS_EDIT: "members.edit",
  MEMBERS_DELETE: "members.delete",
  MEMBERS_EVALUATE: "members.evaluate",

  // Bénéficiaires
  BENEFICIARIES_READ: "beneficiaries.read",
  BENEFICIARIES_CREATE: "beneficiaries.create",
  BENEFICIARIES_EDIT: "beneficiaries.edit",
  BENEFICIARIES_DELETE: "beneficiaries.delete",
  BENEFICIARIES_EVALUATE: "beneficiaries.evaluate",

  // Évaluations
  EVALUATIONS_READ: "evaluations.read",
  EVALUATIONS_CREATE: "evaluations.create",
  EVALUATIONS_EDIT: "evaluations.edit",
  EVALUATIONS_DELETE: "evaluations.delete",
  EVALUATIONS_MANAGE: "evaluations.manage",

  // Stages
  INTERNSHIPS_READ: "internships.read",
  INTERNSHIPS_CREATE: "internships.create",
  INTERNSHIPS_EDIT: "internships.edit",
  INTERNSHIPS_DELETE: "internships.delete",
  INTERNSHIPS_EVALUATE: "internships.evaluate",

  // Rapports
  REPORTS_READ: "reports.read",
  REPORTS_CREATE: "reports.create",
  REPORTS_EDIT: "reports.edit",
  REPORTS_DELETE: "reports.delete",
  REPORTS_EXPORT: "reports.export",

  // IA
  AI_READ: "ai.read",
  AI_MANAGE: "ai.manage",

  // Paramètres
  SETTINGS_READ: "settings.read",
  SETTINGS_EDIT: "settings.edit",
  SETTINGS_MANAGE: "settings.manage",

  // Notifications
  NOTIFICATIONS_READ: "notifications.read",
  NOTIFICATIONS_CREATE: "notifications.create",
  NOTIFICATIONS_MANAGE: "notifications.manage",
};

// Définition des rôles avec leurs permissions
export const RolePermissions = {
  admin: [
    Permissions.USERS_READ,
    Permissions.USERS_CREATE,
    Permissions.USERS_EDIT,
    Permissions.USERS_DELETE,
    Permissions.USERS_MANAGE,
    Permissions.DEPARTEMENTS_READ,
    Permissions.DEPARTEMENTS_CREATE,
    Permissions.DEPARTEMENTS_EDIT,
    Permissions.DEPARTEMENTS_DELETE,
    Permissions.PROJECTS_READ,
    Permissions.PROJECTS_CREATE,
    Permissions.PROJECTS_EDIT,
    Permissions.PROJECTS_DELETE,
    Permissions.PROJECTS_MANAGE,
    Permissions.ACTIVITIES_READ,
    Permissions.ACTIVITIES_CREATE,
    Permissions.ACTIVITIES_EDIT,
    Permissions.ACTIVITIES_DELETE,
    Permissions.MILESTONES_READ,
    Permissions.MILESTONES_CREATE,
    Permissions.MILESTONES_EDIT,
    Permissions.MILESTONES_DELETE,
    Permissions.MEMBERS_READ,
    Permissions.MEMBERS_CREATE,
    Permissions.MEMBERS_EDIT,
    Permissions.MEMBERS_DELETE,
    Permissions.MEMBERS_EVALUATE,
    Permissions.BENEFICIARIES_READ,
    Permissions.BENEFICIARIES_CREATE,
    Permissions.BENEFICIARIES_EDIT,
    Permissions.BENEFICIARIES_DELETE,
    Permissions.BENEFICIARIES_EVALUATE,
    Permissions.EVALUATIONS_READ,
    Permissions.EVALUATIONS_CREATE,
    Permissions.EVALUATIONS_EDIT,
    Permissions.EVALUATIONS_DELETE,
    Permissions.EVALUATIONS_MANAGE,
    Permissions.INTERNSHIPS_READ,
    Permissions.INTERNSHIPS_CREATE,
    Permissions.INTERNSHIPS_EDIT,
    Permissions.INTERNSHIPS_DELETE,
    Permissions.INTERNSHIPS_EVALUATE,
    Permissions.REPORTS_READ,
    Permissions.REPORTS_CREATE,
    Permissions.REPORTS_EDIT,
    Permissions.REPORTS_DELETE,
    Permissions.REPORTS_EXPORT,
    Permissions.AI_READ,
    Permissions.AI_MANAGE,
    Permissions.SETTINGS_READ,
    Permissions.SETTINGS_EDIT,
    Permissions.SETTINGS_MANAGE,
    Permissions.NOTIFICATIONS_READ,
    Permissions.NOTIFICATIONS_CREATE,
    Permissions.NOTIFICATIONS_MANAGE,
  ],
  directeur: [
    Permissions.PROJECTS_READ,
    Permissions.PROJECTS_CREATE,
    Permissions.PROJECTS_EDIT,
    Permissions.MEMBERS_READ,
    Permissions.BENEFICIARIES_READ,
    Permissions.EVALUATIONS_READ,
    Permissions.REPORTS_READ,
    Permissions.REPORTS_CREATE,
    Permissions.REPORTS_EXPORT,
    Permissions.NOTIFICATIONS_READ,
  ],
  rh: [
    Permissions.MEMBERS_READ,
    Permissions.MEMBERS_CREATE,
    Permissions.MEMBERS_EDIT,
    Permissions.MEMBERS_EVALUATE,
    Permissions.BENEFICIARIES_READ,
    Permissions.EVALUATIONS_READ,
    Permissions.EVALUATIONS_CREATE,
    Permissions.EVALUATIONS_EDIT,
    Permissions.INTERNSHIPS_READ,
    Permissions.INTERNSHIPS_CREATE,
    Permissions.INTERNSHIPS_EDIT,
    Permissions.INTERNSHIPS_EVALUATE,
    Permissions.REPORTS_READ,
    Permissions.NOTIFICATIONS_READ,
  ],
  daf: [
    Permissions.PROJECTS_READ,
    Permissions.REPORTS_READ,
    Permissions.REPORTS_CREATE,
    Permissions.REPORTS_EXPORT,
    Permissions.NOTIFICATIONS_READ,
  ],
  communication: [
    Permissions.PROJECTS_READ,
    Permissions.BENEFICIARIES_READ,
    Permissions.REPORTS_READ,
    Permissions.NOTIFICATIONS_READ,
  ],
  coordinateur: [
    Permissions.PROJECTS_READ,
    Permissions.PROJECTS_CREATE,
    Permissions.PROJECTS_EDIT,
    Permissions.ACTIVITIES_READ,
    Permissions.ACTIVITIES_CREATE,
    Permissions.ACTIVITIES_EDIT,
    Permissions.MILESTONES_READ,
    Permissions.MILESTONES_CREATE,
    Permissions.MILESTONES_EDIT,
    Permissions.MEMBERS_READ,
    Permissions.BENEFICIARIES_READ,
    Permissions.BENEFICIARIES_CREATE,
    Permissions.BENEFICIARIES_EDIT,
    Permissions.BENEFICIARIES_EVALUATE,
    Permissions.EVALUATIONS_READ,
    Permissions.EVALUATIONS_CREATE,
    Permissions.REPORTS_READ,
    Permissions.NOTIFICATIONS_READ,
  ],
  tuteur: [
    Permissions.MEMBERS_READ,
    Permissions.MEMBERS_EVALUATE,
    Permissions.INTERNSHIPS_READ,
    Permissions.INTERNSHIPS_EVALUATE,
    Permissions.BENEFICIARIES_READ,
    Permissions.EVALUATIONS_READ,
    Permissions.NOTIFICATIONS_READ,
  ],
  stagiaire: [
    Permissions.MEMBERS_READ,
    Permissions.BENEFICIARIES_READ,
    Permissions.EVALUATIONS_READ,
    Permissions.NOTIFICATIONS_READ,
  ],
};

// Vérifier si un utilisateur a une permission
export const hasPermissionForRole = (role: string, permission: string): boolean => {
  const permissions = RolePermissions[role as keyof typeof RolePermissions] || [];
  return permissions.includes(permission);
};

// Obtenir toutes les permissions d'un rôle
export const getPermissionsForRole = (role: string): string[] => {
  return RolePermissions[role as keyof typeof RolePermissions] || [];
};