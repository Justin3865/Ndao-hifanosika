import { prisma } from "../config/database";
import { db } from "../utils/db";
import { answerAnomalyQuestion } from "../services/anomalyChat.service";
import { answerProjectQuestion } from "../services/projectChat.service";
import { haversineKm, normalizeText } from "./geo";
import { ScoredHousehold, listModels, scoreHouseholds, trainVulnerabilityModels } from "./vulnerability";
import { ChatLang, concepts, detectLang, pick } from "../utils/chatLangRules";
import { knowledgeAnswer, knowledgeSuggestions, matchKnowledge } from "../utils/chatKnowledgeRules";
import { buildLexicon, parseTranslateRequest, translateWithLexicon, TranslateRequest } from "../utils/chatTranslateRules";
import { LEXICON_BASE } from "../data/lexicon";

/* Assistant conversationnel du projet Ndao Hifanosika : comprend le français, l'anglais et le malagasy (langue détectée dans la
   question, repli sur la langue de l'interface), répond dans la MÊME langue avec le vocabulaire de l'interface, interroge les vraies
   données (ménages, projets, activités, bénéficiaires, évaluations, stages, anomalies), explique le fonctionnement de la plateforme
   (base de connaissances) et traduit FR ↔ EN ↔ MG à partir du lexique validé. Règles d'intention : pas de LLM externe, aucun chiffre inventé. */

export interface MapPoint {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  kind: "household" | "staff";
  score?: number;
  altitude?: number | null;
  info?: string;
}

export interface ChatAnswer {
  reply: string;
  table?: { columns: string[]; rows: Array<Array<string | number>> };
  map?: { points: MapPoint[]; lines: Array<{ from: string; to: string; label: string }> };
  suggestions: string[];
  /** Langue dans laquelle la réponse a été rédigée (détectée dans la question). */
  lang?: ChatLang;
}

interface Staff {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  updatedAt: Date | null;
}

const LEXICON = buildLexicon(LEXICON_BASE);
const has = (text: string, regex: RegExp) => regex.test(text);
const avg = (values: Array<number | null>) => {
  const v = values.filter((x): x is number => x !== null && Number.isFinite(x));
  return v.length ? v.reduce((a, c) => a + c, 0) / v.length : null;
};
const fmt = (n: number | null, digits = 0) => (n === null ? "—" : n.toFixed(digits));

const LANG_NAME: Record<ChatLang, Record<ChatLang, string>> = {
  fr: { fr: "français", en: "anglais", mg: "malgache" },
  en: { fr: "French", en: "English", mg: "Malagasy" },
  mg: { fr: "frantsay", en: "anglisy", mg: "malagasy" },
};

async function loadStaff(): Promise<Staff[]> {
  const users = await prisma.user.findMany({
    where: { sharingLocation: true, latitude: { not: null }, longitude: { not: null } },
    select: { id: true, firstName: true, lastName: true, latitude: true, longitude: true, altitude: true, locationUpdatedAt: true },
  });

  const limit = Date.now() - 6 * 3600 * 1000;

  return users
    .filter((u) => u.locationUpdatedAt && u.locationUpdatedAt.getTime() > limit)
    .map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      latitude: u.latitude as number,
      longitude: u.longitude as number,
      altitude: u.altitude,
      updatedAt: u.locationUpdatedAt,
    }));
}

function nearestStaff(h: ScoredHousehold, staff: Staff[]) {
  if (h.latitude === null || h.longitude === null) return null;

  const ranked = staff
    .map((s) => ({ staff: s, km: haversineKm(h.latitude as number, h.longitude as number, s.latitude, s.longitude) }))
    .sort((a, b) => a.km - b.km);

  return ranked[0] ?? null;
}

/** Demande de traduction : réponse issue du lexique validé uniquement (jamais de traduction improvisée). */
function translateAnswer(req: TranslateRequest, lang: ChatLang, suggestions: string[]): ChatAnswer {
  const r = translateWithLexicon(req.phrase, req.target, LEXICON, req.source);
  const tname = LANG_NAME[lang][req.target];
  const cols = [pick({ fr: "Langue", en: "Language", mg: "Fiteny" }, lang), pick({ fr: "Texte", en: "Text", mg: "Soratra" }, lang)];
  const sideBySide = (e: { fr: string; en?: string; mg?: string }) => ({ columns: cols, rows: [["FR", e.fr], ["EN", e.en ?? "—"], ["MG", e.mg ?? "—"]] as Array<Array<string>> });

  if (r.kind === "exact") {
    return {
      reply: pick({
        fr: `En ${tname}, « ${r.from} » se dit : « ${r.text} ».`,
        en: `In ${tname}, “${r.from}” is: “${r.text}”.`,
        mg: `Amin'ny teny ${tname}, ny « ${r.from} » dia: « ${r.text} ».`,
      }, lang),
      table: sideBySide(r.entry),
      suggestions,
    };
  }
  if (r.kind === "same") {
    return {
      reply: pick({ fr: `« ${r.text} » est déjà en ${tname}.`, en: `“${r.text}” is already in ${tname}.`, mg: `Ny « ${r.text} » dia amin'ny teny ${tname} ihany.` }, lang),
      table: sideBySide(r.entry),
      suggestions,
    };
  }
  if (r.kind === "missing-target") {
    return {
      reply: pick({
        fr: `Je connais « ${r.from} » mais le dictionnaire du projet n'a pas encore sa version en ${tname}.`,
        en: `I know “${r.from}” but the project dictionary does not have its ${tname} version yet.`,
        mg: `Fantatro ny « ${r.from} » nefa mbola tsy ao amin'ny diksionera ny dikany amin'ny teny ${tname}.`,
      }, lang),
      table: sideBySide(r.entry),
      suggestions,
    };
  }
  const rows: Array<Array<string>> = [...r.terms, ...r.similar].map((x) => [x.from, x.to]);
  return {
    reply: pick({
      fr: `Cette phrase n'est pas dans le dictionnaire validé du projet : je préfère ne pas inventer une traduction approximative en ${tname}.${rows.length ? " Voici les termes ou expressions proches que je connais :" : " Essayez un terme ou une expression de l'interface (ex. « Enregistrer », « Bénéficiaires »)."}`,
      en: `That sentence is not in the project's validated dictionary: I would rather not invent an approximate ${tname} translation.${rows.length ? " Here are the close terms or expressions I know:" : " Try a term or expression from the interface (e.g. “Save”, “Beneficiaries”)."}`,
      mg: `Tsy ao amin'ny diksionera voamarina ao amin'ny tetikasa ity fehezanteny ity: tsy te-hamorona dikan-teny tombanana amin'ny teny ${tname} aho.${rows.length ? " Ireto ny teny na fehezanteny akaiky fantatro:" : " Andramo ny teny na fehezanteny ao amin'ny interface (ohatra: « Tahirizina », « Mpahazo tombontsoa »)."}`,
    }, lang),
    table: rows.length ? { columns: [pick({ fr: "Connu", en: "Known", mg: "Fantatra" }, lang), tname], rows } : undefined,
    suggestions,
  };
}

async function answer(message: string, role: string | undefined, userId: number | undefined, uiLang: ChatLang | undefined): Promise<ChatAnswer> {
  const raw = message.trim();
  const text = normalizeText(raw);
  const lang = detectLang(raw, uiLang).lang;
  const L = (fr: string, mg: string, en: string) => pick({ fr, mg, en }, lang);

  const suggestions = [
    L("Quels sont les ménages les plus vulnérables ?", "Iza avy ireo tokantrano marefo indrindra?", "Which households are the most vulnerable?"),
    L("Combien de projets sont actifs ?", "Firy ny tetikasa mavitrika?", "How many projects are active?"),
    L("Quel agent est le plus proche du ménage prioritaire ?", "Iza no mpiasa akaiky indrindra ny tokantrano laharam-pahamehana?", "Which agent is closest to the priority household?"),
    L("Comment ajouter un bénéficiaire ?", "Ahoana no hanampiana mpahazo tombontsoa?", "How do I add a beneficiary?"),
  ];

  /* ---- traduction FR / EN / MG ---- */
  const tr = parseTranslateRequest(raw);
  if (tr) {
    const trLang = detectLang(raw, uiLang).lang;
    return translateAnswer(tr, trLang, [
      L("Traduis « Enregistrer » en malgache", "Adikao amin'ny frantsay: Tahirizina", "Translate “Save” into Malagasy"),
      L("Comment dit-on bénéficiaire en anglais ?", "Inona ny dikan'ny fanombanana amin'ny teny anglisy?", "How do you say tetikasa in French?"),
    ]);
  }

  // Questions sur les anomalies / jours non ouvrables / vérification avant la note (null = autre sujet).
  const anomalyAnswer = await answerAnomalyQuestion(text, lang, role, userId).catch(() => null);
  if (anomalyAnswer) return anomalyAnswer;

  /* ---- salutations ---- */
  if (has(text, /^(bonjour|bonsoir|salut|coucou|hello|hi\b|hey|good (morning|evening|afternoon)|salama|manao ahoana|akory)/)) {
    return {
      reply: L(
        "Bonjour ! Je réponds en français, anglais ou malagasy. Demandez-moi par exemple : « Combien de projets sont actifs ? », « Quels sont les ménages les plus vulnérables à Fianarantsoa ? », « Comment ajouter un bénéficiaire ? », « Compare Ankalamavony et Andraindrato » ou « Traduis Enregistrer en malgache ».",
        "Salama! Mamaly amin'ny teny malagasy, frantsay na anglisy aho. Azonao fanontaniana ohatra: « Firy ny tetikasa mavitrika? », « Iza avy ny tokantrano marefo indrindra ao Fianarantsoa? », « Ahoana no hanampiana mpahazo tombontsoa? », « Ampitaho Ankalamavony sy Andraindrato » na « Adikao amin'ny frantsay: Tahirizina ».",
        "Hello! I answer in French, English or Malagasy. Try for example: “How many projects are active?”, “Which households are the most vulnerable in Fianarantsoa?”, “How do I add a beneficiary?”, “Compare Ankalamavony and Andraindrato” or “Translate Save into Malagasy”.",
      ),
      suggestions,
    };
  }

  /* ---- « comment / où / pourquoi… » : explication du fonctionnement du projet (base de connaissances) ---- */
  const kb = matchKnowledge(raw);
  const howTo = /\b(comment|pourquoi|ou (?:est|puis|trouver|voir)|qu'est|a quoi sert|how (?:do|to|can|does|is)|why|where (?:is|can|do)|what is|ahoana|nahoana|aiza no|inona (?:no|ity|ny))\b/.test(text) || has(text, /^(aide|help|fanampiana)\b/);
  if (kb && (howTo || kb.entry.id === "help")) {
    return { reply: knowledgeAnswer(kb.entry, lang), suggestions: knowledgeSuggestions(kb.entry, lang), lang };
  }

  /* ---- commande : entraîner les modèles ---- */
  if (
    has(text, /^(entrain|train|ampiofan)/) ||
    has(text, /(lance|lancer|relance|refais|fais|faire|atombohy|ampiofano|run|start|retrain).*(entrain|train|apprentissage|modele|model|ampiofan)/)
  ) {
    if (role !== "ADMIN") {
      return {
        reply: L(
          "Seul l'administrateur peut lancer l'entraînement des modèles (menu Analyses IA › Modèles).",
          "Ny mpitantana (administratera) ihany no afaka manomboka ny fampiofanana ny modely (menio Famakafakana IA › Modely).",
          "Only the administrator can start model training (AI Analyses › Models menu).",
        ),
        suggestions,
      };
    }

    const report = await trainVulnerabilityModels();

    if (!report.trained) {
      return {
        reply: L(
          `Entraînement impossible : ${report.reason ?? "données insuffisantes"}`,
          `Tsy afaka ny fampiofanana: ${report.reason ?? "tsy ampy ny angon-drakitra"}`,
          `Training is not possible: ${report.reason ?? "insufficient data"}`,
        ),
        suggestions,
      };
    }

    return {
      reply: L(
        `Entraînement terminé sur ${report.sampleSize} ménages (${report.positives} vulnérables, validation croisée ${report.folds} plis). Fiabilité : ${report.reliability.toLowerCase()}.`,
        `Vita ny fampiofanana tamin'ny tokantrano ${report.sampleSize} (marefo ${report.positives}). Fahatokisana: ${report.reliability.toLowerCase()}.`,
        `Training finished on ${report.sampleSize} households (${report.positives} vulnerable, ${report.folds}-fold cross-validation). Reliability: ${report.reliability.toLowerCase()}.`,
      ),
      table: {
        columns: [L("Modèle", "Modely", "Model"), L("Exactitude", "Fahamarinana", "Accuracy"), L("Précision", "Fahamarinana lavitra", "Precision"), L("Rappel", "Fahatsiarovana", "Recall"), "F1", "AUC"],
        rows: [
          [L("Référence (majorité)", "Fototra (maro indrindra)", "Baseline (majority)"), `${Math.round(report.baseline.accuracy * 100)} %`, "—", "—", "—", "—"],
          ...report.models.map((m) => [
            m.name,
            `${Math.round(m.metrics.accuracy * 100)} %`,
            `${Math.round(m.metrics.precision * 100)} %`,
            `${Math.round(m.metrics.recall * 100)} %`,
            m.metrics.f1.toFixed(2),
            m.metrics.auc.toFixed(2),
          ]),
        ],
      },
      suggestions,
    };
  }

  /* ---- chiffres et états du projet : projets, activités, bénéficiaires, évaluations, stages, projet nommé ---- */
  const projectAnswer = await answerProjectQuestion(text, lang, role, userId).catch(() => null);
  if (projectAnswer) return projectAnswer;

  const [households, staff, zones] = await Promise.all([
    scoreHouseholds(),
    loadStaff(),
    db.zone.findMany({ where: { isActive: true }, select: { name: true } }) as Promise<Array<{ name: string }>>,
  ]);

  // Lieux cités dans la question (localités des ménages + zones)
  const places = Array.from(
    new Set([
      ...households.map((h) => h.locality).filter((v): v is string => !!v),
      ...households.map((h) => h.zoneName).filter((v): v is string => !!v),
      ...zones.map((z) => z.name),
    ]),
  ).filter((p) => text.includes(normalizeText(p)));

  const inPlace = (h: ScoredHousehold, place: string) => {
    const p = normalizeText(place);
    return normalizeText(h.locality ?? "") === p || normalizeText(h.zoneName ?? "") === p;
  };

  /* ---- fiabilité du modèle ---- */
  if (has(text, /modele|model|precision|fiabil|reliab|accuracy|sgd|gradient|reseau|neurone|neural|deep|apprentissage|entrain/)) {
    const models = await listModels();
    if (!models.length) {
      return {
        reply: L(
          "Aucun modèle n'est encore entraîné : les scores utilisent une heuristique transparente. Un administrateur peut lancer l'entraînement depuis « Analyses IA › Modèles ».",
          "Mbola tsy nampiofanina ny modely: fomba fanisana tsotra no ampiasaina. Afaka manomboka ny fampiofanana ny mpitantana ao amin'ny « Famakafakana IA › Modely ».",
          "No model has been trained yet: scores use a transparent heuristic. An administrator can start training from “AI Analyses › Models”.",
        ),
        suggestions,
      };
    }

    const n = models[0].sampleSize;
    return {
      reply: L(
        `Dernier entraînement : ${n} ménage(s). ${
          n >= 300 ? "Volume correct : les scores sont raisonnablement fiables." : n >= 100 ? "Volume moyen : scores utiles pour prioriser, à confirmer sur le terrain." : "Volume faible : scores indicatifs seulement. Il faut plusieurs centaines de ménages renseignés (domicile, revenu, taille du foyer) pour des prédictions fiables."
        } Dites « entraîne les modèles » (administrateur) après chaque saisie importante.`,
        `Fampiofana farany: tokantrano ${n}. ${
          n >= 300 ? "Ampy ny habetsahan'ny angona: azo itokisana ny isa." : n >= 100 ? "Habetsahana antonony: manampy amin'ny fanasokajiana ny isa fa tsy maintsy hamarinina eny an-tsaha." : "Vitsy ny angona: isa manondro fotsiny. Mila tokantrano an-jatony voasoratra (toerana, fidiram-bola, haben'ny ankohonana) vao azo atokisana."
        }`,
        `Last training: ${n} household(s). ${
          n >= 300 ? "Good volume: scores are reasonably reliable." : n >= 100 ? "Medium volume: scores are useful to prioritise, to be confirmed in the field." : "Low volume: scores are indicative only. Several hundred households with complete data (home location, income, household size) are needed for reliable predictions."
        } Say “train the models” (administrator) after each large data entry.`,
      ),
      table: {
        columns: [L("Modèle", "Modely", "Model"), L("Échantillon", "Santionany", "Sample"), L("Exactitude", "Fahamarinana", "Accuracy"), "F1", "AUC"],
        rows: models.map((m: { name: string; sampleSize: number; metrics: { accuracy: number; f1: number; auc: number } }) => [
          m.name,
          m.sampleSize,
          `${Math.round(m.metrics.accuracy * 100)} %`,
          m.metrics.f1.toFixed(2),
          m.metrics.auc.toFixed(2),
        ]),
      },
      suggestions,
    };
  }

  /* ---- comparaison de lieux ---- */
  if (has(text, /compar|versus|\bvs\b|ampitah|fampitah|\bentre\b|\bbetween\b|\bdifference/) && places.length >= 2) {
    const groups = places.slice(0, 4).map((place) => {
      const list = households.filter((h) => inPlace(h, place));
      return {
        place,
        list,
        count: list.length,
        flagged: list.filter((h) => h.vulnerable).length,
        score: avg(list.map((h) => h.score)),
        altitude: avg(list.map((h) => h.altitude)),
        remote: avg(list.map((h) => h.remoteKm)),
        income: avg(list.map((h) => h.monthlyIncome)),
      };
    });

    const ranked = [...groups].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    const top = ranked[0];
    const points: MapPoint[] = groups.flatMap((g) =>
      g.list
        .filter((h) => h.latitude !== null && h.longitude !== null)
        .map((h) => ({
          id: `h-${h.id}`, latitude: h.latitude as number, longitude: h.longitude as number,
          label: h.name, kind: "household" as const, score: h.score, altitude: h.altitude,
          info: `${g.place} — score ${h.score}`,
        })),
    );

    return {
      reply: L(
        `${top.place} est le secteur le plus vulnérable (score moyen ${fmt(top.score)}/100, ${top.flagged} ménage(s) signalé(s) sur ${top.count}).`,
        `${top.place} no faritra marefo indrindra (isa salanisa ${fmt(top.score)}/100, tokantrano ${top.flagged} voamarika amin'ny ${top.count}).`,
        `${top.place} is the most vulnerable area (average score ${fmt(top.score)}/100, ${top.flagged} household(s) flagged out of ${top.count}).`,
      ),
      table: {
        columns: [L("Zone", "Faritra", "Zone"), L("Ménages", "Tokantrano", "Households"), L("Signalés", "Voamarika", "Flagged"), L("Score moy.", "Isa salanisa", "Avg. score"), L("Altitude moy. (m)", "Haavo salanisa (m)", "Avg. altitude (m)"), L("Éloignement (km)", "Halavirana (km)", "Remoteness (km)"), L("Revenu moy. (Ar)", "Fidiram-bola salanisa (Ar)", "Avg. income (Ar)")],
        rows: groups.map((g) => [g.place, g.count, g.flagged, fmt(g.score), fmt(g.altitude), fmt(g.remote, 1), fmt(g.income)]),
      },
      map: { points: [...points, ...staff.map((s) => ({ id: `s-${s.id}`, latitude: s.latitude, longitude: s.longitude, label: s.name, kind: "staff" as const, altitude: s.altitude }))], lines: [] },
      suggestions,
    };
  }

  /* ---- agent le plus proche / distance ---- */
  if (has(text, /plus proche|proche|agent|mpiasa|akaiky|distance|halavir|itiner|route|aller|aleha|nearest|closest|\bnear\b/)) {
    let pool = households.filter((h) => h.latitude !== null);
    if (places.length) pool = pool.filter((h) => places.some((p) => inPlace(h, p)));
    pool.sort((a, b) => b.score - a.score);

    const target = pool[0];

    if (!target) {
      return {
        reply: L(
          "Aucun ménage géolocalisé ne correspond. Renseignez le domicile sur la fiche du bénéficiaire.",
          "Tsy misy tokantrano misy toerana mifanaraka. Fenoy ny toerana ao amin'ny fiche-n'ny mpahazo tombontsoa.",
          "No geolocated household matches. Fill in the home location on the beneficiary's record.",
        ),
        suggestions,
      };
    }

    if (!staff.length) {
      return {
        reply: L(
          `Ménage prioritaire : ${target.name} (${target.locality ?? target.zoneName ?? "zone ?"}, score ${target.score}). Aucun agent ne partage sa position pour le moment.`,
          `Tokantrano laharam-pahamehana: ${target.name} (${target.locality ?? "?"}, isa ${target.score}). Tsy misy mpiasa mizara ny toerany izao.`,
          `Priority household: ${target.name} (${target.locality ?? target.zoneName ?? "zone ?"}, score ${target.score}). No agent is sharing their location right now.`,
        ),
        map: { points: [{ id: `h-${target.id}`, latitude: target.latitude as number, longitude: target.longitude as number, label: target.name, kind: "household", score: target.score, altitude: target.altitude }], lines: [] },
        suggestions,
      };
    }

    const ranked = staff
      .map((s) => ({ s, km: haversineKm(target.latitude as number, target.longitude as number, s.latitude, s.longitude) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 3);

    return {
      reply: L(
        `Pour ${target.name} (${target.locality ?? target.zoneName ?? "zone ?"}, score ${target.score}, altitude ${fmt(target.altitude)} m), l'agent le plus proche est ${ranked[0].s.name} à ${ranked[0].km.toFixed(1)} km (à vol d'oiseau).`,
        `Ho an'i ${target.name} (${target.locality ?? "?"}, isa ${target.score}, haavo ${fmt(target.altitude)} m), ${ranked[0].s.name} no mpiasa akaiky indrindra: ${ranked[0].km.toFixed(1)} km.`,
        `For ${target.name} (${target.locality ?? target.zoneName ?? "zone ?"}, score ${target.score}, altitude ${fmt(target.altitude)} m), the closest agent is ${ranked[0].s.name}, ${ranked[0].km.toFixed(1)} km away (as the crow flies).`,
      ),
      table: {
        columns: [L("Agent", "Mpiasa", "Agent"), L("Distance (km)", "Elanelana (km)", "Distance (km)"), L("Altitude agent (m)", "Haavon'ny mpiasa (m)", "Agent altitude (m)"), L("Dénivelé (m)", "Elanelana haavo (m)", "Elevation difference (m)")],
        rows: ranked.map(({ s, km }) => [s.name, km.toFixed(1), fmt(s.altitude), target.altitude !== null && s.altitude !== null ? Math.round(target.altitude - s.altitude) : "—"]),
      },
      map: {
        points: [
          { id: `h-${target.id}`, latitude: target.latitude as number, longitude: target.longitude as number, label: target.name, kind: "household", score: target.score, altitude: target.altitude },
          ...ranked.map(({ s }) => ({ id: `s-${s.id}`, latitude: s.latitude, longitude: s.longitude, label: s.name, kind: "staff" as const, altitude: s.altitude })),
        ],
        lines: ranked.map(({ s, km }) => ({ from: `s-${s.id}`, to: `h-${target.id}`, label: `${km.toFixed(1)} km` })),
      },
      suggestions,
    };
  }

  /* ---- altitude ---- */
  if (has(text, /altitude|haavo|eleva|montagn|mountain|tendrombohitra|haut|highest/)) {
    let pool = households.filter((h) => h.altitude !== null);
    if (places.length) pool = pool.filter((h) => places.some((p) => inPlace(h, p)));
    pool.sort((a, b) => (b.altitude as number) - (a.altitude as number));

    return {
      reply: pool.length
        ? L(`Ménages classés par altitude : le plus haut est ${pool[0].name} à ${fmt(pool[0].altitude)} m (${pool[0].locality ?? "—"}).`, `Voalahatra araka ny haavo: ${pool[0].name} no ambony indrindra, ${fmt(pool[0].altitude)} m.`, `Households ranked by altitude: the highest is ${pool[0].name} at ${fmt(pool[0].altitude)} m (${pool[0].locality ?? "—"}).`)
        : L("Aucune altitude n'est renseignée. Placez le domicile sur la carte dans la fiche du bénéficiaire.", "Tsy mbola misy haavo voasoratra. Apetraho eo amin'ny sarintany ny toerana ao amin'ny fiche-n'ny mpahazo tombontsoa.", "No altitude is recorded. Place the home on the map in the beneficiary's record."),
      table: pool.length ? { columns: [L("Ménage", "Tokantrano", "Household"), L("Localité", "Toerana", "Locality"), L("Altitude (m)", "Haavo (m)", "Altitude (m)"), "Score"], rows: pool.slice(0, 8).map((h) => [h.name, h.locality ?? "—", fmt(h.altitude), h.score]) } : undefined,
      suggestions,
    };
  }

  /* ---- statistiques sur les ménages ---- */
  if (has(text, /combien|firy|nombre|total|statist|how many|number of/) && (concepts(text).has("household") || concepts(text).has("vulnerable") || !kb)) {
    const flagged = households.filter((h) => h.vulnerable).length;
    const suspected = households.filter((h) => h.suspected).length;
    const located = households.filter((h) => h.latitude !== null).length;
    return {
      reply: L(
        `${households.length} ménages enregistrés : ${flagged} signalés vulnérables, ${suspected} autres à vérifier selon le modèle, ${located} géolocalisés, ${staff.length} agent(s) en mission.`,
        `Tokantrano ${households.length}: ${flagged} voamarika marefo, ${suspected} hafa tokony hohamarinina, ${located} misy toerana, mpiasa ${staff.length} eny an-toerana.`,
        `${households.length} households registered: ${flagged} flagged as vulnerable, ${suspected} others to check according to the model, ${located} geolocated, ${staff.length} agent(s) on mission.`,
      ),
      suggestions,
    };
  }

  const wantsRanking = has(text, /vulnerab|prioritaire|priority|marefo|mahantra|ahiahy|pauvre|poor|needy|urgent|classement|ranking|\btop\b|liste|\blist\b|menage|household|tokantrano|besoin|fragile|famille|family/);

  if (!wantsRanking) {
    // Pas une demande de données : dernière chance, la base de connaissances (sans mot interrogatif), sinon aide.
    if (kb) return { reply: knowledgeAnswer(kb.entry, lang), suggestions: knowledgeSuggestions(kb.entry, lang), lang };
    return {
      reply: L(
        "Je n'ai pas compris cette demande. Je peux donner les chiffres et l'état des projets, activités, bénéficiaires, évaluations et stages ; classer les ménages vulnérables ; comparer des zones ; trouver l'agent le plus proche ; expliquer comment utiliser la plateforme ; et traduire un terme entre français, anglais et malagasy.",
        "Tsy azoko tsara ity fangatahana ity. Afaka manome ny isa sy ny toetran'ny tetikasa, hetsika, mpahazo tombontsoa, fanombanana ary stage aho; mandrafitra ny tokantrano marefo; mampitaha faritra; mitady ny mpiasa akaiky indrindra; manazava ny fampiasana ny sehatra; ary mandika teny eo amin'ny frantsay, anglisy ary malagasy.",
        "I did not understand that request. I can give figures and status for projects, activities, beneficiaries, evaluations and internships; rank vulnerable households; compare zones; find the closest agent; explain how to use the platform; and translate a term between French, English and Malagasy.",
      ),
      suggestions: [...suggestions.slice(0, 2), ...knowledgeSuggestions(null, lang, 2)],
    };
  }

  /* ---- classement des plus vulnérables ---- */
  let pool = [...households];
  if (places.length) pool = pool.filter((h) => places.some((p) => inPlace(h, p)));
  pool.sort((a, b) => b.score - a.score);
  const top = pool.slice(0, 5);

  const gpsHint = top.length && top.every((h) => h.latitude === null)
    ? L(
        " Aucun de ces ménages n'a de domicile géolocalisé : renseignez-le sur la fiche du bénéficiaire (clic sur la carte) pour les voir ici avec l'altitude.",
        " Tsy mbola misy toerana voasoratra: fenoy ao amin'ny fiche-n'ny mpahazo tombontsoa (tsindrio ny sarintany).",
        " None of these households has a geolocated home: fill it in on the beneficiary's record (click on the map) to see them here with their altitude.",
      )
    : "";

  if (!top.length) {
    return { reply: L("Aucun ménage ne correspond à votre demande.", "Tsy misy tokantrano mifanaraka.", "No household matches your request."), suggestions };
  }

  const near = (h: ScoredHousehold) => nearestStaff(h, staff);

  return {
    reply: L(
      `Voici les ${top.length} ménages les plus vulnérables${places.length ? ` à ${places.join(", ")}` : ""} (score = moyenne SGD + réseau de neurones). ${top[0].name} est prioritaire (${top[0].score}/100).${gpsHint}`,
      `Ireto ny tokantrano ${top.length} marefo indrindra${places.length ? ` ao ${places.join(", ")}` : ""}. ${top[0].name} no laharam-pahamehana (${top[0].score}/100).${gpsHint}`,
      `Here are the ${top.length} most vulnerable households${places.length ? ` in ${places.join(", ")}` : ""} (score = SGD + neural network average). ${top[0].name} is the priority (${top[0].score}/100).${gpsHint}`,
    ),
    table: {
      columns: [L("Ménage", "Tokantrano", "Household"), L("Localité", "Toerana", "Locality"), "Score", "SGD", "MLP", L("Altitude (m)", "Haavo (m)", "Altitude (m)"), L("Agent le plus proche", "Mpiasa akaiky", "Closest agent")],
      rows: top.map((h) => {
        const n = near(h);
        return [h.name, h.locality ?? h.zoneName ?? "—", h.score, fmt(h.scoreSgd), fmt(h.scoreMlp), fmt(h.altitude), n ? `${n.staff.name} (${n.km.toFixed(1)} km)` : "—"];
      }),
    },
    map: {
      points: [
        ...top.filter((h) => h.latitude !== null).map((h) => ({ id: `h-${h.id}`, latitude: h.latitude as number, longitude: h.longitude as number, label: h.name, kind: "household" as const, score: h.score, altitude: h.altitude, info: `${h.locality ?? ""} — score ${h.score}` })),
        ...staff.map((s) => ({ id: `s-${s.id}`, latitude: s.latitude, longitude: s.longitude, label: s.name, kind: "staff" as const, altitude: s.altitude })),
      ],
      lines: top
        .map((h) => ({ h, n: near(h) }))
        .filter((x) => x.n)
        .map((x) => ({ from: `s-${(x.n as { staff: Staff }).staff.id}`, to: `h-${x.h.id}`, label: `${(x.n as { km: number }).km.toFixed(1)} km` })),
    },
    suggestions,
  };
}

/** `uiLang` = langue de l'interface (indice quand la question est trop courte pour détecter la langue). */
export async function answerQuestion(message: string, role?: string, userId?: number, uiLang?: ChatLang): Promise<ChatAnswer> {
  const result = await answer(message, role, userId, uiLang);
  return { ...result, lang: result.lang ?? detectLang(message, uiLang).lang };
}
