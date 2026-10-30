// src/lib/resources.tsx
// Configuration de chaque module : colonnes, formulaires, rôles autorisés.
// Les rôles d'écriture reflètent authorizeRoles() du backend.

import { ActivitySpace } from "@/components/activities/ActivitySpace";
import { StatusBadge } from "@/components/crud/StatusBadge";
import { TrackingPanel } from "@/components/tracking/TrackingPanel";
import {
  ResourceConfig,
  fmtDate,
  fmtMoney,
  statusOptions,
} from "@/lib/crud";
import { ASSIGNABLE_ROLES, ROLE_LABELS, roleLabel, statusLabel } from "@/lib/roles";

const TUTEURS = ["TUTEUR_L3", "TUTEUR_M2"];
const STAGIAIRES = ["STAGIAIRE_L3", "STAGIAIRE_M2"];

const GENDERS = [
  { value: "FEMALE", label: "Femme" },
  { value: "MALE", label: "Homme" },
];

const genderLabel = (gender?: string) =>
  gender === "FEMALE" ? "Femme" : gender === "MALE" ? "Homme" : "—";

const personName = (person?: { firstName?: string; lastName?: string } | null) =>
  person ? `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() : "—";

const period = (start?: string | null, end?: string | null) =>
  `${fmtDate(start)} → ${fmtDate(end)}`;

const ProgressBar = ({ value }: { value?: number | null }) => (
  <div className="flex items-center gap-2">
    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
      <div
        className="h-full bg-blue-600"
        style={{ width: `${Math.min(100, Math.max(0, Number(value ?? 0)))}%` }}
      />
    </div>
    <span className="text-xs text-gray-600">{value ?? 0}%</span>
  </div>
);

/* ------------------------------------------------------------------ */
/* PROJETS                                                              */
/* ------------------------------------------------------------------ */
const PROJECT_STATUS = ["DRAFT", "ACTIVE", "COMPLETED", "SUSPENDED"];
const PROJECT_WRITERS = ["ADMIN", "DIRECTION", "DAF", "COORDINATOR"];

export const projectsConfig: ResourceConfig = {
  title: "Projets",
  singular: "un projet",
  basePath: "/projects",
  endpoint: "/projects",
  listKey: "projects",
  itemKey: "project",
  columns: [
    { header: "Code", render: (p) => p.code },
    { header: "Projet", render: (p) => <span className="font-medium text-gray-900">{p.name}</span> },
    { header: "Département", render: (p) => p.department?.name ?? "—" },
    { header: "Période", render: (p) => period(p.startDate, p.endDate) },
    { header: "Budget", render: (p) => fmtMoney(p.budget) },
    { header: "Statut", render: (p) => <StatusBadge status={p.status} /> },
  ],
  fields: [
    { name: "name", label: "Nom du projet", type: "text", required: true },
    { name: "code", label: "Code", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "objective", label: "Objectif", type: "textarea" },
    { name: "startDate", label: "Date de début", type: "date", required: true },
    { name: "endDate", label: "Date de fin", type: "date", required: true },
    { name: "status", label: "Statut", type: "select", options: statusOptions(PROJECT_STATUS) },
    { name: "budget", label: "Budget (Ar)", type: "number", min: 0 },
    { name: "beneficiaryTarget", label: "Bénéficiaires visés", type: "number", min: 0 },
    { name: "departmentId", label: "Département", type: "select", lookup: "departments", required: true },
  ],
  detail: (p) => [
    { label: "Code", value: p.code },
    { label: "Statut", value: <StatusBadge status={p.status} /> },
    { label: "Département", value: p.department?.name ?? "—" },
    { label: "Période", value: period(p.startDate, p.endDate) },
    { label: "Budget", value: fmtMoney(p.budget) },
    { label: "Bénéficiaires visés", value: p.beneficiaryTarget ?? "—" },
    { label: "Objectif", value: p.objective || "—" },
    { label: "Description", value: p.description || "—" },
  ],
  titleOf: (p) => p.name,
  searchOf: (p) => `${p.name} ${p.code} ${p.department?.name ?? ""}`,
  statusFilter: { field: "status", options: statusOptions(PROJECT_STATUS) },
  createRoles: PROJECT_WRITERS,
  editRoles: PROJECT_WRITERS,
  deleteRoles: ["ADMIN"],
};

/* ------------------------------------------------------------------ */
/* ACTIVITÉS                                                            */
/* ------------------------------------------------------------------ */
const ACTIVITY_STATUS = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const ACTIVITY_WRITERS = ["ADMIN", "DIRECTION", "COMMUNICATION", "COORDINATOR", ...TUTEURS];

export const activitiesConfig: ResourceConfig = {
  title: "Activités",
  singular: "une activité",
  basePath: "/activities",
  endpoint: "/activities",
  listKey: "activities",
  itemKey: "activity",
  columns: [
    { header: "Activité", render: (a) => <span className="font-medium text-gray-900">{a.title}</span> },
    { header: "Projet", render: (a) => a.project?.name ?? `#${a.projectId}` },
    { header: "Lieu", render: (a) => a.location || "—" },
    { header: "Période", render: (a) => period(a.startDate, a.endDate) },
    { header: "Budget", render: (a) => fmtMoney(a.budget) },
    { header: "Statut", render: (a) => <StatusBadge status={a.status} /> },
  ],
  fields: [
    { name: "projectId", label: "Projet", type: "select", lookup: "projects", required: true },
    { name: "title", label: "Titre", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "location", label: "Lieu", type: "text" },
    { name: "startDate", label: "Date de début", type: "date" },
    { name: "endDate", label: "Date de fin", type: "date" },
    { name: "status", label: "Statut", type: "select", options: statusOptions(ACTIVITY_STATUS) },
    { name: "budget", label: "Budget (Ar)", type: "number", min: 0 },
  ],
  detail: (a) => [
    { label: "Projet", value: a.project?.name ?? `#${a.projectId}` },
    { label: "Statut", value: <StatusBadge status={a.status} /> },
    { label: "Lieu", value: a.location || "—" },
    { label: "Période", value: period(a.startDate, a.endDate) },
    { label: "Budget", value: fmtMoney(a.budget) },
    { label: "Description", value: a.description || "—" },
  ],
  extra: (a) => <ActivitySpace activity={a} />,
  titleOf: (a) => a.title,
  searchOf: (a) => `${a.title} ${a.project?.name ?? ""} ${a.location ?? ""}`,
  statusFilter: { field: "status", options: statusOptions(ACTIVITY_STATUS) },
  createRoles: ACTIVITY_WRITERS,
  editRoles: ACTIVITY_WRITERS,
  deleteRoles: ["ADMIN", "DIRECTION", "COORDINATOR"],
};

/* ------------------------------------------------------------------ */
/* JALONS                                                               */
/* ------------------------------------------------------------------ */
const MILESTONE_WRITERS = ["ADMIN", "DIRECTION", "COORDINATOR", ...TUTEURS];

export const milestonesConfig: ResourceConfig = {
  title: "Jalons",
  singular: "un jalon",
  basePath: "/milestones",
  endpoint: "/milestones",
  listKey: "milestones",
  itemKey: "milestone",
  columns: [
    { header: "Jalon", render: (m) => <span className="font-medium text-gray-900">{m.title}</span> },
    { header: "Projet", render: (m) => m.project?.name ?? `#${m.projectId}` },
    { header: "Échéance", render: (m) => fmtDate(m.dueDate) },
    { header: "Progression", render: (m) => <ProgressBar value={m.progress} /> },
    {
      header: "Statut",
      render: (m) => <StatusBadge status={m.completedAt ? "COMPLETED" : "IN_PROGRESS"} />,
    },
  ],
  fields: [
    { name: "projectId", label: "Projet", type: "select", lookup: "projects", required: true, hideOnEdit: true },
    { name: "title", label: "Titre", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "dueDate", label: "Échéance", type: "date", required: true },
    { name: "progress", label: "Progression (%)", type: "number", min: 0, max: 100 },
    { name: "completedAt", label: "Date d'achèvement", type: "date", hideOnCreate: true },
  ],
  detail: (m) => [
    { label: "Projet", value: m.project?.name ?? `#${m.projectId}` },
    { label: "Échéance", value: fmtDate(m.dueDate) },
    { label: "Progression", value: <ProgressBar value={m.progress} /> },
    { label: "Terminé le", value: fmtDate(m.completedAt) },
    { label: "Description", value: m.description || "—" },
  ],
  titleOf: (m) => m.title,
  searchOf: (m) => `${m.title} ${m.project?.name ?? ""}`,
  createRoles: MILESTONE_WRITERS,
  editRoles: MILESTONE_WRITERS,
  deleteRoles: ["ADMIN", "DIRECTION", "COORDINATOR"],
};

/* ------------------------------------------------------------------ */
/* BÉNÉFICIAIRES                                                        */
/* ------------------------------------------------------------------ */
const BENEFICIARY_WRITERS = ["ADMIN", "DIRECTION", "DAF", "COORDINATOR"];

export const beneficiariesConfig: ResourceConfig = {
  title: "Bénéficiaires",
  singular: "un bénéficiaire",
  basePath: "/beneficiaries",
  endpoint: "/beneficiaries",
  listKey: "data",
  itemKey: "data",
  columns: [
    { header: "Nom", render: (b) => <span className="font-medium text-gray-900">{personName(b)}</span> },
    { header: "Genre", render: (b) => genderLabel(b.gender) },
    { header: "Âge", render: (b) => b.age ?? "—" },
    { header: "Projet", render: (b) => b.project?.name ?? `#${b.projectId}` },
    { header: "Localité", render: (b) => b.locality || "—" },
    { header: "Contact", render: (b) => b.phone || b.email || "—" },
    {
      header: "Vulnérable",
      render: (b) => (
        <span className={b.vulnerable ? "font-medium text-red-600" : "text-gray-500"}>
          {b.vulnerable ? "Oui" : "Non"}
        </span>
      ),
    },
  ],
  fields: [
    { name: "projectId", label: "Projet", type: "select", lookup: "projects", required: true },
    { name: "firstName", label: "Prénom (facultatif)", type: "text" },
    { name: "lastName", label: "Nom", type: "text", required: true },
    { name: "gender", label: "Genre", type: "select", options: GENDERS },
    { name: "age", label: "Âge", type: "number", min: 0, max: 120 },
    { name: "phone", label: "Téléphone", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "vulnerable", label: "Personne vulnérable", type: "checkbox" },
    { name: "locality", label: "Localité / fokontany (ex. Ankalamavony)", type: "text" },
    { name: "zoneId", label: "Zone d'intervention", type: "select", lookup: "zones" },
    { name: "householdSize", label: "Taille du ménage (personnes)", type: "number", min: 1, max: 40 },
    { name: "monthlyIncome", label: "Revenu mensuel du ménage (Ar)", type: "number", min: 0 },
    { name: "childrenUnder5", label: "Enfants de moins de 5 ans", type: "number", min: 0, max: 20 },
    { name: "hasDisability", label: "Personne en situation de handicap dans le ménage", type: "checkbox" },
    { name: "birthDate", label: "Date de naissance (certificat)", type: "date" },
    { name: "birthPlace", label: "Lieu de naissance (certificat)", type: "text" },
    { name: "cinNumber", label: "N° CIN (12 chiffres)", type: "text", digitsOnly: 12 },
    { name: "cinIssuedAt", label: "Date de délivrance du CIN", type: "date" },
    { name: "cinIssuedPlace", label: "Lieu de délivrance du CIN", type: "text" },
    { name: "cinDuplicata", label: "CIN délivré en duplicata", type: "checkbox" },
    { name: "cinDuplicataAt", label: "Date du duplicata", type: "date" },
    { name: "home", label: "Domicile du ménage (carte)", type: "geo", full: true },
  ],
  detail: (b) => [
    { label: "Projet", value: b.project?.name ?? `#${b.projectId}` },
    { label: "Genre", value: genderLabel(b.gender) },
    { label: "Âge", value: b.age ?? "—" },
    { label: "Téléphone", value: b.phone || "—" },
    { label: "Email", value: b.email || "—" },
    { label: "Vulnérable", value: b.vulnerable ? "Oui" : "Non" },
    { label: "Localité", value: b.locality || "—" },
    { label: "Taille du ménage", value: b.householdSize ?? "—" },
    { label: "Revenu mensuel", value: fmtMoney(b.monthlyIncome) },
    { label: "Enfants < 5 ans", value: b.childrenUnder5 ?? "—" },
    { label: "Handicap", value: b.hasDisability ? "Oui" : "Non" },
    { label: "Date de naissance", value: b.birthDate ? fmtDate(b.birthDate) : "—" },
    { label: "Lieu de naissance", value: b.birthPlace || "—" },
    { label: "N° CIN", value: b.cinNumber || "—" },
    { label: "CIN délivré le", value: b.cinIssuedAt ? fmtDate(b.cinIssuedAt) : "—" },
    { label: "CIN délivré à", value: b.cinIssuedPlace || "—" },
    { label: "Duplicata", value: b.cinDuplicata ? (b.cinDuplicataAt ? "Oui, le " + fmtDate(b.cinDuplicataAt) : "Oui") : "Non" },
    {
      label: "Domicile (GPS)",
      value:
        b.homeLatitude !== null && b.homeLatitude !== undefined
          ? `${Number(b.homeLatitude).toFixed(5)}, ${Number(b.homeLongitude).toFixed(5)} · ${b.homeAltitude ?? "?"} m`
          : "Non renseigné",
    },
  ],
  titleOf: (b) => personName(b),
  extra: (b) => <TrackingPanel beneficiaryId={b.id} />,
  searchOf: (b) => `${personName(b)} ${b.project?.name ?? ""} ${b.email ?? ""}`,
  createRoles: BENEFICIARY_WRITERS,
  editRoles: BENEFICIARY_WRITERS,
  deleteRoles: ["ADMIN", "DIRECTION", "COORDINATOR"],
};

/* ------------------------------------------------------------------ */
/* ÉVALUATIONS                                                          */
/* ------------------------------------------------------------------ */
const EVALUATION_STATUS = ["DRAFT", "SUBMITTED", "VALIDATED"];

export const evaluationsConfig: ResourceConfig = {
  title: "Évaluations",
  singular: "une évaluation",
  basePath: "/evaluations",
  endpoint: "/evaluations",
  listKey: "data",
  itemKey: "data",
  columns: [
    { header: "Évaluation", render: (e) => <span className="font-medium text-gray-900">{e.title}</span> },
    { header: "Projet", render: (e) => e.project?.name ?? `#${e.projectId}` },
    { header: "Score", render: (e) => (e.score ?? e.score === 0 ? `${e.score}/100` : "—") },
    // ▼▼▼ NOVOAKO : Aseho amin'ny tabilao raha misy altitude ▼▼▼
    { header: "Altitude", render: (e) => (e.altitude ? `${e.altitude} m` : "—") },
    // ▲▲▲
    { header: "Date", render: (e) => fmtDate(e.evaluatedAt) },
    { header: "Évaluateur", render: (e) => personName(e.createdBy) },
    { header: "Statut", render: (e) => <StatusBadge status={e.status} /> },
  ],
  fields: [
    { name: "projectId", label: "Projet", type: "select", lookup: "projects", required: true },
    { name: "title", label: "Titre", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "score", label: "Score (0-100)", type: "number", min: 0, max: 100 },
    { name: "status", label: "Statut", type: "select", options: statusOptions(EVALUATION_STATUS) },
    { name: "evaluatedAt", label: "Date d'évaluation", type: "date" },
    
    // ▼▼▼ NOVOAKO : Sary miasa ho an'ny calcul altitude ▼▼▼
    { 
      name: "location", 
      label: "Position pour le calcul d'altitude", 
      type: "geo", 
      geoNames: { lat: "latitude", lng: "longitude" }, 
      full: true 
    },
    // ▲▲▲
  ],
  detail: (e) => [
    { label: "Projet", value: e.project?.name ?? `#${e.projectId}` },
    { label: "Score", value: e.score ?? e.score === 0 ? `${e.score}/100` : "—" },
    { label: "Statut", value: <StatusBadge status={e.status} /> },
    // ▼▼▼ NOVOAKO : Aseho amin'ny detail raha misy altitude ▼▼▼
    { label: "Altitude (m)", value: e.altitude ? `${e.altitude} m` : "Non calculée" },
    // ▲▲▲
    { label: "Date", value: fmtDate(e.evaluatedAt) },
    { label: "Évaluateur", value: personName(e.createdBy) },
    { label: "Description", value: e.description || "—" },
  ],
  titleOf: (e) => e.title,
  searchOf: (e) => `${e.title} ${e.project?.name ?? ""}`,
  statusFilter: { field: "status", options: statusOptions(EVALUATION_STATUS) },
  createRoles: ["ADMIN", "DIRECTION", "COORDINATOR", ...TUTEURS, ...STAGIAIRES],
  editRoles: ["ADMIN", "DIRECTION", "COORDINATOR", ...TUTEURS],
  deleteRoles: ["ADMIN", "DIRECTION", "COORDINATOR"],
};

/* ------------------------------------------------------------------ */
/* STAGES                                                               */
/* ------------------------------------------------------------------ */
const INTERNSHIP_STATUS = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const INTERNSHIP_WRITERS = ["ADMIN", "RH", "COORDINATOR", ...TUTEURS];

export const internshipsConfig: ResourceConfig = {
  title: "Stages",
  singular: "un stage",
  basePath: "/internships",
  endpoint: "/internships",
  listKey: "data",
  itemKey: "data",
  columns: [
    { header: "Stage", render: (i) => <span className="font-medium text-gray-900">{i.title}</span> },
    { header: "Stagiaire", render: (i) => personName(i.student) },
    { header: "Tuteur", render: (i) => personName(i.supervisor) },
    { header: "Établissement", render: (i) => i.institution || "—" },
    { header: "Période", render: (i) => period(i.startDate, i.endDate) },
    { header: "Statut", render: (i) => <StatusBadge status={i.status} /> },
  ],
  fields: [
    { name: "title", label: "Intitulé du stage", type: "text", required: true },
    { name: "projectId", label: "Projet", type: "select", lookup: "projects" },
    { name: "studentId", label: "Stagiaire", type: "select", lookup: "students", required: true, requiredUnless: "newPerson" },
    { name: "newPerson", label: "Nouveau stagiaire", type: "newperson", identityOf: "studentId", hideOnEdit: true, full: true },
    { name: "identity", label: "Informations du stagiaire", type: "identity", identityOf: "studentId", full: true },
    { name: "supervisorId", label: "Tuteur", type: "select", lookup: "tutors" },
    { name: "institution", label: "Établissement", type: "text" },
    { name: "startDate", label: "Date de début", type: "date" },
    { name: "endDate", label: "Date de fin", type: "date" },
    { name: "status", label: "Statut", type: "select", options: statusOptions(INTERNSHIP_STATUS), defaultValue: "IN_PROGRESS" },
    { name: "description", label: "Description", type: "textarea" },
  ],
  detail: (i) => [
    { label: "Stagiaire", value: personName(i.student) },
    { label: "Tuteur", value: personName(i.supervisor) },
    { label: "Projet", value: i.project?.name ?? "—" },
    { label: "Établissement", value: i.institution || "—" },
    { label: "Période", value: period(i.startDate, i.endDate) },
    { label: "Statut", value: <StatusBadge status={i.status} /> },
    { label: "Description", value: i.description || "—" },
  ],
  titleOf: (i) => i.title,
  searchOf: (i) => `${i.title} ${personName(i.student)} ${personName(i.supervisor)} ${i.institution ?? ""}`,
  statusFilter: { field: "status", options: statusOptions(INTERNSHIP_STATUS) },
  createRoles: INTERNSHIP_WRITERS,
  editRoles: INTERNSHIP_WRITERS,
  deleteRoles: ["ADMIN", "RH"],
};

/* ------------------------------------------------------------------ */
/* MEMBRES (comptes utilisateurs du personnel)                          */
/* ------------------------------------------------------------------ */
export const membersConfig: ResourceConfig = {
  title: "Membres",
  singular: "un membre",
  basePath: "/members",
  endpoint: "/members",
  listKey: "members",
  itemKey: "member",
  columns: [
    { header: "Nom", render: (m) => <span className="font-medium text-gray-900">{personName(m)}</span> },
    { header: "Email", render: (m) => m.email },
    { header: "Rôle", render: (m) => roleLabel(m.role) },
    { header: "Département", render: (m) => m.department?.name ?? "—" },
    { header: "Statut", render: (m) => <StatusBadge status={m.status} /> },
  ],
  fields: [
    { name: "firstName", label: "Prénom (facultatif)", type: "text" },
    { name: "lastName", label: "Nom", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Téléphone", type: "text" },
    { name: "gender", label: "Genre", type: "select", options: GENDERS },
    {
      name: "role",
      label: "Rôle",
      type: "select",
      options: ASSIGNABLE_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] })),
    },
    { name: "departmentId", label: "Département", type: "select", lookup: "departments" },
  ],
  detail: (m) => [
    { label: "Email", value: m.email },
    { label: "Téléphone", value: m.phone || "—" },
    { label: "Rôle", value: roleLabel(m.role) },
    { label: "Département", value: m.department?.name ?? "—" },
    { label: "Statut", value: statusLabel(m.status) },
    { label: "Fonction", value: m.fonction || "—" },
    { label: "Matricule", value: m.matricule || "—" },
    { label: "Localisation", value: m.localisation || "—" },
  ],
  titleOf: (m) => personName(m),
  searchOf: (m) => `${personName(m)} ${m.email} ${roleLabel(m.role)} ${m.department?.name ?? ""}`,
  statusFilter: {
    field: "status",
    options: statusOptions(["ACTIVE", "INACTIVE", "PENDING", "REJECTED"]),
  },
  createRoles: ["ADMIN"],
  createHref: "/users/create",
  editRoles: ["ADMIN", "RH"],
  deleteRoles: ["ADMIN", "RH"],
  deleteMode: "deactivate",
};

/* ------------------------------------------------------------------ */
/* DÉPARTEMENTS                                                         */
/* ------------------------------------------------------------------ */
export const departementsConfig: ResourceConfig = {
  title: "Départements",
  singular: "un département",
  basePath: "/departements",
  endpoint: "/departements",
  listKey: "departments",
  itemKey: "department",
  columns: [
    { header: "Code", render: (d) => d.code },
    { header: "Nom", render: (d) => <span className="font-medium text-gray-900">{d.name}</span> },
    { header: "Description", render: (d) => d.description || "—" },
  ],
  fields: [
    { name: "name", label: "Nom", type: "text", required: true },
    { name: "code", label: "Code", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
  ],
  detail: (d) => [
    { label: "Code", value: d.code },
    { label: "Description", value: d.description || "—" },
    { label: "Créé le", value: fmtDate(d.createdAt) },
  ],
  titleOf: (d) => d.name,
  searchOf: (d) => `${d.name} ${d.code} ${d.description ?? ""}`,
  createRoles: ["ADMIN", "DSI"],
  editRoles: ["ADMIN", "DSI"],
  deleteRoles: ["ADMIN"],
};

/* ------------------------------------------------------------------ */
/* GRILLES D'ÉVALUATION                                                 */
/* ------------------------------------------------------------------ */
const EVAL_CONFIG_ROLES = ["ADMIN", "DIRECTION", "COORDINATOR"];

export const gridsConfig: ResourceConfig = {
  title: "Grilles d'évaluation",
  singular: "une grille",
  basePath: "/evaluations/grids",
  endpoint: "/evaluation-grids",
  listKey: "data",
  itemKey: "data",
  columns: [
    { header: "Grille", render: (g) => <span className="font-medium text-gray-900">{g.name}</span> },
    { header: "Critères", render: (g) => (Array.isArray(g.criteria) ? g.criteria.length : 0) },
    { header: "Description", render: (g) => g.description || "—" },
    { header: "Créée le", render: (g) => fmtDate(g.createdAt) },
  ],
  fields: [
    { name: "name", label: "Nom de la grille", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    {
      name: "criteriaText",
      label: "Critères — un par ligne : Libellé | poids",
      type: "textarea",
      full: true,
    },
  ],
  detail: (g) => [
    { label: "Description", value: g.description || "—" },
    {
      label: "Critères",
      value: (
        <ul className="space-y-1 text-right">
          {(g.criteria ?? []).map((c: { label: string; weight: number }) => (
            <li key={c.label}>
              {c.label} <span className="text-gray-400">(poids {c.weight})</span>
            </li>
          ))}
        </ul>
      ),
    },
    { label: "Créée le", value: fmtDate(g.createdAt) },
  ],
  titleOf: (g) => g.name,
  searchOf: (g) => `${g.name} ${g.description ?? ""}`,
  createRoles: EVAL_CONFIG_ROLES,
  editRoles: EVAL_CONFIG_ROLES,
  deleteRoles: ["ADMIN", "DIRECTION"],
};

/* ------------------------------------------------------------------ */
/* CAMPAGNES D'ÉVALUATION                                               */
/* ------------------------------------------------------------------ */
const CAMPAIGN_STATUS = ["DRAFT", "ACTIVE", "CLOSED"];

export const campaignsConfig: ResourceConfig = {
  title: "Campagnes d'évaluation",
  singular: "une campagne",
  basePath: "/evaluations/campaigns",
  endpoint: "/evaluation-campaigns",
  listKey: "data",
  itemKey: "data",
  columns: [
    { header: "Campagne", render: (c) => <span className="font-medium text-gray-900">{c.name}</span> },
    { header: "Période", render: (c) => period(c.startDate, c.endDate) },
    { header: "Statut", render: (c) => <StatusBadge status={c.status} /> },
  ],
  fields: [
    { name: "name", label: "Nom de la campagne", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "projectId", label: "Projet concerné", type: "select", lookup: "projects" },
    { name: "gridId", label: "Grille utilisée", type: "select", lookup: "grids" },
    { name: "startDate", label: "Début", type: "date" },
    { name: "endDate", label: "Fin", type: "date" },
    { name: "status", label: "Statut", type: "select", options: statusOptions(CAMPAIGN_STATUS) },
  ],
  detail: (c) => [
    { label: "Statut", value: <StatusBadge status={c.status} /> },
    { label: "Période", value: period(c.startDate, c.endDate) },
    { label: "Projet", value: c.projectId ? `#${c.projectId}` : "—" },
    { label: "Grille", value: c.gridId ? `#${c.gridId}` : "—" },
    { label: "Description", value: c.description || "—" },
  ],
  titleOf: (c) => c.name,
  searchOf: (c) => `${c.name} ${c.description ?? ""}`,
  statusFilter: { field: "status", options: statusOptions(CAMPAIGN_STATUS) },
  createRoles: EVAL_CONFIG_ROLES,
  editRoles: EVAL_CONFIG_ROLES,
  deleteRoles: ["ADMIN", "DIRECTION"],
};

/* ------------------------------------------------------------------ */
/* ZONES D'INTERVENTION                                                 */
/* ------------------------------------------------------------------ */
export const zonesConfig: ResourceConfig = {
  title: "Zones d'intervention",
  subtitle: "Villes et régions où l'ONG intervient — affichées sur la carte et la page d'accueil.",
  singular: "une zone",
  basePath: "/zones",
  endpoint: "/zones",
  listKey: "data",
  itemKey: "data",
  columns: [
    {
      header: "Zone",
      render: (z) => (
        <span className="font-medium text-gray-900">
          {z.name}
          {z.isHeadquarters && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Siège</span>
          )}
        </span>
      ),
    },
    { header: "Région", render: (z) => z.region || "—" },
    { header: "Adresse", render: (z) => z.address || "—" },
    { header: "Coordonnées", render: (z) => `${Number(z.latitude).toFixed(4)}, ${Number(z.longitude).toFixed(4)}` },
    { header: "Statut", render: (z) => <StatusBadge status={z.isActive ? "ACTIVE" : "INACTIVE"} /> },
  ],
  fields: [
    { name: "name", label: "Nom de la zone (ex. Toamasina)", type: "text", required: true },
    { name: "region", label: "Région", type: "text" },
    { name: "address", label: "Adresse postale", type: "text", full: true },
    { name: "phone", label: "Téléphone", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "radiusKm", label: "Rayon d'intervention (km)", type: "number", min: 0 },
    { name: "center", label: "Position (cliquez sur la carte)", type: "geo", geoNames: { lat: "latitude", lng: "longitude" }, full: true },
    { name: "isHeadquarters", label: "Siège de l'ONG (affiché sur la page d'accueil)", type: "checkbox" },
    { name: "isActive", label: "Zone active", type: "checkbox", defaultValue: true },
  ],
  detail: (z) => [
    { label: "Région", value: z.region || "—" },
    { label: "Adresse", value: z.address || "—" },
    { label: "Téléphone", value: z.phone || "—" },
    { label: "Email", value: z.email || "—" },
    { label: "Coordonnées", value: `${Number(z.latitude).toFixed(5)}, ${Number(z.longitude).toFixed(5)}` },
    { label: "Rayon", value: z.radiusKm ? `${z.radiusKm} km` : "—" },
    { label: "Siège", value: z.isHeadquarters ? "Oui" : "Non" },
  ],
  titleOf: (z) => z.name,
  searchOf: (z) => `${z.name} ${z.region ?? ""} ${z.address ?? ""}`,
  createRoles: ["ADMIN", "DIRECTION"],
  editRoles: ["ADMIN", "DIRECTION"],
  deleteRoles: ["ADMIN"],
};

/* ------------------------------------------------------------------ */
/* CERTIFICATS (création via une page dédiée)                           */
/* ------------------------------------------------------------------ */
const CERT_TYPES: Record<string, string> = {
  INTERNSHIP: "Stage",
  VOLUNTEER: "Bénévolat",
  STAFF: "Mission / emploi",
  TRAINING: "Formation",
};

export const certificatesConfig: ResourceConfig = {
  title: "Certificats",
  subtitle: "Certificats vérifiables par QR code.",
  singular: "un certificat",
  basePath: "/certificates",
  endpoint: "/certificates",
  listKey: "data",
  itemKey: "data",
  columns: [
    { header: "Code", render: (c) => <span className="font-mono text-xs font-semibold text-blue-900">{c.code}</span> },
    { header: "Titulaire", render: (c) => <span className="font-medium text-gray-900">{c.holderName}</span> },
    { header: "Type", render: (c) => CERT_TYPES[c.type] ?? c.type },
    { header: "Intitulé", render: (c) => c.title },
    { header: "Délivré le", render: (c) => fmtDate(c.createdAt) },
    { header: "Statut", render: (c) => <StatusBadge status={c.revokedAt ? "REVOKED" : "VALID"} /> },
  ],
  fields: [
    { name: "code", label: "Code", type: "text" },
    { name: "holderName", label: "Titulaire", type: "text" },
    { name: "title", label: "Intitulé", type: "text" },
    { name: "type", label: "Type", type: "text" },
  ],
  detail: () => [],
  titleOf: (c) => c.holderName,
  searchOf: (c) => `${c.code} ${c.holderName} ${c.title}`,
  createRoles: ["ADMIN", "DIRECTION", "RH"],
  editRoles: [],
  deleteRoles: ["ADMIN", "DIRECTION"],
  deleteLabel: "Révoquer",
};