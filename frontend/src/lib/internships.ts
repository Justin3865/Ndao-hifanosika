"use client";

export type InternshipStatus =
  | "En attente"
  | "En cours"
  | "Terminé"
  | "Annulé";

export type InternshipType =
  | "Académique"
  | "Professionnel"
  | "Stage de fin d'études"
  | "Stage d'observation";

export interface InternshipEvaluation {
  id: string;
  internshipId: string;
  technicalSkills: number;
  communication: number;
  teamwork: number;
  punctuality: number;
  autonomy: number;
  overallScore: number;
  comments: string;
  evaluator: string;
  evaluationDate: string;
}

export interface Internship {
  id: string;
  reference: string;

  internName: string;
  internEmail: string;
  phone: string;

  institution: string;
  level: string;
  field: string;

  type: InternshipType;

  department: string;
  supervisor: string;

  projectId?: string;
  projectName?: string;

  startDate: string;
  endDate: string;

  status: InternshipStatus;

  objectives: string;
  tasks: string;

  evaluation?: InternshipEvaluation;

  certificateIssued: boolean;
  certificateNumber?: string;

  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "ndao-hifanosika-internships";

const DEFAULT_INTERNSHIPS: Internship[] = [
  {
    id: "INT-001",
    reference: "STG-2026-001",

    internName: "Rakoto Andry",
    internEmail: "andry@example.com",
    phone: "+261 34 00 000 01",

    institution: "Université de Fianarantsoa",
    level: "Master 2",
    field: "Informatique",

    type: "Stage de fin d'études",

    department: "DSI",
    supervisor: "Responsable DSI",

    projectId: "PROJ-001",
    projectName: "Maison Digitale",

    startDate: "2026-08-01",
    endDate: "2026-10-31",

    status: "En cours",

    objectives:
      "Participer au développement et à l'amélioration des outils numériques de suivi et d'évaluation.",

    tasks:
      "Développement frontend, tests, documentation et assistance technique.",

    certificateIssued: false,

    createdAt: "2026-07-20T08:00:00",
    updatedAt: "2026-08-01T08:00:00",
  },

  {
    id: "INT-002",
    reference: "STG-2026-002",

    internName: "Rasoanaivo Fara",
    internEmail: "fara@example.com",
    phone: "+261 32 00 000 02",

    institution: "Université d'Antananarivo",
    level: "Licence 3",
    field: "Gestion",

    type: "Académique",

    department: "DAF",
    supervisor: "Responsable DAF",

    projectId: "PROJ-002",
    projectName: "Kids Preneur",

    startDate: "2026-06-01",
    endDate: "2026-08-31",

    status: "Terminé",

    objectives:
      "Découvrir les pratiques de gestion administrative et financière d'un projet.",

    tasks:
      "Classement des documents, suivi administratif, préparation de tableaux de bord.",

    certificateIssued: true,
    certificateNumber: "CERT-2026-002",

    evaluation: {
      id: "EVAL-STG-002",
      internshipId: "INT-002",
      technicalSkills: 8,
      communication: 9,
      teamwork: 9,
      punctuality: 9,
      autonomy: 8,
      overallScore: 8.6,
      comments:
        "Stage réalisé avec sérieux et bonne capacité d'adaptation.",
      evaluator: "Responsable DAF",
      evaluationDate: "2026-08-31",
    },

    createdAt: "2026-05-20T08:00:00",
    updatedAt: "2026-08-31T16:00:00",
  },

  {
    id: "INT-003",
    reference: "STG-2026-003",

    internName: "Andrianina Toky",
    internEmail: "toky@example.com",
    phone: "+261 33 00 000 03",

    institution: "ENI Fianarantsoa",
    level: "Licence 3",
    field: "Informatique",

    type: "Professionnel",

    department: "DSI",
    supervisor: "Chef de projet",

    projectId: "PROJ-003",
    projectName: "Ankizy Innov",

    startDate: "2026-09-01",
    endDate: "2026-11-30",

    status: "En cours",

    objectives:
      "Contribuer à la conception d'outils numériques destinés au suivi des bénéficiaires.",

    tasks:
      "Analyse des besoins, développement, tests et documentation.",

    certificateIssued: false,

    createdAt: "2026-08-25T09:00:00",
    updatedAt: "2026-09-01T08:00:00",
  },
];

function isBrowser() {
  return typeof window !== "undefined";
}

function initializeInternships(): Internship[] {
  if (!isBrowser()) {
    return DEFAULT_INTERNSHIPS;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(DEFAULT_INTERNSHIPS)
    );

    return DEFAULT_INTERNSHIPS;
  }

  try {
    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(DEFAULT_INTERNSHIPS)
      );

      return DEFAULT_INTERNSHIPS;
    }

    return parsed;
  } catch {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(DEFAULT_INTERNSHIPS)
    );

    return DEFAULT_INTERNSHIPS;
  }
}

export function getInternships(): Internship[] {
  return initializeInternships();
}

export function saveInternships(
  internships: Internship[]
): Internship[] {
  if (isBrowser()) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(internships)
    );
  }

  return internships;
}

export function getInternshipById(
  id: string
): Internship | undefined {
  return getInternships().find(
    (internship) => internship.id === id
  );
}

export function createInternship(
  data: Omit<
    Internship,
    "id" | "reference" | "createdAt" | "updatedAt"
  >
): Internship {
  const internships = getInternships();

  const now = new Date().toISOString();

  const internship: Internship = {
    ...data,

    id: `INT-${Date.now()}`,

    reference: `STG-${new Date().getFullYear()}-${String(
      internships.length + 1
    ).padStart(3, "0")}`,

    createdAt: now,
    updatedAt: now,
  };

  saveInternships([
    internship,
    ...internships,
  ]);

  return internship;
}

export function updateInternship(
  id: string,
  data: Partial<Internship>
): Internship | undefined {
  const internships = getInternships();

  let updatedInternship: Internship | undefined;

  const updated = internships.map((internship) => {
    if (internship.id !== id) {
      return internship;
    }

    updatedInternship = {
      ...internship,
      ...data,
      id: internship.id,
      reference: internship.reference,
      updatedAt: new Date().toISOString(),
    };

    return updatedInternship;
  });

  saveInternships(updated);

  return updatedInternship;
}

export function deleteInternship(
  id: string
): Internship[] {
  const updated = getInternships().filter(
    (internship) => internship.id !== id
  );

  return saveInternships(updated);
}

export function saveInternshipEvaluation(
  internshipId: string,
  evaluation: Omit<
    InternshipEvaluation,
    "id" | "internshipId" | "overallScore"
  >
): Internship | undefined {
  const score =
    (evaluation.technicalSkills +
      evaluation.communication +
      evaluation.teamwork +
      evaluation.punctuality +
      evaluation.autonomy) /
    5;

  const internshipEvaluation: InternshipEvaluation = {
    ...evaluation,
    id: `EVAL-STG-${Date.now()}`,
    internshipId,
    overallScore: Number(score.toFixed(2)),
  };

  return updateInternship(internshipId, {
    evaluation: internshipEvaluation,
  });
}

export function issueCertificate(
  internshipId: string
): Internship | undefined {
  const internship = getInternshipById(internshipId);

  if (!internship) {
    return undefined;
  }

  const certificateNumber =
    internship.certificateNumber ??
    `CERT-${new Date().getFullYear()}-${Date.now()}`;

  return updateInternship(internshipId, {
    certificateIssued: true,
    certificateNumber,
  });
}

export function getStatusClass(
  status: InternshipStatus
): string {
  switch (status) {
    case "En cours":
      return "bg-blue-100 text-blue-700";

    case "Terminé":
      return "bg-green-100 text-green-700";

    case "Annulé":
      return "bg-red-100 text-red-700";

    case "En attente":
    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

export function getInternshipTypeClass(
  type: InternshipType
): string {
  switch (type) {
    case "Stage de fin d'études":
      return "bg-purple-100 text-purple-700";

    case "Professionnel":
      return "bg-blue-100 text-blue-700";

    case "Académique":
      return "bg-green-100 text-green-700";

    case "Stage d'observation":
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function formatInternshipDate(
  dateString: string
): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}