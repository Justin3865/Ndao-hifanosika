// src/lib/validators.ts
import { z } from "zod";

// ----- Validation des emails -----
export const emailSchema = z.string()
  .min(1, "L'email est requis")
  .email("Email invalide")
  .max(255, "L'email est trop long");

// ----- Validation des mots de passe -----
export const passwordSchema = z.string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .max(100, "Le mot de passe est trop long")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
  .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre");

// ----- Validation des noms -----
export const nameSchema = z.string()
  .min(1, "Le nom est requis")
  .max(100, "Le nom est trop long")
  .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Le nom contient des caractères invalides");

// ----- Validation des téléphones -----
export const phoneSchema = z.string()
  .optional()
  .refine(
    (val) => !val || /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(val),
    "Numéro de téléphone invalide"
  );

// ----- Validation des URLs -----
export const urlSchema = z.string()
  .optional()
  .refine(
    (val) => !val || /^https?:\/\/[^\s]+$/.test(val),
    "URL invalide"
  );

// ----- Validation des dates -----
export const dateSchema = z.string()
  .min(1, "La date est requise")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)");

export const dateRangeSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
}).refine((data) => data.endDate >= data.startDate, {
  message: "La date de fin doit être postérieure à la date de début",
  path: ["endDate"],
});

// ----- Validation des nombres -----
export const positiveNumberSchema = z.number()
  .min(0, "Le nombre doit être positif")
  .max(999999999, "Le nombre est trop grand");

export const percentageSchema = z.number()
  .min(0, "Le pourcentage doit être entre 0 et 100")
  .max(100, "Le pourcentage doit être entre 0 et 100");

// ----- Validation des IDs -----
export const idSchema = z.string()
  .min(1, "L'ID est requis")
  .regex(/^[a-zA-Z0-9_-]+$/, "ID invalide");

// ----- Schémas de validation -----

// Authentification
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Le mot de passe est requis"),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, "La confirmation du mot de passe est requise"),
  phone: phoneSchema,
  role: z.string().optional(),
  department: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, "La confirmation du mot de passe est requise"),
  token: z.string().min(1, "Le token est requis"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, "La confirmation du mot de passe est requise"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// Utilisateurs
export const userSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  role: z.string().min(1, "Le rôle est requis"),
  department: z.string().min(1, "Le département est requis"),
  position: z.string().optional(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
});

export const userCreateSchema = userSchema.extend({
  password: passwordSchema,
  confirmPassword: z.string().min(1, "La confirmation du mot de passe est requise"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// Départements
export const departementSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100, "Le nom est trop long"),
  description: z.string().min(1, "La description est requise"),
  chef: nameSchema,
  chefEmail: emailSchema,
  projects: z.array(z.string()).optional(),
});

// Projets
export const projectSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200, "Le nom est trop long"),
  description: z.string().min(1, "La description est requise"),
  donor: z.string().min(1, "Le bailleur est requis"),
  startDate: dateSchema,
  endDate: dateSchema,
  budget: positiveNumberSchema.optional(),
  objectives: z.array(z.string()).optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "La date de fin doit être postérieure à la date de début",
  path: ["endDate"],
});

// Activités
export const activitySchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200, "Le titre est trop long"),
  description: z.string().min(1, "La description est requise"),
  projectId: idSchema,
  date: dateSchema,
  time: z.string().regex(/^\d{2}:\d{2}$/, "Format d'heure invalide"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format d'heure invalide"),
  location: z.string().optional(),
  type: z.enum(["formation", "atelier", "reunion", "suivi", "autre"]),
  participants: positiveNumberSchema,
  organizer: nameSchema,
  objectives: z.array(z.string()).optional(),
}).refine((data) => data.endTime > data.time, {
  message: "L'heure de fin doit être postérieure à l'heure de début",
  path: ["endTime"],
});

// Jalons
export const milestoneSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200, "Le titre est trop long"),
  description: z.string().min(1, "La description est requise"),
  projectId: idSchema,
  targetDate: dateSchema,
  objectives: z.array(z.string()).optional(),
  deliverables: z.array(z.string()).optional(),
});

// Membres
export const memberSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  position: z.string().min(1, "Le poste est requis"),
  departmentId: idSchema,
  type: z.enum(["salarie", "stagiaire", "benevole"]),
  joinDate: dateSchema,
  skills: z.array(z.string()).optional(),
  objectives: z.array(z.string()).optional(),
});

// Bénéficiaires
export const beneficiarySchema = z.object({
  name: nameSchema,
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  age: z.number()
    .min(0, "L'âge doit être positif")
    .max(120, "L'âge doit être inférieur à 120"),
  gender: z.enum(["F", "M"]),
  programId: idSchema,
  vulnerability: z.enum(["enfant", "femme", "jeune", "handicap", "aucune"]),
  address: z.string().optional(),
  education: z.string().optional(),
  joinDate: dateSchema,
  skills: z.array(z.string()).optional(),
  objectives: z.array(z.string()).optional(),
});

// Évaluations
export const evaluationSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  type: z.enum(["membre", "stagiaire", "beneficiaire"]),
  targetId: idSchema,
  evaluatorId: idSchema,
  gridId: idSchema,
  period: z.string().min(1, "La période est requise"),
  dueDate: dateSchema,
});

export const evaluationScoreSchema = z.object({
  criteriaId: idSchema,
  score: z.number().min(0).max(20),
  comment: z.string().optional(),
});

export const evaluationGridSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  type: z.enum(["membre", "stagiaire", "beneficiaire"]),
  criteria: z.array(z.object({
    name: z.string().min(1, "Le nom du critère est requis"),
    maxScore: z.number().min(1, "La note maximale doit être supérieure à 0"),
    weight: z.number().min(0, "Le poids doit être positif").max(100, "Le poids doit être inférieur à 100"),
    description: z.string().optional(),
  })).min(1, "Au moins un critère est requis"),
}).refine((data) => {
  const totalWeight = data.criteria.reduce((sum, c) => sum + c.weight, 0);
  return totalWeight === 100;
}, {
  message: "La somme des poids doit être égale à 100%",
  path: ["criteria"],
});

// Stages
export const internshipSchema = z.object({
  studentName: nameSchema,
  studentEmail: emailSchema,
  studentPhone: phoneSchema.optional(),
  tutorId: idSchema,
  level: z.enum(["L3", "M2"]),
  establishment: z.string().min(1, "L'établissement est requis"),
  establishmentAddress: z.string().optional(),
  subject: z.string().min(1, "Le sujet est requis"),
  departmentId: idSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  objectives: z.array(z.string()).optional(),
  deliverables: z.array(z.string()).optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "La date de fin doit être postérieure à la date de début",
  path: ["endDate"],
});

export const internshipEvaluationSchema = z.object({
  criteria: z.array(z.object({
    id: idSchema,
    score: z.number().min(0).max(20),
  })),
  comments: z.string().optional(),
  recommendations: z.string().optional(),
});

// Rapports
export const reportSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  type: z.enum(["projet", "beneficiaire", "membre", "global", "bailleur"]),
  projectId: idSchema.optional(),
  period: z.string().min(1, "La période est requise"),
  description: z.string().optional(),
  format: z.enum(["pdf", "excel", "word"]),
  sections: z.array(z.object({
    title: z.string().min(1, "Le titre de la section est requis"),
    content: z.string().optional(),
  })).min(1, "Au moins une section est requise"),
  includeCharts: z.boolean().optional(),
  includeMetrics: z.boolean().optional(),
});

// Notifications
export const notificationSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  message: z.string().min(1, "Le message est requis"),
  type: z.enum(["info", "success", "warning", "error", "reminder"]),
  category: z.enum(["evaluation", "project", "report", "member", "beneficiary", "ai", "system"]),
  userId: idSchema,
  actionUrl: z.string().optional(),
  actionLabel: z.string().optional(),
  sender: z.string().optional(),
});

// IA
export const aiDropoutRiskSchema = z.object({
  beneficiaryId: idSchema,
  data: z.object({
    presence: z.array(z.number()),
    progression: z.array(z.number()),
    evaluations: z.array(z.number()),
    socioEconomic: z.record(z.any()).optional(),
  }),
});

export const aiPerformanceScoreSchema = z.object({
  memberId: idSchema,
  data: z.object({
    evaluations: z.array(z.object({
      date: z.string(),
      score: z.number(),
      weight: z.number(),
    })),
    skills: z.array(z.string()),
    objectives: z.array(z.string()),
  }),
});

export const aiSummarySchema = z.object({
  projectId: idSchema,
  period: z.object({
    from: z.string(),
    to: z.string(),
  }),
  data: z.object({
    activities: z.array(z.any()),
    beneficiaries: z.array(z.any()),
    milestones: z.array(z.any()),
    evaluations: z.array(z.any()),
  }),
});

export const aiAnomalyDetectionSchema = z.object({
  entityType: z.enum(["beneficiary", "member", "project", "activity", "evaluation"]),
  data: z.array(z.any()),
});

// Types inférés
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type UserCreateFormData = z.infer<typeof userCreateSchema>;
export type DepartementFormData = z.infer<typeof departementSchema>;
export type ProjectFormData = z.infer<typeof projectSchema>;
export type ActivityFormData = z.infer<typeof activitySchema>;
export type MilestoneFormData = z.infer<typeof milestoneSchema>;
export type MemberFormData = z.infer<typeof memberSchema>;
export type BeneficiaryFormData = z.infer<typeof beneficiarySchema>;
export type EvaluationFormData = z.infer<typeof evaluationSchema>;
export type EvaluationScoreFormData = z.infer<typeof evaluationScoreSchema>;
export type EvaluationGridFormData = z.infer<typeof evaluationGridSchema>;
export type InternshipFormData = z.infer<typeof internshipSchema>;
export type InternshipEvaluationFormData = z.infer<typeof internshipEvaluationSchema>;
export type ReportFormData = z.infer<typeof reportSchema>;
export type NotificationFormData = z.infer<typeof notificationSchema>;
export type AiDropoutRiskFormData = z.infer<typeof aiDropoutRiskSchema>;
export type AiPerformanceScoreFormData = z.infer<typeof aiPerformanceScoreSchema>;
export type AiSummaryFormData = z.infer<typeof aiSummarySchema>;
export type AiAnomalyDetectionFormData = z.infer<typeof aiAnomalyDetectionSchema>;