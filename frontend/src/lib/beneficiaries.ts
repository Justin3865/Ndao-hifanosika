// src/lib/beneficiaries.ts

export type BeneficiaryGender =
  | "Femme"
  | "Homme"
  | "Autre"
  | "Non précisé";

export type BeneficiaryStatus =
  | "Inscrit"
  | "Actif"
  | "En pause"
  | "Terminé"
  | "Abandonné";

export type VulnerabilityCategory =
  | "Aucune"
  | "Mineur"
  | "Femme vulnérable"
  | "Jeune vulnérable"
  | "Situation économique difficile"
  | "Handicap"
  | "Autre";

export type SocioEconomicStatus =
  | "Très faible"
  | "Faible"
  | "Moyen"
  | "Stable"
  | "Non renseigné";

export type FollowUpStatus =
  | "À suivre"
  | "En cours"
  | "Terminé"
  | "Non disponible";

export interface Beneficiary {
  id: string;

  // Identification
  code: string;
  nom: string;
  prenom: string;
  anonymise: boolean;

  // Données personnelles
  dateNaissance: string;
  genre: BeneficiaryGender;
  telephone: string;
  email: string;
  adresse: string;
  commune: string;
  region: string;

  // Profil
  categorie: "Femme" | "Jeune" | "Enfant" | "Porteur de projet" | "Autre";
  categorieVulnerabilite: VulnerabilityCategory;
  situationSocioEconomique: SocioEconomicStatus;
  niveauEtude: string;
  profession: string;

  // Projets / programmes
  projectIds: string[];
  projectNames: string[];
  programmePrincipal: string;

  // Inscription / parcours
  dateInscription: string;
  statutParcours: BeneficiaryStatus;
  etapeParcours: string;
  progression: number;

  // Suivi
  sessionsPrevues: number;
  sessionsPresentes: number;
  jalonsFranchis: number;
  jalonsTotal: number;

  // Evaluation
  derniereEvaluation: string;
  scoreEvaluation: number | null;
  satisfaction: number | null;

  // Impact
  insertionProfessionnelle: boolean | null;
  creationActivite: boolean | null;
  evolutionRevenus: string;
  impactCommentaire: string;

  // Suivi post-programme
  suivi3Mois: FollowUpStatus;
  suivi6Mois: FollowUpStatus;
  suivi12Mois: FollowUpStatus;

  // Notes
  commentaires: string;

  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "ndao-hifanosika-beneficiaries";

const defaultBeneficiaries: Beneficiary[] = [
  {
    id: "BEN-001",
    code: "BEN-001",
    nom: "RAKOTO",
    prenom: "Mialy",
    anonymise: false,

    dateNaissance: "1998-05-14",
    genre: "Femme",
    telephone: "034 00 000 01",
    email: "mialy@example.com",
    adresse: "Lot IV",
    commune: "Antananarivo",
    region: "Analamanga",

    categorie: "Femme",
    categorieVulnerabilite: "Femme vulnérable",
    situationSocioEconomique: "Faible",
    niveauEtude: "Licence",
    profession: "Entrepreneure",

    projectIds: ["PRJ-001"],
    projectNames: ["Maison Digitale"],
    programmePrincipal: "Maison Digitale",

    dateInscription: "2026-01-15",
    statutParcours: "Actif",
    etapeParcours: "Formation numérique",
    progression: 72,

    sessionsPrevues: 25,
    sessionsPresentes: 22,
    jalonsFranchis: 4,
    jalonsTotal: 5,

    derniereEvaluation: "2026-08-20",
    scoreEvaluation: 82,
    satisfaction: 90,

    insertionProfessionnelle: true,
    creationActivite: true,
    evolutionRevenus: "En progression",
    impactCommentaire:
      "Mise en activité après la formation et accompagnement entrepreneurial.",

    suivi3Mois: "Terminé",
    suivi6Mois: "En cours",
    suivi12Mois: "À suivre",

    commentaires: "Bénéficiaire régulière et fortement engagée.",

    createdAt: "2026-01-15T08:00:00.000Z",
    updatedAt: "2026-08-20T08:00:00.000Z",
  },

  {
    id: "BEN-002",
    code: "BEN-002",
    nom: "RAZAFINDRAKOTO",
    prenom: "Toky",
    anonymise: false,

    dateNaissance: "2012-09-10",
    genre: "Homme",
    telephone: "",
    email: "",
    adresse: "",
    commune: "Fianarantsoa",
    region: "Haute Matsiatra",

    categorie: "Enfant",
    categorieVulnerabilite: "Mineur",
    situationSocioEconomique: "Faible",
    niveauEtude: "Collège",
    profession: "Élève",

    projectIds: ["PRJ-002"],
    projectNames: ["Kids Preneur"],
    programmePrincipal: "Kids Preneur",

    dateInscription: "2026-02-10",
    statutParcours: "Actif",
    etapeParcours: "Entrepreneuriat",
    progression: 58,

    sessionsPrevues: 20,
    sessionsPresentes: 17,
    jalonsFranchis: 3,
    jalonsTotal: 6,

    derniereEvaluation: "2026-08-10",
    scoreEvaluation: 75,
    satisfaction: 88,

    insertionProfessionnelle: null,
    creationActivite: false,
    evolutionRevenus: "Non applicable",
    impactCommentaire:
      "Suivi éducatif et développement des compétences entrepreneuriales.",

    suivi3Mois: "Non disponible",
    suivi6Mois: "À suivre",
    suivi12Mois: "À suivre",

    commentaires:
      "Données personnelles à protéger. Bénéficiaire mineur.",

    createdAt: "2026-02-10T08:00:00.000Z",
    updatedAt: "2026-08-10T08:00:00.000Z",
  },

  {
    id: "BEN-003",
    code: "BEN-003",
    nom: "ANDRIANINA",
    prenom: "Hery",
    anonymise: false,

    dateNaissance: "2003-03-21",
    genre: "Homme",
    telephone: "032 00 000 03",
    email: "hery@example.com",
    adresse: "Centre-ville",
    commune: "Fianarantsoa",
    region: "Haute Matsiatra",

    categorie: "Jeune",
    categorieVulnerabilite: "Jeune vulnérable",
    situationSocioEconomique: "Faible",
    niveauEtude: "Licence",
    profession: "Étudiant",

    projectIds: ["PRJ-003"],
    projectNames: ["Ankizy Innov"],
    programmePrincipal: "Ankizy Innov",

    dateInscription: "2026-03-05",
    statutParcours: "Actif",
    etapeParcours: "Innovation",
    progression: 64,

    sessionsPrevues: 18,
    sessionsPresentes: 14,
    jalonsFranchis: 3,
    jalonsTotal: 5,

    derniereEvaluation: "2026-08-05",
    scoreEvaluation: 69,
    satisfaction: 80,

    insertionProfessionnelle: false,
    creationActivite: false,
    evolutionRevenus: "Stable",
    impactCommentaire:
      "Projet innovant en phase de développement.",

    suivi3Mois: "En cours",
    suivi6Mois: "À suivre",
    suivi12Mois: "À suivre",

    commentaires: "",

    createdAt: "2026-03-05T08:00:00.000Z",
    updatedAt: "2026-08-05T08:00:00.000Z",
  },

  {
    id: "BEN-004",
    code: "BEN-004",
    nom: "RAKOTONDRABE",
    prenom: "Fanja",
    anonymise: false,

    dateNaissance: "1995-11-08",
    genre: "Femme",
    telephone: "033 00 000 04",
    email: "fanja@example.com",
    adresse: "Ambohimanarina",
    commune: "Antananarivo",
    region: "Analamanga",

    categorie: "Porteur de projet",
    categorieVulnerabilite: "Aucune",
    situationSocioEconomique: "Moyen",
    niveauEtude: "Master",
    profession: "Entrepreneure",

    projectIds: ["PRJ-004"],
    projectNames: ["Otrikasa"],
    programmePrincipal: "Otrikasa",

    dateInscription: "2026-01-20",
    statutParcours: "Actif",
    etapeParcours: "Incubation",
    progression: 84,

    sessionsPrevues: 30,
    sessionsPresentes: 28,
    jalonsFranchis: 6,
    jalonsTotal: 7,

    derniereEvaluation: "2026-08-25",
    scoreEvaluation: 91,
    satisfaction: 95,

    insertionProfessionnelle: true,
    creationActivite: true,
    evolutionRevenus: "Forte progression",
    impactCommentaire:
      "Projet incubé avec création d'activité et progression du chiffre d'affaires.",

    suivi3Mois: "Terminé",
    suivi6Mois: "Terminé",
    suivi12Mois: "En cours",

    commentaires: "Très bonne progression du projet.",

    createdAt: "2026-01-20T08:00:00.000Z",
    updatedAt: "2026-08-25T08:00:00.000Z",
  },
];

export function getBeneficiaries(): Beneficiary[] {
  if (typeof window === "undefined") {
    return defaultBeneficiaries;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(defaultBeneficiaries)
      );

      return defaultBeneficiaries;
    }

    return JSON.parse(stored) as Beneficiary[];
  } catch {
    return defaultBeneficiaries;
  }
}

export function saveBeneficiaries(
  beneficiaries: Beneficiary[]
): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(beneficiaries)
  );
}

export function getBeneficiaryById(
  id: string
): Beneficiary | undefined {
  return getBeneficiaries().find(
    (beneficiary) => beneficiary.id === id
  );
}

export function createBeneficiary(
  data: Omit<
    Beneficiary,
    "id" | "code" | "createdAt" | "updatedAt"
  >
): Beneficiary {
  const beneficiaries = getBeneficiaries();

  const nextNumber =
    beneficiaries.length + 1;

  const now = new Date().toISOString();

  const beneficiary: Beneficiary = {
    ...data,
    id: `BEN-${String(nextNumber).padStart(3, "0")}`,
    code: `BEN-${String(nextNumber).padStart(3, "0")}`,
    createdAt: now,
    updatedAt: now,
  };

  saveBeneficiaries([
    ...beneficiaries,
    beneficiary,
  ]);

  return beneficiary;
}

export function updateBeneficiary(
  id: string,
  data: Partial<Beneficiary>
): Beneficiary | undefined {
  const beneficiaries = getBeneficiaries();

  let updated: Beneficiary | undefined;

  const newList = beneficiaries.map((beneficiary) => {
    if (beneficiary.id !== id) {
      return beneficiary;
    }

    updated = {
      ...beneficiary,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return updated;
  });

  saveBeneficiaries(newList);

  return updated;
}

export function deleteBeneficiary(
  id: string
): void {
  const beneficiaries = getBeneficiaries();

  saveBeneficiaries(
    beneficiaries.filter(
      (beneficiary) => beneficiary.id !== id
    )
  );
}

export function formatDate(
  date: string
): string {
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

export function calculateAttendanceRate(
  beneficiary: Beneficiary
): number {
  if (beneficiary.sessionsPrevues <= 0) {
    return 0;
  }

  return Math.round(
    (beneficiary.sessionsPresentes /
      beneficiary.sessionsPrevues) *
      100
  );
}

export function isMinor(
  dateNaissance: string
): boolean {
  if (!dateNaissance) return false;

  const birth = new Date(dateNaissance);
  const today = new Date();

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const month =
    today.getMonth() -
    birth.getMonth();

  if (
    month < 0 ||
    (month === 0 &&
      today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age < 18;
}