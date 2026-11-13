// src/utils/chatLangRules.ts — règles PURES du chatbot (testables sans base de données).
// 1) détection de langue FR / EN / MG ; 2) glossaire métier trilingue unique (aligné sur
// srcf/src/lib/i18n/dictionaries.ts : le dictionnaire de l'interface fait foi) ;
// 3) normalisation d'une question vers des « concepts » indépendants de la langue.

export type ChatLang = "fr" | "en" | "mg";

/** Minuscules, sans accents, apostrophes unifiées, espaces compactés. */
export function norm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`´]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const words = (text: string): string[] => norm(text).split(/[^a-z0-9']+/).filter(Boolean);

/* Mots-outils très fréquents et propres à chaque langue (aucun mot partagé entre deux listes). */
const MARKERS: Record<ChatLang, ReadonlySet<string>> = {
  fr: new Set(
    "le la les un une des du de au aux et ou est sont quel quels quelle quelles combien comment pourquoi ou je tu nous vous mon ma mes pour avec dans sur par qui que quoi ce cette ces cet y a ont fait faire peut peux puis-je donne montre liste affiche compare plus moins entre bonjour merci salut aide stp svp traduis traduire traduction malgache anglais francais valider".split(" "),
  ),
  en: new Set(
    "the a an of to for in on at and or is are was were what which who whom how many much why where when my your our show give list display compare more less between hello hi thanks thank please help me can could do does did have has it this that these those with from translate into say save validate late".split(" "),
  ),
  mg: new Set(
    "ny ao aiza firy iza inona ahoana nahoana oviana azafady misaotra salama manao mba sy dia no ve fa na izay ireo io ity izany an' amin' amin ho hoe tsy misy mety afaka azo ahy anao aho izahay isika hijery hanao hampiseho asehoy lazao ampitaho mamaly mila ilay izy fa ary koa raha rehefa satria noho any eto ireny ireto adikao dikao adika frantsay anglisy dikan'ny filazana".split(" "),
  ),
};

/** Mots-clés métier très discriminants (comptent double). */
const DOMAIN: Record<ChatLang, ReadonlySet<string>> = {
  fr: new Set("projet projets activite activites beneficiaire beneficiaires menage menages stage stagiaire evaluation evaluations rapport rapports zone zones anomalie anomalies presence presences jalon jalons".split(" ")),
  en: new Set("project projects activity activities beneficiary beneficiaries household households internship intern interns evaluation evaluations report reports area areas attendance milestone milestones".split(" ")),
  mg: new Set("tetikasa hetsika mpahazo tombontsoa mpandray anjara tokantrano ankohonana mpianatra fanombanana tatitra faritra fanatrehana dingana marefo mpiasa mpandrindra fampandrenesana fiteny teny miafina fidirana".split(" ")),
};

export interface LangGuess {
  lang: ChatLang;
  /** true si la langue vient du texte (et non du repli). */
  confident: boolean;
  scores: Record<ChatLang, number>;
}

/**
 * Détecte la langue de la question. `hint` = langue de l'interface, utilisée seulement si le texte est ambigu
 * (une seule mot, nom de lieu, etc.). Sans indice, repli sur le français (langue de référence du projet).
 */
export function detectLang(text: string, hint?: ChatLang | null): LangGuess {
  const tokens = words(text);
  const scores: Record<ChatLang, number> = { fr: 0, en: 0, mg: 0 };
  for (const t of tokens) {
    for (const l of ["fr", "en", "mg"] as ChatLang[]) {
      if (MARKERS[l].has(t)) scores[l] += 1;
      if (DOMAIN[l].has(t)) scores[l] += 2;
    }
  }
  const ranked = (Object.keys(scores) as ChatLang[]).sort((a, b) => scores[b] - scores[a]);
  const [best, second] = ranked;
  if (scores[best] === 0 || scores[best] === scores[second]) {
    return { lang: hint ?? (scores[best] > 0 && best === "mg" ? "mg" : "fr"), confident: false, scores };
  }
  return { lang: best, confident: true, scores };
}

/* ------------------------------------------------------------------------------------------------ */
/* Glossaire métier : UN seul vocabulaire par langue (même mot que l'interface, cf. dictionaries.ts). */
/* `match` = formes (sans accents) reconnues dans une question ; `label` = forme affichée en réponse.   */
/* ------------------------------------------------------------------------------------------------ */

export type Concept =
  | "project" | "activity" | "beneficiary" | "household" | "internship" | "intern" | "evaluation" | "report"
  | "zone" | "milestone" | "anomaly" | "notification" | "coordinator" | "agent" | "dropout" | "vulnerable"
  | "attendance" | "certificate" | "password" | "login" | "language" | "role" | "dashboard" | "export"
  | "model" | "map" | "partner" | "budget" | "objective" | "consent" | "count" | "late" | "help";

interface Entry {
  label: Record<ChatLang, string>;
  match: string[]; // expressions régulières (sur texte normalisé), toutes langues confondues
}

export const GLOSSARY: Record<Concept, Entry> = {
  project: { label: { fr: "projet", en: "project", mg: "tetikasa" }, match: ["projet", "project", "tetikasa"] },
  activity: { label: { fr: "activité", en: "activity", mg: "hetsika" }, match: ["activite", "activit(?:y|ies)", "hetsika"] },
  beneficiary: { label: { fr: "bénéficiaire", en: "beneficiary", mg: "mpahazo tombontsoa" }, match: ["beneficiaire", "beneficiar", "mpahazo tombontsoa", "mpandray anjara", "mpahazo"] },
  household: { label: { fr: "ménage", en: "household", mg: "tokantrano" }, match: ["menage", "household", "tokantrano", "ankohonana"] },
  internship: { label: { fr: "stage", en: "internship", mg: "stage" }, match: ["stage", "internship", "fanofanana"] },
  intern: { label: { fr: "stagiaire", en: "intern", mg: "stagiaire" }, match: ["stagiaire", "interns?\\b", "trainee", "mpianatra"] },
  evaluation: { label: { fr: "évaluation", en: "evaluation", mg: "fanombanana" }, match: ["evaluation", "assessment", "fanombanana", "naoty", "note"] },
  report: { label: { fr: "rapport", en: "report", mg: "tatitra" }, match: ["rapport", "report", "tatitra"] },
  zone: { label: { fr: "zone d'intervention", en: "intervention zone", mg: "faritra iasana" }, match: ["zone", "faritra", "\\barea"] },
  milestone: { label: { fr: "jalon", en: "milestone", mg: "dingana" }, match: ["jalon", "milestone", "dingana"] },
  anomaly: { label: { fr: "anomalie", en: "anomaly", mg: "anomalie" }, match: ["anomali", "hadisoana", "tsy mahazatra", "irregular"] },
  notification: { label: { fr: "notification", en: "notification", mg: "fampandrenesana" }, match: ["notification", "fampandrenesana", "alert(?:e|s)?\\b"] },
  coordinator: { label: { fr: "coordinateur", en: "coordinator", mg: "mpandrindra" }, match: ["coordinat", "mpandrindra"] },
  agent: { label: { fr: "agent", en: "field agent", mg: "mpiasa" }, match: ["agent", "field (?:agent|staff|worker)", "staff", "mpiasa"] },
  dropout: { label: { fr: "abandon", en: "dropout", mg: "fijanonana" }, match: ["abandon", "drop ?out", "fijanonana", "nijanona", "loza hijanonana", "risque d'abandon"] },
  vulnerable: { label: { fr: "vulnérable", en: "vulnerable", mg: "marefo" }, match: ["vulnerab", "marefo", "mahantra", "pauvre", "poor", "fragile"] },
  attendance: { label: { fr: "présence", en: "attendance", mg: "fanatrehana" }, match: ["presence", "attendance", "fanatrehana", "fisiana", "pointage", "check.?in"] },
  certificate: { label: { fr: "certificat", en: "certificate", mg: "taratasy fanamarinana" }, match: ["certificat", "certificate", "taratasy fanamarinana", "attestation"] },
  password: { label: { fr: "mot de passe", en: "password", mg: "teny miafina" }, match: ["mot de passe", "password", "teny miafina", "mdp"] },
  login: { label: { fr: "connexion", en: "login", mg: "fidirana" }, match: ["connexion", "se connecter", "log ?in", "sign ?in", "fidirana", "hiditra"] },
  language: { label: { fr: "langue", en: "language", mg: "fiteny" }, match: ["langue", "language", "fiteny", "malagasy", "anglais", "english", "francais", "french"] },
  role: { label: { fr: "rôle", en: "role", mg: "andraikitra" }, match: ["role", "andraikitra", "permission", "droits? d'acces", "access right"] },
  dashboard: { label: { fr: "tableau de bord", en: "dashboard", mg: "tabilao fitarihana" }, match: ["tableau de bord", "dashboard", "tabilao"] },
  export: { label: { fr: "export", en: "export", mg: "fanondranana" }, match: ["export", "telecharg", "download", "fanondranana", "alaina", "excel", "csv"] },
  model: { label: { fr: "modèle", en: "model", mg: "modely" }, match: ["modele", "model\\b", "modely", "sgd", "neurone", "neural", "fiabilite", "reliab", "accuracy", "precision"] },
  map: { label: { fr: "carte", en: "map", mg: "sarintany" }, match: ["carte", "\\bmap\\b", "sarintany", "gps"] },
  partner: { label: { fr: "partenaire", en: "partner", mg: "mpiara-miasa" }, match: ["partenaire", "partner", "mpiara-miasa", "mpiara miasa"] },
  budget: { label: { fr: "budget", en: "budget", mg: "teti-bola" }, match: ["budget", "teti-bola", "teti bola"] },
  objective: { label: { fr: "objectif", en: "objective", mg: "tanjona" }, match: ["objectif", "objective", "goal", "tanjona", "indicat"] },
  consent: { label: { fr: "consentement", en: "consent", mg: "fanekena" }, match: ["consent", "fanekena"] },
  count: { label: { fr: "combien", en: "how many", mg: "firy" }, match: ["combien", "how many", "number of", "\\bnombre", "\\btotal", "\\bfiry\\b", "\\bisan"] },
  late: { label: { fr: "en retard", en: "late", mg: "tara" }, match: ["retard", "\\blate\\b", "overdue", "\\btara\\b", "mihoatra ny daty", "depasse"] },
  help: { label: { fr: "aide", en: "help", mg: "fanampiana" }, match: ["^(?:aide|help|fanampiana)\\b", "que sais", "what can you", "inona no azonao", "comment (?:ca )?marche", "how does (?:it|this) work", "ahoana no fampiasana"] },
};

const COMPILED = Object.fromEntries(
  (Object.keys(GLOSSARY) as Concept[]).map((c) => [c, GLOSSARY[c].match.map((m) => new RegExp(m))]),
) as Record<Concept, RegExp[]>;

/** Ensemble des concepts présents dans la question (indépendant de la langue). */
export function concepts(text: string): Set<Concept> {
  const t = norm(text);
  const found = new Set<Concept>();
  for (const c of Object.keys(COMPILED) as Concept[]) if (COMPILED[c].some((re) => re.test(t))) found.add(c);
  return found;
}

/** Terme affiché dans la langue demandée (toujours le même mot que l'interface). */
export function term(concept: Concept, lang: ChatLang, plural = false): string {
  const base = GLOSSARY[concept].label[lang];
  if (!plural) return base;
  if (lang === "mg") return base; // le malagasy ne marque pas le pluriel sur le nom
  if (lang === "en") return base.endsWith("y") ? base.slice(0, -1) + "ies" : base + "s";
  return base.endsWith("al") ? base.slice(0, -2) + "aux" : base.endsWith("x") || base.endsWith("s") ? base : base + "s";
}

/** Sélecteur de texte par langue : T({fr, en, mg}, lang). Repli sur le français si une langue manque. */
export function pick<T>(texts: Partial<Record<ChatLang, T>> & { fr: T }, lang: ChatLang): T {
  return texts[lang] ?? texts.fr;
}

/** Libellés de statut (valeurs Prisma) dans les trois langues, mêmes mots que les écrans. */
export const STATUS_LABEL: Record<string, Record<ChatLang, string>> = {
  DRAFT: { fr: "Brouillon", en: "Draft", mg: "Volavolana" },
  ACTIVE: { fr: "Actif", en: "Active", mg: "Mavitrika" },
  SUSPENDED: { fr: "Suspendu", en: "Suspended", mg: "Nijanona vetivety" },
  COMPLETED: { fr: "Terminé", en: "Completed", mg: "Vita" },
  CANCELLED: { fr: "Annulé", en: "Cancelled", mg: "Nofoanana" },
  PLANNED: { fr: "Planifiée", en: "Planned", mg: "Voaplanina" },
  IN_PROGRESS: { fr: "En cours", en: "In progress", mg: "Mandeha" },
  PENDING: { fr: "En attente", en: "Pending", mg: "Miandry" },
  SUBMITTED: { fr: "Soumise", en: "Submitted", mg: "Nalefa" },
  VALIDATED: { fr: "Validée", en: "Validated", mg: "Nankatoavina" },
};

export function statusLabel(code: string, lang: ChatLang): string {
  return STATUS_LABEL[code]?.[lang] ?? code;
}
