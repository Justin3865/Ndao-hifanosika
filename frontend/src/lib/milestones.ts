export type MilestoneStatus =
  | "À venir"
  | "En cours"
  | "Atteint"
  | "En retard"
  | "Annulé";

export type Milestone = {
  id: string;
  code: string;
  nom: string;
  description: string;

  projectId: string;
  projectName: string;

  activityId?: string;
  activityName?: string;

  responsable: string;

  datePrevue: string;
  dateRealisation?: string;

  statut: MilestoneStatus;
  progression: number;

  indicateur: string;
  cible: number;
  valeurActuelle: number;
  unite: string;

  commentaires: string;

  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "ndao-hifanosika-milestones";

const initialMilestones: Milestone[] = [
  {
    id: "MS-001",
    code: "MS-MD-001",
    nom: "Lancement de la formation numérique",
    description:
      "Démarrage officiel des activités de formation numérique du programme Maison Digitale.",
    projectId: "PRJ-001",
    projectName: "Maison Digitale",
    activityId: "ACT-001",
    activityName: "Formation aux compétences numériques",
    responsable: "Responsable Maison Digitale",
    datePrevue: "2026-09-15",
    dateRealisation: "",
    statut: "En cours",
    progression: 65,
    indicateur: "Nombre de participants formés",
    cible: 100,
    valeurActuelle: 65,
    unite: "personnes",
    commentaires: "Formation en cours.",
    createdAt: "2026-08-20",
    updatedAt: "2026-09-02",
  },
  {
    id: "MS-002",
    code: "MS-KP-001",
    nom: "Sélection des jeunes entrepreneurs",
    description:
      "Identification et sélection des jeunes bénéficiaires du programme Kids Preneur.",
    projectId: "PRJ-002",
    projectName: "Kids Preneur",
    activityId: "ACT-002",
    activityName: "Sélection des bénéficiaires",
    responsable: "Équipe Kids Preneur",
    datePrevue: "2026-09-30",
    dateRealisation: "",
    statut: "À venir",
    progression: 20,
    indicateur: "Nombre de jeunes sélectionnés",
    cible: 50,
    valeurActuelle: 10,
    unite: "jeunes",
    commentaires: "Phase préparatoire.",
    createdAt: "2026-08-21",
    updatedAt: "2026-09-02",
  },
  {
    id: "MS-003",
    code: "MS-AI-001",
    nom: "Démarrage du programme Ankizy Innov",
    description:
      "Lancement des activités principales du programme Ankizy Innov.",
    projectId: "PRJ-003",
    projectName: "Ankizy Innov",
    activityId: "ACT-003",
    activityName: "Ateliers d'innovation",
    responsable: "Coordinateur Ankizy Innov",
    datePrevue: "2026-08-30",
    dateRealisation: "2026-08-29",
    statut: "Atteint",
    progression: 100,
    indicateur: "Ateliers réalisés",
    cible: 10,
    valeurActuelle: 10,
    unite: "ateliers",
    commentaires: "Jalon atteint conformément au calendrier.",
    createdAt: "2026-08-10",
    updatedAt: "2026-08-30",
  },
  {
    id: "MS-004",
    code: "MS-OT-001",
    nom: "Première évaluation des bénéficiaires",
    description:
      "Réalisation de la première évaluation des bénéficiaires du programme Otrikasa.",
    projectId: "PRJ-004",
    projectName: "Otrikasa",
    activityId: "ACT-004",
    activityName: "Suivi des bénéficiaires",
    responsable: "Responsable S&E",
    datePrevue: "2026-10-15",
    dateRealisation: "",
    statut: "À venir",
    progression: 0,
    indicateur: "Bénéficiaires évalués",
    cible: 200,
    valeurActuelle: 0,
    unite: "personnes",
    commentaires: "",
    createdAt: "2026-08-25",
    updatedAt: "2026-09-02",
  },
];

/* =========================================================
   RÉCUPÉRER LES JALONS
========================================================= */

export function getMilestones(): Milestone[] {
  if (typeof window === "undefined") {
    return initialMilestones;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(initialMilestones)
      );

      return initialMilestones;
    }

    return JSON.parse(stored) as Milestone[];
  } catch (error) {
    console.error("Erreur récupération milestones :", error);
    return initialMilestones;
  }
}

/* =========================================================
   SAUVEGARDER
========================================================= */

export function saveMilestones(milestones: Milestone[]): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(milestones)
  );
}

/* =========================================================
   RÉCUPÉRER UN JALON
========================================================= */

export function getMilestoneById(
  id: string
): Milestone | undefined {
  const milestones = getMilestones();

  return milestones.find(
    (milestone) => milestone.id === id
  );
}

/* =========================================================
   CRÉER
========================================================= */

export function createMilestone(
  data: Omit<Milestone, "id" | "createdAt" | "updatedAt">
): Milestone {
  const milestones = getMilestones();

  const now = new Date().toISOString().split("T")[0];

  const newMilestone: Milestone = {
    ...data,
    id: `MS-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };

  saveMilestones([
    newMilestone,
    ...milestones,
  ]);

  return newMilestone;
}

/* =========================================================
   MODIFIER
========================================================= */

export function updateMilestone(
  id: string,
  data: Partial<Milestone>
): Milestone | undefined {
  const milestones = getMilestones();

  const index = milestones.findIndex(
    (milestone) => milestone.id === id
  );

  if (index === -1) {
    return undefined;
  }

  const updated: Milestone = {
    ...milestones[index],
    ...data,
    id: milestones[index].id,
    updatedAt: new Date().toISOString().split("T")[0],
  };

  milestones[index] = updated;

  saveMilestones(milestones);

  return updated;
}

/* =========================================================
   SUPPRIMER
========================================================= */

export function deleteMilestone(id: string): void {
  const milestones = getMilestones();

  const filtered = milestones.filter(
    (milestone) => milestone.id !== id
  );

  saveMilestones(filtered);
}

/* =========================================================
   FORMAT DATE
========================================================= */

export function formatMilestoneDate(
  date?: string
): string {
  if (!date) {
    return "—";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("fr-FR");
}