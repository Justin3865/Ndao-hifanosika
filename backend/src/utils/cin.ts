/**
 * Règles du CIN malgache (carte d'identité nationale) : 12 chiffres.
 *
 *   X X X   Y Y   Z   N N N N N N
 *   district  commune  sexe  numéro chronologique
 *
 * Les 3 premiers chiffres = code du district (1er chiffre = ancienne province, puis rang du district),
 * d'après le « Code officiel géographique de Madagascar » (sous-préfectures).
 * Ex. Ambositra = 203, Ambatondrazaka = 313, Fianarantsoa = 201.
 *
 * Module pur (sans base de données) : copie identique côté frontend dans lib/cin.ts.
 */

export interface District {
  code: string;
  name: string;
  /** noms (sans accent, minuscules) reconnus dans « lieu de naissance / de délivrance » */
  aliases: string[];
}

export const DISTRICTS: District[] = [
  // 1 — Antananarivo
  { code: "101", name: "Antananarivo Renivohitra", aliases: ["antananarivo", "antananarivo renivohitra", "antananarivo i", "tananarive", "tananarive ville", "tana"] },
  { code: "102", name: "Antananarivo Banlieue (Atsimondrano, Avaradrano)", aliases: ["antananarivo", "antananarivo atsimondrano", "atsimondrano", "antananarivo avaradrano", "avaradrano", "tananarive banlieue", "antananarivo banlieue"] },
  { code: "103", name: "Ambohidratrimo", aliases: ["ambohidratrimo"] },
  { code: "104", name: "Ankazobe", aliases: ["ankazobe"] },
  { code: "105", name: "Arivonimamo", aliases: ["arivonimamo"] },
  { code: "106", name: "Manjakandriana", aliases: ["manjakandriana"] },
  { code: "107", name: "Anjozorobe", aliases: ["anjozorobe"] },
  { code: "108", name: "Antsirabe", aliases: ["antsirabe", "antsirabe i", "antsirabe ii"] },
  { code: "109", name: "Betafo", aliases: ["betafo"] },
  { code: "110", name: "Ambatolampy", aliases: ["ambatolampy"] },
  { code: "111", name: "Tsiroanomandidy", aliases: ["tsiroanomandidy"] },
  { code: "112", name: "Miarinarivo", aliases: ["miarinarivo"] },
  { code: "113", name: "Soavinandriana", aliases: ["soavinandriana"] },
  { code: "114", name: "Antanifotsy", aliases: ["antanifotsy"] },
  { code: "115", name: "Andramasina", aliases: ["andramasina"] },
  { code: "116", name: "Faratsiho", aliases: ["faratsiho"] },

  // 2 — Fianarantsoa
  { code: "201", name: "Fianarantsoa", aliases: ["fianarantsoa", "fianarantsoa i"] },
  { code: "202", name: "Ambatofinandrahana", aliases: ["ambatofinandrahana"] },
  { code: "203", name: "Ambositra", aliases: ["ambositra"] },
  { code: "204", name: "Fandriana", aliases: ["fandriana"] },
  { code: "205", name: "Ambalavao", aliases: ["ambalavao"] },
  { code: "206", name: "Ifanadiana", aliases: ["ifanadiana"] },
  { code: "207", name: "Nosy-Varika", aliases: ["nosy varika"] },
  { code: "208", name: "Ambohimahasoa", aliases: ["ambohimahasoa"] },
  { code: "209", name: "Mananjary", aliases: ["mananjary"] },
  { code: "210", name: "Manakara", aliases: ["manakara", "manakara atsimo"] },
  { code: "211", name: "Ikongo (Fort-Carnot)", aliases: ["ikongo", "fort carnot"] },
  { code: "212", name: "Vohipeno", aliases: ["vohipeno"] },
  { code: "213", name: "Farafangana", aliases: ["farafangana"] },
  { code: "214", name: "Vangaindrano", aliases: ["vangaindrano"] },
  { code: "215", name: "Midongy-Atsimo", aliases: ["midongy atsimo", "midongy du sud", "midongy sud"] },
  { code: "216", name: "Ihosy", aliases: ["ihosy"] },
  { code: "217", name: "Vondrozo", aliases: ["vondrozo"] },
  { code: "218", name: "Ivohibe", aliases: ["ivohibe"] },

  // 3 — Toamasina
  { code: "301", name: "Toamasina", aliases: ["toamasina", "tamatave", "toamasina i", "toamasina ii"] },
  { code: "302", name: "Nosy-Boraha (Sainte-Marie)", aliases: ["nosy boraha", "sainte marie", "ile sainte marie"] },
  { code: "303", name: "Maroantsetra", aliases: ["maroantsetra"] },
  { code: "304", name: "Mananara-Avaratra", aliases: ["mananara", "mananara avaratra", "mananara nord"] },
  { code: "305", name: "Fenoarivo Atsinanana", aliases: ["fenoarivo atsinanana", "fenerive est", "fenerive"] },
  { code: "306", name: "Brickaville", aliases: ["brickaville", "vohibinany"] },
  { code: "307", name: "Vatomandry", aliases: ["vatomandry"] },
  { code: "308", name: "Mahanoro", aliases: ["mahanoro"] },
  { code: "309", name: "Marolambo", aliases: ["marolambo"] },
  { code: "313", name: "Ambatondrazaka", aliases: ["ambatondrazaka"] },
  { code: "314", name: "Moramanga", aliases: ["moramanga"] },
  { code: "315", name: "Vavatenina", aliases: ["vavatenina"] },
  { code: "316", name: "Andilamena", aliases: ["andilamena"] },
  { code: "317", name: "Anosibe An'Ala", aliases: ["anosibe an ala", "anosibe"] },
  { code: "318", name: "Soanierana Ivongo", aliases: ["soanierana ivongo"] },

  // 4 — Mahajanga
  { code: "401", name: "Mahajanga", aliases: ["mahajanga", "majunga", "mahajanga i", "mahajanga ii"] },
  { code: "402", name: "Besalampy", aliases: ["besalampy"] },
  { code: "403", name: "Soalala", aliases: ["soalala"] },
  { code: "404", name: "Maevatanana", aliases: ["maevatanana"] },
  { code: "405", name: "Ambato-Boeny", aliases: ["ambato boeny", "ambato boeni"] },
  { code: "406", name: "Marovoay", aliases: ["marovoay"] },
  { code: "407", name: "Mitsinjo", aliases: ["mitsinjo"] },
  { code: "408", name: "Tsaratanana", aliases: ["tsaratanana"] },
  { code: "409", name: "Port-Bergé (Boriziny)", aliases: ["port berge", "boriziny", "port berge vaovao"] },
  { code: "410", name: "Mandritsara", aliases: ["mandritsara"] },
  { code: "411", name: "Analalava", aliases: ["analalava"] },
  { code: "412", name: "Befandriana-Avaratra", aliases: ["befandriana nord", "befandriana avaratra"] },
  { code: "413", name: "Antsohihy", aliases: ["antsohihy"] },
  { code: "414", name: "Bealanana", aliases: ["bealanana"] },
  { code: "420", name: "Antsalova", aliases: ["antsalova"] },
  { code: "421", name: "Maintirano", aliases: ["maintirano"] },
  { code: "422", name: "Morafenobe", aliases: ["morafenobe"] },
  { code: "423", name: "Mampikony", aliases: ["mampikony"] },

  // 5 — Toliara
  { code: "501", name: "Toliara", aliases: ["toliara", "tulear", "toliara i", "toliara ii"] },
  { code: "502", name: "Manja", aliases: ["manja"] },
  { code: "503", name: "Beroroha", aliases: ["beroroha"] },
  { code: "504", name: "Morombe", aliases: ["morombe"] },
  { code: "505", name: "Ankazoabo", aliases: ["ankazoabo"] },
  { code: "506", name: "Betioky-Atsimo", aliases: ["betioky", "betioky atsimo"] },
  { code: "507", name: "Ampanihy", aliases: ["ampanihy", "ampanihy ouest"] },
  { code: "508", name: "Morondava", aliases: ["morondava"] },
  { code: "509", name: "Mahabo", aliases: ["mahabo"] },
  { code: "510", name: "Belo sur Tsiribihina", aliases: ["belo sur tsiribihina", "belo tsiribihina"] },
  { code: "511", name: "Miandrivazo", aliases: ["miandrivazo"] },
  { code: "515", name: "Tolagnaro (Fort-Dauphin)", aliases: ["tolagnaro", "fort dauphin", "taolagnaro"] },
  { code: "516", name: "Ambovombe-Androy", aliases: ["ambovombe", "ambovombe androy"] },
  { code: "517", name: "Betroka", aliases: ["betroka"] },
  { code: "518", name: "Bekily", aliases: ["bekily"] },
  { code: "519", name: "Amboasary-Atsimo", aliases: ["amboasary", "amboasary atsimo"] },

  // 7 — Antsiranana (ancienne province de Diégo-Suarez)
  { code: "710", name: "Antalaha", aliases: ["antalaha"] },
  { code: "711", name: "Sambava", aliases: ["sambava"] },
  { code: "712", name: "Andapa", aliases: ["andapa"] },
  { code: "715", name: "Antsiranana (Diego-Suarez)", aliases: ["antsiranana", "diego suarez", "diego", "antsiranana i", "antsiranana ii"] },
  { code: "716", name: "Vohémar (Iharana)", aliases: ["vohemar", "iharana"] },
  { code: "717", name: "Ambilobe", aliases: ["ambilobe"] },
  { code: "718", name: "Nosy-Be", aliases: ["nosy be", "nossi be"] },
  { code: "719", name: "Ambanja", aliases: ["ambanja"] },
];

const STOP_WORDS = new Set(["district", "ville", "commune", "de", "du", "d", "la", "le", "region", "fokontany", "madagascar"]);

/** « Ambositra, District » -> "ambositra" */
export function normalizePlace(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word && !STOP_WORDS.has(word))
    .join(" ")
    .trim();
}

/**
 * Districts reconnus dans un lieu saisi (liste vide = lieu inconnu : aucune règle appliquée).
 * La correspondance la plus précise l'emporte (« Antananarivo Atsimondrano » -> 102 seul).
 */
export function districtsOfPlace(place: unknown): District[] {
  const text = ` ${normalizePlace(place)} `;
  if (text.trim() === "") return [];

  let best = 0;
  const hits: Array<{ district: District; score: number }> = [];

  for (const district of DISTRICTS) {
    let score = 0;

    for (const alias of district.aliases) {
      if (text.includes(` ${alias} `)) score = Math.max(score, alias.split(" ").length);
    }

    if (score > 0) {
      hits.push({ district, score });
      best = Math.max(best, score);
    }
  }

  return hits.filter((hit) => hit.score === best).map((hit) => hit.district);
}

export const cinDistrictCode = (cin: string): string => cin.slice(0, 3);

export const isKnownDistrictCode = (code: string): boolean => DISTRICTS.some((d) => d.code === code);

/**
 * Le CIN doit commencer par le code du district du lieu de délivrance OU du lieu de naissance
 * (ceux qui sont reconnus). Retourne un message d'erreur, ou null si tout est cohérent / invérifiable.
 */
export function cinPrefixError(cin: string | null | undefined, places: Array<unknown>): string | null {
  if (!cin || cin.length < 3) return null;

  const prefix = cinDistrictCode(cin);
  const candidates = new Map<string, District>();

  for (const place of places) {
    for (const district of districtsOfPlace(place)) candidates.set(district.code, district);
  }

  if (candidates.size === 0 || candidates.has(prefix)) return null;

  const expected = [...candidates.values()].map((d) => `${d.code} (${d.name})`).join(" ou ");

  return `Le N° CIN doit commencer par ${expected} d'après le lieu indiqué (il commence par ${prefix}).`;
}

/** Âge en années révolues à la date de référence */
export function computeAge(birth: Date | string, ref: Date = new Date()): number | null {
  const date = birth instanceof Date ? birth : new Date(birth);
  if (Number.isNaN(date.getTime())) return null;

  let age = ref.getFullYear() - date.getFullYear();
  const monthDelta = ref.getMonth() - date.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && ref.getDate() < date.getDate())) age -= 1;

  return age >= 0 ? age : null;
}
