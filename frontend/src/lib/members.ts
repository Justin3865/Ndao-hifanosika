
export type MemberStatus =
  | "Actif"
  | "Inactif"
  | "En congé"
  | "Terminé";

export type MemberRole =
  | "Administrateur"
  | "Coordinateur"
  | "Responsable S&E"
  | "Chef de projet"
  | "Chargé de projet"
  | "Assistant"
  | "Stagiaire";

export type Member = {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: MemberRole;
  departement: string;
  fonction: string;
  projectIds: string[];
  projectNames: string[];
  dateEntree: string;
  dateSortie?: string;
  statut: MemberStatus;
  localisation: string;
  responsable: string;
  competences: string[];
  commentaires: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "ndao-hifanosika-members";

const initialMembers: Member[] = [
  {
    id: "MEM-001",
    matricule: "NH-001",
    nom: "RAKOTO",
    prenom: "Jean",
    email: "jean.rakoto@ndao-hifanosika.org",
    telephone: "+261 34 00 000 01",
    role: "Coordinateur",
    departement: "Direction",
    fonction: "Coordinateur de programme",
    projectIds: ["PRJ-001", "PRJ-002"],
    projectNames: ["Maison Digitale", "Kids Preneur"],
    dateEntree: "2026-01-15",
    dateSortie: "",
    statut: "Actif",
    localisation: "Antananarivo",
    responsable: "Direction",
    competences: [
      "Gestion de projet",
      "Coordination",
      "Suivi-évaluation",
    ],
    commentaires: "Coordinateur principal des programmes.",
    createdAt: "2026-01-15",
    updatedAt: "2026-09-02",
  },
  {
    id: "MEM-002",
    matricule: "NH-002",
    nom: "RAZAFINDRAKOTO",
    prenom: "Marie",
    email: "marie.razafindrakoto@ndao-hifanosika.org",
    telephone: "+261 34 00 000 02",
    role: "Responsable S&E",
    departement: "DSI",
    fonction: "Responsable Suivi et Évaluation",
    projectIds: ["PRJ-001", "PRJ-003", "PRJ-004"],
    projectNames: [
      "Maison Digitale",
      "Ankizy Innov",
      "Otrikasa",
    ],
    dateEntree: "2026-02-01",
    dateSortie: "",
    statut: "Actif",
    localisation: "Antananarivo",
    responsable: "Direction",
    competences: [
      "Suivi-évaluation",
      "Analyse de données",
      "Reporting",
      "Indicateurs",
    ],
    commentaires: "Responsable du système de S&E.",
    createdAt: "2026-02-01",
    updatedAt: "2026-09-02",
  },
  {
    id: "MEM-003",
    matricule: "NH-003",
    nom: "ANDRIANA",
    prenom: "Paul",
    email: "paul.andriana@ndao-hifanosika.org",
    telephone: "+261 34 00 000 03",
    role: "Chef de projet",
    departement: "Communication",
    fonction: "Chef de projet Maison Digitale",
    projectIds: ["PRJ-001"],
    projectNames: ["Maison Digitale"],
    dateEntree: "2026-03-10",
    dateSortie: "",
    statut: "Actif",
    localisation: "Antananarivo",
    responsable: "Coordinateur",
    competences: [
      "Gestion de projet",
      "Communication",
      "Planification",
    ],
    commentaires: "Chef de projet Maison Digitale.",
    createdAt: "2026-03-10",
    updatedAt: "2026-09-02",
  },
  {
    id: "MEM-004",
    matricule: "NH-004",
    nom: "RAKOTONIAINA",
    prenom: "Sophie",
    email: "sophie.rakotoniaina@ndao-hifanosika.org",
    telephone: "+261 34 00 000 04",
    role: "Chargé de projet",
    departement: "RH",
    fonction: "Chargée de suivi des bénéficiaires",
    projectIds: ["PRJ-002", "PRJ-004"],
    projectNames: ["Kids Preneur", "Otrikasa"],
    dateEntree: "2026-04-05",
    dateSortie: "",
    statut: "Actif",
    localisation: "Fianarantsoa",
    responsable: "Responsable S&E",
    competences: [
      "Suivi bénéficiaires",
      "Collecte de données",
      "Enquêtes",
    ],
    commentaires: "Chargée du suivi des bénéficiaires.",
    createdAt: "2026-04-05",
    updatedAt: "2026-09-02",
  },
  {
    id: "MEM-005",
    matricule: "NH-005",
    nom: "RAKOTOZANDRY",
    prenom: "Pauline",
    email: "pauline.rakotozandry@ndao-hifanosika.org",
    telephone: "+261 34 00 000 05",
    role: "Assistant",
    departement: "DAF",
    fonction: "Assistante administrative",
    projectIds: [],
    projectNames: [],
    dateEntree: "2026-05-12",
    dateSortie: "",
    statut: "Actif",
    localisation: "Antananarivo",
    responsable: "DAF",
    competences: [
      "Administration",
      "Gestion documentaire",
    ],
    commentaires: "",
    createdAt: "2026-05-12",
    updatedAt: "2026-09-02",
  },
];

export function getMembers(): Member[] {
  if (typeof window === "undefined") {
    return initialMembers;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(initialMembers)
      );

      return initialMembers;
    }

    return JSON.parse(stored) as Member[];
  } catch (error) {
    console.error(
      "Erreur récupération des membres :",
      error
    );

    return initialMembers;
  }
}

export function saveMembers(members: Member[]): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(members)
  );
}

export function getMemberById(
  id: string
): Member | undefined {
  const members = getMembers();

  return members.find(
    (member) => member.id === id
  );
}

export function createMember(
  data: Omit<Member, "id" | "createdAt" | "updatedAt">
): Member {
  const members = getMembers();

  const now = new Date()
    .toISOString()
    .split("T")[0];

  const newMember: Member = {
    ...data,
    id: `MEM-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };

  saveMembers([
    newMember,
    ...members,
  ]);

  return newMember;
}

export function updateMember(
  id: string,
  data: Partial<Member>
): Member | undefined {
  const members = getMembers();

  const index = members.findIndex(
    (member) => member.id === id
  );

  if (index === -1) {
    return undefined;
  }

  const updatedMember: Member = {
    ...members[index],
    ...data,
    id: members[index].id,
    updatedAt: new Date()
      .toISOString()
      .split("T")[0],
  };

  members[index] = updatedMember;

  saveMembers(members);

  return updatedMember;
}

export function deleteMember(id: string): void {
  const members = getMembers();

  const filteredMembers = members.filter(
    (member) => member.id !== id
  );

  saveMembers(filteredMembers);
}

export function formatMemberDate(
  date?: string
): string {
  if (!date) {
    return "—";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("fr-FR");
}

