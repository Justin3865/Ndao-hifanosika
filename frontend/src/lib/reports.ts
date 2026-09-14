// src/lib/reports.ts

export type ReportType =
  | "Projet"
  | "Direction"
  | "Département"
  | "Bailleur"
  | "Bénéficiaires"
  | "Équipes"
  | "Évaluation"
  | "Impact";

export type ReportStatus =
  | "Brouillon"
  | "En préparation"
  | "Généré"
  | "Validé"
  | "Envoyé";

export type ReportFormat =
  | "PDF"
  | "Excel"
  | "PDF + Excel";

export type Department =
  | "Direction"
  | "DSI"
  | "DAF"
  | "Communication"
  | "RH";

export interface ReportIndicator {
  id: string;
  label: string;
  value: number;
  target: number;
  unit: string;
  percentage: number;
}

export interface Report {
  id: string;
  reference: string;

  titre: string;
  description: string;

  type: ReportType;
  statut: ReportStatus;
  format: ReportFormat;

  projectId: string;
  projectName: string;

  department: Department | "Tous";

  bailleur: string;

  periodeDebut: string;
  periodeFin: string;

  dateCreation: string;
  dateGeneration: string;

  auteur: string;

  nombreBeneficiaires: number;
  nombreBeneficiairesActifs: number;

  tauxCompletion: number;
  tauxReussite: number;

  nombreActivites: number;
  nombreActivitesRealisees: number;

  nombreMembres: number;
  performanceEquipe: number;

  satisfaction: number;

  budgetPrevisionnel: number;
  budgetUtilise: number;

  indicateurs: ReportIndicator[];

  resumeNarratif: string;

  observations: string;

  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY =
  "ndao-hifanosika-reports";

const defaultReports: Report[] = [
  {
    id: "REP-001",
    reference: "RPT-2026-001",

    titre:
      "Rapport trimestriel Maison Digitale",

    description:
      "Rapport de suivi et d'évaluation du programme Maison Digitale.",

    type: "Projet",
    statut: "Validé",
    format: "PDF + Excel",

    projectId: "PRJ-001",
    projectName: "Maison Digitale",

    department: "Tous",

    bailleur: "Orange",

    periodeDebut: "2026-04-01",
    periodeFin: "2026-06-30",

    dateCreation: "2026-07-01",
    dateGeneration: "2026-07-03",

    auteur: "Coordinateur Projet",

    nombreBeneficiaires: 68,
    nombreBeneficiairesActifs: 52,

    tauxCompletion: 78,
    tauxReussite: 82,

    nombreActivites: 35,
    nombreActivitesRealisees: 31,

    nombreMembres: 8,
    performanceEquipe: 86,

    satisfaction: 91,

    budgetPrevisionnel: 15000000,
    budgetUtilise: 11250000,

    indicateurs: [
      {
        id: "IND-001",
        label: "Bénéficiaires actifs",
        value: 52,
        target: 60,
        unit: "personnes",
        percentage: 87,
      },
      {
        id: "IND-002",
        label: "Taux de complétion",
        value: 78,
        target: 80,
        unit: "%",
        percentage: 98,
      },
      {
        id: "IND-003",
        label: "Taux de réussite",
        value: 82,
        target: 80,
        unit: "%",
        percentage: 103,
      },
      {
        id: "IND-004",
        label: "Satisfaction",
        value: 91,
        target: 85,
        unit: "%",
        percentage: 107,
      },
    ],

    resumeNarratif:
      "Le programme Maison Digitale présente une progression satisfaisante. Le taux de complétion atteint 78 % et le taux de réussite 82 %. La satisfaction des bénéficiaires est de 91 %. Les principales activités prévues ont été réalisées au cours de la période.",

    observations:
      "La participation des bénéficiaires reste globalement satisfaisante. Un accompagnement renforcé est recommandé pour les bénéficiaires présentant un risque de décrochage.",

    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-03T08:00:00.000Z",
  },

  {
    id: "REP-002",
    reference: "RPT-2026-002",

    titre:
      "Rapport consolidé Direction S1 2026",

    description:
      "Vue consolidée des résultats des différents projets de l'organisation.",

    type: "Direction",
    statut: "Généré",
    format: "PDF",

    projectId: "ALL",
    projectName: "Tous les projets",

    department: "Direction",

    bailleur: "Tous",

    periodeDebut: "2026-01-01",
    periodeFin: "2026-06-30",

    dateCreation: "2026-07-05",
    dateGeneration: "2026-07-06",

    auteur: "Direction",

    nombreBeneficiaires: 156,
    nombreBeneficiairesActifs: 68,

    tauxCompletion: 76,
    tauxReussite: 81,

    nombreActivites: 112,
    nombreActivitesRealisees: 97,

    nombreMembres: 24,
    performanceEquipe: 84,

    satisfaction: 88,

    budgetPrevisionnel: 50000000,
    budgetUtilise: 36750000,

    indicateurs: [
      {
        id: "IND-005",
        label: "Bénéficiaires actifs",
        value: 68,
        target: 75,
        unit: "personnes",
        percentage: 91,
      },
      {
        id: "IND-006",
        label: "Taux de réussite",
        value: 81,
        target: 80,
        unit: "%",
        percentage: 101,
      },
      {
        id: "IND-007",
        label: "Performance des équipes",
        value: 84,
        target: 80,
        unit: "%",
        percentage: 105,
      },
    ],

    resumeNarratif:
      "Au premier semestre 2026, les différents programmes de Ndao Hifanosika ont enregistré une progression globale satisfaisante. Les bénéficiaires actifs représentent 68 personnes et le taux de réussite consolidé atteint 81 %.",

    observations:
      "La Direction recommande de renforcer le suivi des bénéficiaires présentant des signes de décrochage et de maintenir les campagnes d'évaluation périodiques des équipes.",

    createdAt: "2026-07-05T08:00:00.000Z",
    updatedAt: "2026-07-06T08:00:00.000Z",
  },

  {
    id: "REP-003",
    reference: "RPT-2026-003",

    titre:
      "Reporting bailleur Kids Preneur",

    description:
      "Rapport destiné au partenaire financier du programme Kids Preneur.",

    type: "Bailleur",
    statut: "En préparation",
    format: "PDF + Excel",

    projectId: "PRJ-002",
    projectName: "Kids Preneur",

    department: "Tous",

    bailleur: "Partenaire Kids Preneur",

    periodeDebut: "2026-07-01",
    periodeFin: "2026-09-30",

    dateCreation: "2026-08-01",
    dateGeneration: "",

    auteur: "Responsable S&E",

    nombreBeneficiaires: 42,
    nombreBeneficiairesActifs: 31,

    tauxCompletion: 61,
    tauxReussite: 74,

    nombreActivites: 28,
    nombreActivitesRealisees: 19,

    nombreMembres: 6,
    performanceEquipe: 79,

    satisfaction: 85,

    budgetPrevisionnel: 12000000,
    budgetUtilise: 6500000,

    indicateurs: [
      {
        id: "IND-008",
        label: "Bénéficiaires actifs",
        value: 31,
        target: 40,
        unit: "personnes",
        percentage: 78,
      },
      {
        id: "IND-009",
        label: "Taux de complétion",
        value: 61,
        target: 80,
        unit: "%",
        percentage: 76,
      },
    ],

    resumeNarratif:
      "Le programme Kids Preneur poursuit sa phase de mise en œuvre. Les activités réalisées permettent d'accompagner progressivement les bénéficiaires dans le développement de leurs compétences entrepreneuriales.",

    observations:
      "Le taux de complétion nécessite une attention particulière au cours de la prochaine période.",

    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-01T08:00:00.000Z",
  },
];

export function getReports(): Report[] {
  if (typeof window === "undefined") {
    return defaultReports;
  }

  try {
    const stored =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!stored) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(defaultReports)
      );

      return defaultReports;
    }

    return JSON.parse(
      stored
    ) as Report[];
  } catch {
    return defaultReports;
  }
}

export function saveReports(
  reports: Report[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(reports)
  );
}

export function getReportById(
  id: string
): Report | undefined {
  return getReports().find(
    (report) => report.id === id
  );
}

export function createReport(
  data: Omit<
    Report,
    | "id"
    | "reference"
    | "createdAt"
    | "updatedAt"
  >
): Report {
  const reports = getReports();

  const number =
    reports.length + 1;

  const now =
    new Date().toISOString();

  const report: Report = {
    ...data,

    id: `REP-${String(
      number
    ).padStart(3, "0")}`,

    reference: `RPT-2026-${String(
      number
    ).padStart(3, "0")}`,

    createdAt: now,
    updatedAt: now,
  };

  saveReports([
    ...reports,
    report,
  ]);

  return report;
}

export function updateReport(
  id: string,
  data: Partial<Report>
): Report | undefined {
  const reports = getReports();

  let updated:
    | Report
    | undefined;

  const newReports =
    reports.map((report) => {
      if (report.id !== id) {
        return report;
      }

      updated = {
        ...report,
        ...data,
        updatedAt:
          new Date().toISOString(),
      };

      return updated;
    });

  saveReports(newReports);

  return updated;
}

export function deleteReport(
  id: string
): void {
  const reports = getReports();

  saveReports(
    reports.filter(
      (report) =>
        report.id !== id
    )
  );
}

export function formatDate(
  date: string
): string {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(new Date(date));
}

export function formatCurrency(
  value: number
): string {
  return new Intl.NumberFormat(
    "fr-FR"
  ).format(value) + " Ar";
}

export function calculateBudgetRate(
  report: Report
): number {
  if (
    report.budgetPrevisionnel <= 0
  ) {
    return 0;
  }

  return Math.round(
    (report.budgetUtilise /
      report.budgetPrevisionnel) *
      100
  );
}