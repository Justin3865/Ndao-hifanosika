// Sélection des bénéficiaires à partir des enquêtes de mission (miroir de /api/enrollment)

export type CandidateStatus = "PENDING" | "WAITLIST" | "NOT_ELIGIBLE" | "ENROLLED";

export interface EnrollmentRule {
  projectId: number;
  enabled: boolean;
  autoEnroll: boolean;
  /** score de départ (70) */
  topScore: number;
  /** score plancher (50), baissable de 5 en 5 */
  minScore: number;
  gender: "FEMALE" | "MALE" | null;
  ageMin: number | null;
  ageMax: number | null;
  maxMonthlyIncome: number | null;
  minHouseholdSize: number | null;
  minChildrenUnder5: number | null;
  requireDisability: boolean;
  requireVulnerable: boolean;
  localityContains: string | null;
}

export interface ProjectQuota {
  projectId: number;
  name: string;
  code: string;
  status: string;
  target: number | null;
  enrolled: number;
  remaining: number | null;
  configured: boolean;
  rule: EnrollmentRule;
  waitlist: number;
  enrolledFromSurveys: number;
  /** Places du quota encore vides (alerte si > 0 une fois le plancher atteint) */
  shortfall: number;
  /** Plancher après un abaissement de 5 points (null si déjà à 0) */
  nextFloor: number | null;
  /** Ménages éligibles dont le score est entre nextFloor et le plancher actuel */
  nextFloorCount: number;
}

export interface EnrollmentOverview {
  nextBeneficiaryMatricule: string;
  totals: { surveys: number; pending: number; waitlist: number; notEligible: number; enrolled: number };
  projects: ProjectQuota[];
}

export interface EnqueteRow {
  key: string;
  kind: "CANDIDATE" | "BENEFICIARY";
  id: number;
  code: string | null;
  name: string;
  gender: string | null;
  age: number | null;
  phone: string | null;
  locality: string | null;
  vulnerable: boolean;
  hasDisability: boolean;
  householdSize: number | null;
  monthlyIncome: number | null;
  childrenUnder5: number | null;
  status: CandidateStatus;
  score: number | null;
  method: string | null;
  projectId: number | null;
  projectName: string | null;
  targetProjectName: string | null;
  waitlistRank: number | null;
  beneficiaryId: number | null;
  agentName: string;
  agentMatricule: string | null;
  beneficiaryMatricule: string | null;
  missionCode: string | null;
  surveyedAt: string;
  decision: { at?: string; projectName?: string | null; score?: number | null; reasons?: string[]; rank?: number; quota?: number; threshold?: number } | null;
}

export interface SelectionProjectResult {
  projectId: number;
  projectName: string;
  target: number | null;
  enrolled: number;
  remaining: number;
  autoEnroll: boolean;
  selected: Array<{ candidateId: number; name: string; score: number; beneficiaryId: number | null }>;
  waitlisted: number;
  ineligible: number;
  top: number;
  floor: number;
  threshold: number | null;
  shortfall: number;
  canLower: boolean;
  skipped?: string;
}

export interface SelectionSummary {
  dryRun: boolean;
  projects: SelectionProjectResult[];
  enrolledNow: number;
}

export const STATUS_LABEL: Record<CandidateStatus, string> = {
  PENDING: "En attente d'évaluation",
  WAITLIST: "Liste d'attente",
  NOT_ELIGIBLE: "Critères non remplis",
  ENROLLED: "Bénéficiaire",
};

export const STATUS_STYLE: Record<CandidateStatus, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  WAITLIST: "bg-amber-100 text-amber-800",
  NOT_ELIGIBLE: "bg-red-100 text-red-700",
  ENROLLED: "bg-green-100 text-green-700",
};

export const EMPTY_RULE = (projectId: number): EnrollmentRule => ({
  projectId,
  enabled: true,
  autoEnroll: true,
  topScore: 70,
  minScore: 50,
  gender: null,
  ageMin: null,
  ageMax: null,
  maxMonthlyIncome: null,
  minHouseholdSize: null,
  minChildrenUnder5: null,
  requireDisability: false,
  requireVulnerable: false,
  localityContains: null,
});
