// src/lib/activities.ts

export type ActivityStatus =
  | "Planifiée"
  | "En cours"
  | "Terminée"
  | "Suspendue";

export type Activity = {
  id: string;

  code: string;
  nom: string;
  description: string;

  projectId: string;
  projectName: string;

  responsable: string;

  dateDebut: string;
  dateFin: string;

  statut: ActivityStatus;
  progression: number;

  indicateur: string;
  cible: number;
  unite: string;
  valeurActuelle: number;

  budget: number;
  devise: string;

  nombreBeneficiaires: number;

  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "ndao-hifanosika-activities";

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: "activity-001",
    code: "MD-ACT-001",
    nom: "Formation aux compétences numériques",
    description:
      "Organisation de sessions de formation destinées aux jeunes bénéficiaires de Maison Digitale.",
    projectId: "project-001",
    projectName: "Maison Digitale",
    responsable: "Coordinateur Maison Digitale",
    dateDebut: "2026-02-01",
    dateFin: "2026-04-30",
    statut: "En cours",
    progression: 65,
    indicateur: "Nombre de jeunes formés",
    cible: 100,
    unite: "personnes",
    valeurActuelle: 65,
    budget: 10000000,
    devise: "MGA",
    nombreBeneficiaires: 100,
    createdAt: "2026-01-20",
    updatedAt: "2026-03-01",
  },

  {
    id: "activity-002",
    code: "MD-ACT-002",
    nom: "Accompagnement des jeunes",
    description:
      "Accompagnement individuel et collectif des jeunes dans leurs parcours numériques et professionnels.",
    projectId: "project-001",
    projectName: "Maison Digitale",
    responsable: "Responsable accompagnement",
    dateDebut: "2026-03-01",
    dateFin: "2026-08-31",
    statut: "En cours",
    progression: 40,
    indicateur: "Nombre de jeunes accompagnés",
    cible: 150,
    unite: "personnes",
    valeurActuelle: 60,
    budget: 8000000,
    devise: "MGA",
    nombreBeneficiaires: 150,
    createdAt: "2026-02-15",
    updatedAt: "2026-03-01",
  },

  {
    id: "activity-003",
    code: "KP-ACT-001",
    nom: "Atelier entrepreneuriat",
    description:
      "Organisation d'ateliers pratiques sur l'entrepreneuriat et l'innovation.",
    projectId: "project-002",
    projectName: "Kids Preneur",
    responsable: "Coordinateur Kids Preneur",
    dateDebut: "2026-03-15",
    dateFin: "2026-05-30",
    statut: "Planifiée",
    progression: 0,
    indicateur: "Nombre de participants",
    cible: 80,
    unite: "personnes",
    valeurActuelle: 0,
    budget: 6000000,
    devise: "MGA",
    nombreBeneficiaires: 80,
    createdAt: "2026-02-20",
    updatedAt: "2026-02-20",
  },

  {
    id: "activity-004",
    code: "AI-ACT-001",
    nom: "Atelier innovation technologique",
    description:
      "Atelier consacré à la créativité, l'innovation et l'utilisation des technologies.",
    projectId: "project-003",
    projectName: "Ankizy Innov",
    responsable: "Coordinateur Ankizy Innov",
    dateDebut: "2026-04-01",
    dateFin: "2026-06-30",
    statut: "Planifiée",
    progression: 0,
    indicateur: "Nombre de jeunes participants",
    cible: 100,
    unite: "personnes",
    valeurActuelle: 0,
    budget: 7500000,
    devise: "MGA",
    nombreBeneficiaires: 100,
    createdAt: "2026-03-01",
    updatedAt: "2026-03-01",
  },

  {
    id: "activity-005",
    code: "OTR-ACT-001",
    nom: "Sélection des initiatives",
    description:
      "Identification et sélection des initiatives innovantes portées par les jeunes.",
    projectId: "project-004",
    projectName: "Otrikasa",
    responsable: "Coordinateur Otrikasa",
    dateDebut: "2026-02-15",
    dateFin: "2026-04-15",
    statut: "En cours",
    progression: 75,
    indicateur: "Nombre d'initiatives sélectionnées",
    cible: 30,
    unite: "initiatives",
    valeurActuelle: 23,
    budget: 5000000,
    devise: "MGA",
    nombreBeneficiaires: 30,
    createdAt: "2026-02-01",
    updatedAt: "2026-03-01",
  },
];

function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `activity-${Date.now()}`;
}

export function getActivities(): Activity[] {
  if (typeof window === "undefined") {
    return INITIAL_ACTIVITIES;
  }

  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(INITIAL_ACTIVITIES)
    );

    return INITIAL_ACTIVITIES;
  }

  try {
    return JSON.parse(stored) as Activity[];
  } catch {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(INITIAL_ACTIVITIES)
    );

    return INITIAL_ACTIVITIES;
  }
}

export function saveActivities(
  activities: Activity[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(activities)
  );
}

export function getActivityById(
  id: string
): Activity | undefined {
  return getActivities().find(
    (activity) => activity.id === id
  );
}

export function createActivity(
  data: Omit<
    Activity,
    "id" | "createdAt" | "updatedAt"
  >
): Activity {
  const activities = getActivities();

  const now = new Date().toISOString();

  const activity: Activity = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  saveActivities([
    activity,
    ...activities,
  ]);

  return activity;
}

export function updateActivity(
  id: string,
  data: Partial<
    Omit<Activity, "id" | "createdAt">
  >
): Activity | undefined {
  const activities = getActivities();

  const index = activities.findIndex(
    (activity) => activity.id === id
  );

  if (index === -1) {
    return undefined;
  }

  const updatedActivity: Activity = {
    ...activities[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  activities[index] = updatedActivity;

  saveActivities(activities);

  return updatedActivity;
}

export function deleteActivity(
  id: string
): boolean {
  const activities = getActivities();

  const filtered = activities.filter(
    (activity) => activity.id !== id
  );

  if (filtered.length === activities.length) {
    return false;
  }

  saveActivities(filtered);

  return true;
}

export function formatBudget(
  budget: number,
  devise: string
): string {
  return (
    new Intl.NumberFormat("fr-FR").format(budget) +
    ` ${devise}`
  );
}

export function formatDate(
  date: string
): string {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}