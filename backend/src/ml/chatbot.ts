import { prisma } from "../config/database";
import { db } from "../utils/db";
import { haversineKm, normalizeText } from "./geo";
import { ScoredHousehold, listModels, scoreHouseholds, trainVulnerabilityModels } from "./vulnerability";

/* Assistant conversationnel : comprend FR + malgache, interroge les vraies données
   et répond avec tableau + carte. Règles d'intention (pas de LLM externe). */

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
}

interface Staff {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  updatedAt: Date | null;
}

const has = (text: string, regex: RegExp) => regex.test(text);
const avg = (values: Array<number | null>) => {
  const v = values.filter((x): x is number => x !== null && Number.isFinite(x));
  return v.length ? v.reduce((a, c) => a + c, 0) / v.length : null;
};
const fmt = (n: number | null, digits = 0) => (n === null ? "—" : n.toFixed(digits));

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

export async function answerQuestion(message: string, role?: string): Promise<ChatAnswer> {
  const raw = message.trim();
  const text = normalizeText(raw);
  const mg = /\b(ny|ao|aiza|firy|izay|mpiasa|tena|marefo|mahantra|ampitaha|fampitahana|haavo|akaiky|halavirana)\b/.test(text);
  const L = (fr: string, malagasy: string) => (mg ? malagasy : fr);

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

  const suggestions = [
    L("Quels sont les ménages les plus vulnérables ?", "Iza avy ireo tokantrano marefo indrindra?"),
    L("Compare Fianarantsoa et Antananarivo", "Ampitaho i Fianarantsoa sy Antananarivo"),
    L("Quel agent est le plus proche du ménage prioritaire ?", "Iza no mpiasa akaiky indrindra ny tokantrano laharam-pahamehana?"),
    L("Quelle est la fiabilité du modèle ?", "Tsara ve ny modely?"),
  ];

  /* ---- commande : entraîner les modèles ---- */
  if (
    has(text, /^(entrain|train|ampiofan)/) ||
    has(text, /(lance|lancer|relance|refais|fais|faire|atombohy|ampiofano).*(entrain|train|apprentissage|modele|ampiofan)/)
  ) {
    if (role !== "ADMIN") {
      return {
        reply: L(
          "Seul l'administrateur peut lancer l'entraînement des modèles (menu Analyses IA › Modèles).",
          "Ny administratera ihany no afaka manomboka ny fampiofanana ny modely.",
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
        ),
        suggestions,
      };
    }

    return {
      reply: L(
        `Entraînement terminé sur ${report.sampleSize} ménages (${report.positives} vulnérables, validation croisée ${report.folds} plis). Fiabilité : ${report.reliability.toLowerCase()}.`,
        `Vita ny fampiofanana tamin'ny tokantrano ${report.sampleSize} (marefo ${report.positives}). Fahatokisana: ${report.reliability.toLowerCase()}.`,
      ),
      table: {
        columns: ["Modèle", "Exactitude", "Précision", "Rappel", "F1", "AUC"],
        rows: [
          ["Référence (majorité)", `${Math.round(report.baseline.accuracy * 100)} %`, "—", "—", "—", "—"],
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

  /* ---- salutations / aide ---- */
  const greeting = has(text, /^(bonjour|bonsoir|salut|coucou|hello|hi\b|salama|manao ahoana|akory|aide|help|que sais|inona no azonao)/);

  if (greeting) {
    return {
      reply: L(
        "Bonjour ! Posez-moi par exemple : « Quels sont les ménages les plus vulnérables à Fianarantsoa ? », « Compare Ankalamavony et Andraindrato », « Quel agent est le plus proche ? », « Quelle est l'altitude des ménages ? » ou « Entraîne les modèles ».",
        "Salama! Azonao fanontaniana ohatra: « Iza avy ny tokantrano marefo indrindra ao Fianarantsoa? », « Ampitaho Ankalamavony sy Andraindrato », « Iza no mpiasa akaiky indrindra? ».",
      ),
      suggestions,
    };
  }

  /* ---- fiabilité du modèle ---- */
  if (has(text, /modele|model|precision|fiabil|sgd|gradient|reseau|neurone|deep|apprentissage|entrain/)) {
    const models = await listModels();
    if (!models.length) {
      return {
        reply: L(
          "Aucun modèle n'est encore entraîné : les scores utilisent une heuristique transparente. Un administrateur peut lancer l'entraînement depuis « Analyses IA › Modèles ».",
          "Mbola tsy nampiofanina ny modely: fomba fanisana tsotra no ampiasaina. Afaka manomboka ny fampiofanana ny admin ao amin'ny « Analyses IA › Modèles ».",
        ),
        suggestions,
      };
    }

    return {
      reply: L(
        `Dernier entraînement : ${models[0].sampleSize} ménage(s). ${
          models[0].sampleSize >= 300
            ? "Volume correct : les scores sont raisonnablement fiables."
            : models[0].sampleSize >= 100
              ? "Volume moyen : scores utiles pour prioriser, à confirmer sur le terrain."
              : "Volume faible : scores indicatifs seulement. Il faut plusieurs centaines de ménages renseignés (domicile, revenu, taille du foyer) pour des prédictions fiables."
        } Dites « entraîne les modèles » (administrateur) après chaque saisie importante.`,
        `Fampiofana farany: tokantrano ${models[0].sampleSize}. ${
          models[0].sampleSize >= 100 ? "Azo ampiasaina ho fanoloran-tena." : "Vitsy ny angon-drakitra: isa manondro fotsiny. Mila tokantrano an-jatony vao azo atokisana."
        }`,
      ),
      table: {
        columns: ["Modèle", "Échantillon", "Exactitude", "F1", "AUC"],
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
  if (has(text, /compar|versus|\bvs\b|ampitah|fampitah|\bentre\b/) && places.length >= 2) {
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
      ),
      table: {
        columns: [L("Zone", "Faritra"), L("Ménages", "Tokantrano"), L("Signalés", "Voamarika"), "Score moy.", "Altitude moy. (m)", "Éloignement (km)", "Revenu moy. (Ar)"],
        rows: groups.map((g) => [g.place, g.count, g.flagged, fmt(g.score), fmt(g.altitude), fmt(g.remote, 1), fmt(g.income)]),
      },
      map: { points: [...points, ...staff.map((s) => ({ id: `s-${s.id}`, latitude: s.latitude, longitude: s.longitude, label: s.name, kind: "staff" as const, altitude: s.altitude }))], lines: [] },
      suggestions,
    };
  }

  /* ---- agent le plus proche / distance ---- */
  if (has(text, /plus proche|proche|agent|mpiasa|akaiky|distance|halavir|itiner|route|aller|aleha/)) {
    let pool = households.filter((h) => h.latitude !== null);
    if (places.length) pool = pool.filter((h) => places.some((p) => inPlace(h, p)));
    pool.sort((a, b) => b.score - a.score);

    const target = pool[0];

    if (!target) {
      return { reply: L("Aucun ménage géolocalisé ne correspond. Renseignez le domicile sur la fiche du bénéficiaire.", "Tsy misy tokantrano misy toerana mifanaraka. Fenoy ny toerana ao amin'ny fiche-n'ny mpandray anjara."), suggestions };
    }

    if (!staff.length) {
      return {
        reply: L(
          `Ménage prioritaire : ${target.name} (${target.locality ?? target.zoneName ?? "zone ?"}, score ${target.score}). Aucun agent ne partage sa position pour le moment.`,
          `Tokantrano laharam-pahamehana: ${target.name} (${target.locality ?? "?"}, isa ${target.score}). Tsy misy mpiasa mizara ny toerany izao.`,
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
      ),
      table: {
        columns: [L("Agent", "Mpiasa"), "Distance (km)", "Altitude agent (m)", L("Dénivelé (m)", "Elanelana haavo (m)")],
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
  if (has(text, /altitude|haavo|eleva|montagn|tendrombohitra|haut/)) {
    let pool = households.filter((h) => h.altitude !== null);
    if (places.length) pool = pool.filter((h) => places.some((p) => inPlace(h, p)));
    pool.sort((a, b) => (b.altitude as number) - (a.altitude as number));

    return {
      reply: pool.length
        ? L(`Ménages classés par altitude : le plus haut est ${pool[0].name} à ${fmt(pool[0].altitude)} m (${pool[0].locality ?? "—"}).`, `Voalahatra araka ny haavo: ${pool[0].name} no ambony indrindra, ${fmt(pool[0].altitude)} m.`)
        : L("Aucune altitude n'est renseignée. Placez le domicile sur la carte dans la fiche du bénéficiaire.", "Tsy mbola misy haavo voasoratra."),
      table: pool.length ? { columns: [L("Ménage", "Tokantrano"), L("Localité", "Toerana"), "Altitude (m)", "Score"], rows: pool.slice(0, 8).map((h) => [h.name, h.locality ?? "—", fmt(h.altitude), h.score]) } : undefined,
      suggestions,
    };
  }

  /* ---- statistiques ---- */
  if (has(text, /combien|firy|nombre|total|statist/)) {
    const flagged = households.filter((h) => h.vulnerable).length;
    const suspected = households.filter((h) => h.suspected).length;
    return {
      reply: L(
        `${households.length} ménages enregistrés : ${flagged} signalés vulnérables, ${suspected} autres à vérifier selon le modèle, ${households.filter((h) => h.latitude !== null).length} géolocalisés, ${staff.length} agent(s) en mission.`,
        `Tokantrano ${households.length}: ${flagged} voamarika marefo, ${suspected} hafa tokony hohamarinina, ${households.filter((h) => h.latitude !== null).length} misy toerana, mpiasa ${staff.length} eny an-toerana.`,
      ),
      suggestions,
    };
  }

  const wantsRanking = has(text, /vulnerab|prioritaire|marefo|mahantra|ahiahy|pauvre|urgent|classement|\btop\b|liste|menage|tokantrano|besoin|fragile|famille/);

  if (!wantsRanking) {
    return {
      reply: L(
        "Je n'ai pas compris cette demande. Je peux classer les ménages vulnérables, comparer des zones, trouver l'agent le plus proche, donner l'altitude, ou entraîner les modèles.",
        "Tsy azoko tsara ity fangatahana ity. Afaka mandrafitra ny tokantrano marefo, mampitaha faritra, mitady ny mpiasa akaiky ary manome ny haavo aho.",
      ),
      suggestions,
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
        " Tsy mbola misy toerana voasoratra: fenoy ao amin'ny fiche-n'ny mpandray anjara (clic amin'ny carte).",
      )
    : "";

  if (!top.length) {
    return { reply: L("Aucun ménage ne correspond à votre demande.", "Tsy misy tokantrano mifanaraka."), suggestions };
  }

  const near = (h: ScoredHousehold) => nearestStaff(h, staff);

  return {
    reply: L(
      `Voici les ${top.length} ménages les plus vulnérables${places.length ? ` à ${places.join(", ")}` : ""} (score = moyenne SGD + réseau de neurones). ${top[0].name} est prioritaire (${top[0].score}/100).${gpsHint}`,
      `Ireto ny tokantrano ${top.length} marefo indrindra${places.length ? ` ao ${places.join(", ")}` : ""}. ${top[0].name} no laharam-pahamehana (${top[0].score}/100).${gpsHint}`,
    ),
    table: {
      columns: [L("Ménage", "Tokantrano"), L("Localité", "Toerana"), "Score", "SGD", "MLP", "Altitude (m)", L("Agent le plus proche", "Mpiasa akaiky")],
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
