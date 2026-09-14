// src/lib/evaluations.ts

export type EvaluationTarget =
  | "Membre"
  | "Stagiaire"
  | "Bénéficiaire";

export type EvaluationType =
  | "Auto-évaluation"
  | "Évaluation responsable"
  | "Évaluation tuteur"
  | "Évaluation bénéficiaire"
  | "Évaluation croisée";

export type EvaluationPeriod =
  | "Mensuelle"
  | "Trimestrielle"
  | "Semestrielle"
  | "Fin de mission"
  | "Ponctuelle";

export type EvaluationStatus =
  | "Brouillon"
  | "En cours"
  | "Terminée"
  | "En retard";

export type EvaluationResultStatus =
  | "Non évalué"
  | "En cours"
  | "Évalué"
  | "Validé";

export interface EvaluationCriterion {
  id: string;
  label: string;
  description: string;
  weight: number;
  maxScore: number;
}

export interface EvaluationGrid {
  id: string;
  code: string;
  name: string;
  description: string;
  target: EvaluationTarget;
  programme?: string;
  criteria: EvaluationCriterion[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationCampaign {
  id: string;
  code: string;
  name: string;
  description: string;
  target: EvaluationTarget;
  type: EvaluationType;
  period: EvaluationPeriod;
  gridId: string;
  gridName: string;
  projectId?: string;
  projectName?: string;
  startDate: string;
  endDate: string;
  status: EvaluationStatus;
  expectedCount: number;
  completedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationScore {
  criterionId: string;
  criterionLabel: string;
  score: number;
  maxScore: number;
  comment: string;
}

export interface Evaluation {
  id: string;
  code: string;

  target: EvaluationTarget;

  subjectId: string;
  subjectName: string;

  evaluatorId: string;
  evaluatorName: string;
  evaluatorRole: string;

  campaignId: string;
  campaignName: string;

  gridId: string;
  gridName: string;

  projectId?: string;
  projectName?: string;

  type: EvaluationType;

  dateEvaluation: string;
  status: EvaluationResultStatus;

  scores: EvaluationScore[];

  totalScore: number;
  maxScore: number;
  percentage: number;

  appreciation: string;
  strengths: string[];
  improvementAreas: string[];

  validatedBy?: string;
  validatedAt?: string;

  createdAt: string;
  updatedAt: string;
}

const GRID_STORAGE_KEY =
  "ndao-hifanosika-evaluation-grids";

const CAMPAIGN_STORAGE_KEY =
  "ndao-hifanosika-evaluation-campaigns";

const EVALUATION_STORAGE_KEY =
  "ndao-hifanosika-evaluations";

const defaultGrids: EvaluationGrid[] = [
  {
    id: "GRID-001",
    code: "GRILLE-MEM-01",
    name: "Évaluation périodique des membres",
    description:
      "Évaluation des objectifs, compétences et performance des membres.",
    target: "Membre",
    criteria: [
      {
        id: "CRIT-001",
        label: "Atteinte des objectifs",
        description:
          "Niveau de réalisation des objectifs individuels.",
        weight: 30,
        maxScore: 5,
      },
      {
        id: "CRIT-002",
        label: "Compétences professionnelles",
        description:
          "Maîtrise des compétences liées au poste.",
        weight: 25,
        maxScore: 5,
      },
      {
        id: "CRIT-003",
        label: "Qualité du travail",
        description:
          "Qualité et fiabilité des travaux réalisés.",
        weight: 20,
        maxScore: 5,
      },
      {
        id: "CRIT-004",
        label: "Travail en équipe",
        description:
          "Collaboration avec les autres membres.",
        weight: 15,
        maxScore: 5,
      },
      {
        id: "CRIT-005",
        label: "Ponctualité",
        description:
          "Respect des délais et engagements.",
        weight: 10,
        maxScore: 5,
      },
    ],
    active: true,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },

  {
    id: "GRID-002",
    code: "GRILLE-STAGE-01",
    name: "Grille d'évaluation de stage L3/M2",
    description:
      "Évaluation du stagiaire par le tuteur et suivi des livrables.",
    target: "Stagiaire",
    criteria: [
      {
        id: "CRIT-101",
        label: "Compréhension du sujet",
        description:
          "Compréhension du contexte et du sujet de stage.",
        weight: 20,
        maxScore: 5,
      },
      {
        id: "CRIT-102",
        label: "Compétences techniques",
        description:
          "Maîtrise des outils et méthodes nécessaires.",
        weight: 25,
        maxScore: 5,
      },
      {
        id: "CRIT-103",
        label: "Qualité des livrables",
        description:
          "Qualité des travaux et livrables déposés.",
        weight: 25,
        maxScore: 5,
      },
      {
        id: "CRIT-104",
        label: "Autonomie",
        description:
          "Capacité à travailler de manière autonome.",
        weight: 15,
        maxScore: 5,
      },
      {
        id: "CRIT-105",
        label: "Présentation finale",
        description:
          "Qualité de la présentation et de la soutenance.",
        weight: 15,
        maxScore: 5,
      },
    ],
    active: true,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },

  {
    id: "GRID-003",
    code: "GRILLE-MD-01",
    name: "Maison Digitale",
    description:
      "Évaluation des compétences numériques acquises.",
    target: "Bénéficiaire",
    programme: "Maison Digitale",
    criteria: [
      {
        id: "CRIT-201",
        label: "Compétences numériques",
        description:
          "Maîtrise des compétences numériques.",
        weight: 40,
        maxScore: 5,
      },
      {
        id: "CRIT-202",
        label: "Participation",
        description:
          "Participation aux sessions.",
        weight: 20,
        maxScore: 5,
      },
      {
        id: "CRIT-203",
        label: "Progression",
        description:
          "Progression du bénéficiaire.",
        weight: 20,
        maxScore: 5,
      },
      {
        id: "CRIT-204",
        label: "Satisfaction",
        description:
          "Satisfaction vis-à-vis du programme.",
        weight: 20,
        maxScore: 5,
      },
    ],
    active: true,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },

  {
    id: "GRID-004",
    code: "GRILLE-KP-01",
    name: "Kids Preneur",
    description:
      "Évaluation des compétences entrepreneuriales.",
    target: "Bénéficiaire",
    programme: "Kids Preneur",
    criteria: [
      {
        id: "CRIT-301",
        label: "Esprit entrepreneurial",
        description:
          "Compréhension des principes entrepreneuriaux.",
        weight: 30,
        maxScore: 5,
      },
      {
        id: "CRIT-302",
        label: "Créativité",
        description:
          "Capacité à proposer des idées.",
        weight: 25,
        maxScore: 5,
      },
      {
        id: "CRIT-303",
        label: "Travail en équipe",
        description:
          "Collaboration et communication.",
        weight: 20,
        maxScore: 5,
      },
      {
        id: "CRIT-304",
        label: "Présentation du projet",
        description:
          "Capacité à présenter une idée ou un projet.",
        weight: 25,
        maxScore: 5,
      },
    ],
    active: true,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },

  {
    id: "GRID-005",
    code: "GRILLE-OT-01",
    name: "Otrikasa",
    description:
      "Évaluation de la maturité du projet incubé.",
    target: "Bénéficiaire",
    programme: "Otrikasa",
    criteria: [
      {
        id: "CRIT-401",
        label: "Maturité du projet",
        description:
          "Niveau de maturité du projet.",
        weight: 30,
        maxScore: 5,
      },
      {
        id: "CRIT-402",
        label: "Plan d'affaires",
        description:
          "Qualité du business plan.",
        weight: 25,
        maxScore: 5,
      },
      {
        id: "CRIT-403",
        label: "Modèle économique",
        description:
          "Viabilité du modèle économique.",
        weight: 20,
        maxScore: 5,
      },
      {
        id: "CRIT-404",
        label: "Chiffre d'affaires",
        description:
          "Évolution du chiffre d'affaires généré.",
        weight: 25,
        maxScore: 5,
      },
    ],
    active: true,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
];

const defaultCampaigns: EvaluationCampaign[] = [
  {
    id: "CAMP-001",
    code: "CAMP-T3-2026",
    name: "Évaluation trimestrielle T3 2026",
    description:
      "Campagne d'évaluation trimestrielle des membres.",
    target: "Membre",
    type: "Évaluation responsable",
    period: "Trimestrielle",
    gridId: "GRID-001",
    gridName: "Évaluation périodique des membres",
    startDate: "2026-07-01",
    endDate: "2026-09-30",
    status: "En cours",
    expectedCount: 20,
    completedCount: 14,
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-08-20T08:00:00.000Z",
  },

  {
    id: "CAMP-002",
    code: "CAMP-STAGE-2026",
    name: "Évaluation des stagiaires 2026",
    description:
      "Évaluation finale des stagiaires L3/M2.",
    target: "Stagiaire",
    type: "Évaluation tuteur",
    period: "Fin de mission",
    gridId: "GRID-002",
    gridName: "Grille d'évaluation de stage L3/M2",
    startDate: "2026-08-01",
    endDate: "2026-09-30",
    status: "En cours",
    expectedCount: 8,
    completedCount: 5,
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-25T08:00:00.000Z",
  },

  {
    id: "CAMP-003",
    code: "CAMP-MD-T3",
    name: "Maison Digitale T3 2026",
    description:
      "Évaluation des bénéficiaires Maison Digitale.",
    target: "Bénéficiaire",
    type: "Évaluation bénéficiaire",
    period: "Trimestrielle",
    gridId: "GRID-003",
    gridName: "Maison Digitale",
    projectId: "PRJ-001",
    projectName: "Maison Digitale",
    startDate: "2026-07-01",
    endDate: "2026-09-30",
    status: "En cours",
    expectedCount: 50,
    completedCount: 36,
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-08-25T08:00:00.000Z",
  },
];

const defaultEvaluations: Evaluation[] = [
  {
    id: "EVAL-001",
    code: "EVAL-2026-001",
    target: "Membre",
    subjectId: "MEM-001",
    subjectName: "RAKOTO Mialy",
    evaluatorId: "USR-001",
    evaluatorName: "Responsable RH",
    evaluatorRole: "RH",
    campaignId: "CAMP-001",
    campaignName: "Évaluation trimestrielle T3 2026",
    gridId: "GRID-001",
    gridName: "Évaluation périodique des membres",
    type: "Évaluation responsable",
    dateEvaluation: "2026-08-20",
    status: "Validé",
    scores: [
      {
        criterionId: "CRIT-001",
        criterionLabel: "Atteinte des objectifs",
        score: 4.5,
        maxScore: 5,
        comment: "Objectifs largement atteints.",
      },
      {
        criterionId: "CRIT-002",
        criterionLabel: "Compétences professionnelles",
        score: 4,
        maxScore: 5,
        comment: "Bon niveau.",
      },
      {
        criterionId: "CRIT-003",
        criterionLabel: "Qualité du travail",
        score: 4.5,
        maxScore: 5,
        comment: "Travail de qualité.",
      },
    ],
    totalScore: 13,
    maxScore: 15,
    percentage: 87,
    appreciation:
      "Très bonne performance générale.",
    strengths: [
      "Autonomie",
      "Qualité du travail",
      "Respect des délais",
    ],
    improvementAreas: [
      "Développer les compétences de leadership",
    ],
    validatedBy: "Direction",
    validatedAt: "2026-08-22T08:00:00.000Z",
    createdAt: "2026-08-20T08:00:00.000Z",
    updatedAt: "2026-08-22T08:00:00.000Z",
  },
];

export function getEvaluationGrids(): EvaluationGrid[] {
  if (typeof window === "undefined") {
    return defaultGrids;
  }

  try {
    const data = localStorage.getItem(
      GRID_STORAGE_KEY
    );

    if (!data) {
      localStorage.setItem(
        GRID_STORAGE_KEY,
        JSON.stringify(defaultGrids)
      );

      return defaultGrids;
    }

    return JSON.parse(data);
  } catch {
    return defaultGrids;
  }
}

export function saveEvaluationGrids(
  data: EvaluationGrid[]
) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    GRID_STORAGE_KEY,
    JSON.stringify(data)
  );
}

export function getEvaluationCampaigns(): EvaluationCampaign[] {
  if (typeof window === "undefined") {
    return defaultCampaigns;
  }

  try {
    const data = localStorage.getItem(
      CAMPAIGN_STORAGE_KEY
    );

    if (!data) {
      localStorage.setItem(
        CAMPAIGN_STORAGE_KEY,
        JSON.stringify(defaultCampaigns)
      );

      return defaultCampaigns;
    }

    return JSON.parse(data);
  } catch {
    return defaultCampaigns;
  }
}

export function saveEvaluationCampaigns(
  data: EvaluationCampaign[]
) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    CAMPAIGN_STORAGE_KEY,
    JSON.stringify(data)
  );
}

export function getEvaluations(): Evaluation[] {
  if (typeof window === "undefined") {
    return defaultEvaluations;
  }

  try {
    const data = localStorage.getItem(
      EVALUATION_STORAGE_KEY
    );

    if (!data) {
      localStorage.setItem(
        EVALUATION_STORAGE_KEY,
        JSON.stringify(defaultEvaluations)
      );

      return defaultEvaluations;
    }

    return JSON.parse(data);
  } catch {
    return defaultEvaluations;
  }
}

export function saveEvaluations(
  data: Evaluation[]
) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    EVALUATION_STORAGE_KEY,
    JSON.stringify(data)
  );
}

export function getEvaluationById(
  id: string
) {
  return getEvaluations().find(
    (evaluation) => evaluation.id === id
  );
}

export function createEvaluation(
  data: Omit<
    Evaluation,
    "id" | "code" | "createdAt" | "updatedAt"
  >
) {
  const evaluations = getEvaluations();

  const number =
    evaluations.length + 1;

  const now =
    new Date().toISOString();

  const evaluation: Evaluation = {
    ...data,
    id: `EVAL-${String(number).padStart(3, "0")}`,
    code: `EVAL-2026-${String(number).padStart(3, "0")}`,
    createdAt: now,
    updatedAt: now,
  };

  saveEvaluations([
    ...evaluations,
    evaluation,
  ]);

  return evaluation;
}

export function updateEvaluation(
  id: string,
  data: Partial<Evaluation>
) {
  const evaluations = getEvaluations();

  const updated = evaluations.map(
    (evaluation) =>
      evaluation.id === id
        ? {
            ...evaluation,
            ...data,
            updatedAt:
              new Date().toISOString(),
          }
        : evaluation
  );

  saveEvaluations(updated);

  return updated.find(
    (evaluation) =>
      evaluation.id === id
  );
}

export function deleteEvaluation(
  id: string
) {
  const evaluations = getEvaluations();

  saveEvaluations(
    evaluations.filter(
      (evaluation) =>
        evaluation.id !== id
    )
  );
}

export function calculateEvaluationPercentage(
  total: number,
  max: number
) {
  if (max <= 0) return 0;

  return Math.round(
    (total / max) * 100
  );
}

export function getEvaluationMention(
  percentage: number
) {
  if (percentage >= 90) {
    return "Excellent";
  }

  if (percentage >= 80) {
    return "Très satisfaisant";
  }

  if (percentage >= 70) {
    return "Satisfaisant";
  }

  if (percentage >= 60) {
    return "À améliorer";
  }

  return "Insuffisant";
}

export function formatDate(
  date: string
) {
  if (!date) return "—";

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(new Date(date));
}