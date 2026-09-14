// src/lib/projects.ts

export type ProjectStatus =
  | "Planifié"
  | "En cours"
  | "Terminé"
  | "Suspendu";

export type Project = {
  id: string;
  code: string;
  nom: string;
  description: string;
  objectif: string;

  partenaire: string;
  bailleur: string;

  departement: string;
  responsable: string;

  dateDebut: string;
  dateFin: string;

  budget: number;
  devise: string;

  statut: ProjectStatus;

  nombreActivites: number;
  nombreJalons: number;
  nombreBeneficiaires: number;

  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "ndao-hifanosika-projects";

export const INITIAL_PROJECTS: Project[] = [
  {
    id: "project-001",
    code: "MD-2026",
    nom: "Maison Digitale",
    description:
      "Programme d'accompagnement et de renforcement des compétences numériques des jeunes.",
    objectif:
      "Favoriser l'inclusion numérique et renforcer l'autonomie des jeunes à travers les compétences digitales.",
    partenaire: "Orange Madagascar",
    bailleur: "Orange",
    departement: "DSI",
    responsable: "Responsable Maison Digitale",
    dateDebut: "2026-01-15",
    dateFin: "2026-12-31",
    budget: 50000000,
    devise: "MGA",
    statut: "En cours",
    nombreActivites: 12,
    nombreJalons: 5,
    nombreBeneficiaires: 250,
    createdAt: "2026-01-15",
    updatedAt: "2026-01-15",
  },

  {
    id: "project-002",
    code: "KP-2026",
    nom: "Kids Preneur",
    description:
      "Programme destiné à développer l'esprit entrepreneurial et l'innovation chez les jeunes.",
    objectif:
      "Développer les compétences entrepreneuriales, créatives et numériques des jeunes.",
    partenaire: "Ndao Hifanosika",
    bailleur: "Partenaires du programme",
    departement: "Communication",
    responsable: "Coordinateur Kids Preneur",
    dateDebut: "2026-02-01",
    dateFin: "2026-11-30",
    budget: 35000000,
    devise: "MGA",
    statut: "En cours",
    nombreActivites: 10,
    nombreJalons: 4,
    nombreBeneficiaires: 180,
    createdAt: "2026-02-01",
    updatedAt: "2026-02-01",
  },

  {
    id: "project-003",
    code: "AI-2026",
    nom: "Ankizy Innov",
    description:
      "Programme d'innovation et d'accompagnement des enfants et des jeunes dans les technologies.",
    objectif:
      "Encourager l'innovation, la créativité et l'utilisation responsable des technologies.",
    partenaire: "Ndao Hifanosika",
    bailleur: "Partenaires techniques et financiers",
    departement: "DSI",
    responsable: "Coordinateur Ankizy Innov",
    dateDebut: "2026-03-01",
    dateFin: "2026-12-15",
    budget: 42000000,
    devise: "MGA",
    statut: "Planifié",
    nombreActivites: 8,
    nombreJalons: 4,
    nombreBeneficiaires: 150,
    createdAt: "2026-03-01",
    updatedAt: "2026-03-01",
  },

  {
    id: "project-004",
    code: "OTR-2026",
    nom: "Otrikasa",
    description:
      "Programme de soutien aux initiatives et projets innovants portés par les jeunes.",
    objectif:
      "Accompagner les jeunes dans la conception, la réalisation et le développement de leurs initiatives.",
    partenaire: "Ndao Hifanosika",
    bailleur: "Partenaires du programme",
    departement: "Direction",
    responsable: "Coordinateur Otrikasa",
    dateDebut: "2026-01-20",
    dateFin: "2026-10-31",
    budget: 28000000,
    devise: "MGA",
    statut: "En cours",
    nombreActivites: 9,
    nombreJalons: 3,
    nombreBeneficiaires: 120,
    createdAt: "2026-01-20",
    updatedAt: "2026-01-20",
  },
];

function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `project-${Date.now()}`;
}

export function getProjects(): Project[] {
  if (typeof window === "undefined") {
    return INITIAL_PROJECTS;
  }

  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(INITIAL_PROJECTS)
    );

    return INITIAL_PROJECTS;
  }

  try {
    return JSON.parse(stored) as Project[];
  } catch {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(INITIAL_PROJECTS)
    );

    return INITIAL_PROJECTS;
  }
}

export function saveProjects(projects: Project[]): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getProjectById(id: string): Project | undefined {
  return getProjects().find((project) => project.id === id);
}

export function createProject(
  data: Omit<Project, "id" | "createdAt" | "updatedAt">
): Project {
  const projects = getProjects();

  const now = new Date().toISOString();

  const project: Project = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  saveProjects([project, ...projects]);

  return project;
}

export function updateProject(
  id: string,
  data: Partial<Omit<Project, "id" | "createdAt">>
): Project | undefined {
  const projects = getProjects();

  const index = projects.findIndex(
    (project) => project.id === id
  );

  if (index === -1) {
    return undefined;
  }

  const updatedProject: Project = {
    ...projects[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  projects[index] = updatedProject;

  saveProjects(projects);

  return updatedProject;
}

export function deleteProject(id: string): boolean {
  const projects = getProjects();

  const filteredProjects = projects.filter(
    (project) => project.id !== id
  );

  if (filteredProjects.length === projects.length) {
    return false;
  }

  saveProjects(filteredProjects);

  return true;
}

export function formatBudget(
  budget: number,
  devise: string
): string {
  return new Intl.NumberFormat("fr-FR").format(budget) + ` ${devise}`;
}

export function formatDate(date: string): string {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}