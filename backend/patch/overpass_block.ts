const OVERPASS_SLOTS = 4;
const OVERPASS_HEDGE_MS = 3500;
let overpassActive = 0;
const overpassWaiters: { high: boolean; run: () => void }[] = [];

/** Les demandes de l'utilisateur (listes, contours à l'écran) passent avant le préchargement en arrière-plan. */
function acquireOverpass(high: boolean): Promise<void> {
  if (overpassActive < OVERPASS_SLOTS) {
    overpassActive++;
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const waiter = { high, run: resolve };
    if (high) {
      const firstLow = overpassWaiters.findIndex((w) => !w.high);
      overpassWaiters.splice(firstLow < 0 ? overpassWaiters.length : firstLow, 0, waiter);
    } else overpassWaiters.push(waiter);
  });
}

function releaseOverpass() {
  const next = overpassWaiters.shift();
  if (next) next.run(); // le créneau passe directement au suivant
  else overpassActive--;
}

async function overpassOne(url: string, query: string, timeout: number): Promise<Json[]> {
  const response = await axios.post(url, `data=${encodeURIComponent(query)}`, {
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
    timeout,
  });
  const elements: Json[] = response.data?.elements ?? [];

  // "out bb" et "out center" ne se combinent pas : on demande l'emprise et on en déduit le centre
  for (const e of elements) {
    if (e.bounds && !e.center) e.center = { lat: (Number(e.bounds.minlat) + Number(e.bounds.maxlat)) / 2, lon: (Number(e.bounds.minlon) + Number(e.bounds.maxlon)) / 2 };
  }

  // Overpass répond 200 avec une "remark" quand il est surchargé : on considère ce serveur en échec
  if (!elements.length && /runtime error|timed out|out of memory/i.test(String(response.data?.remark ?? ""))) {
    throw new Error(String(response.data.remark));
  }

  return elements;
}

/**
 * Requête "à couverture" : le 1er serveur est lancé tout de suite, le suivant après 3,5 s s'il n'a pas répondu
 * (ou aussitôt si le précédent échoue). La première réponse valide gagne ; au lieu d'attendre chaque miroir
 * l'un après l'autre (jusqu'à 3 x le délai), le temps total ≈ celui du serveur le plus rapide.
 */
async function overpass(query: string, timeout = 35000, high = true): Promise<Json[]> {
  await acquireOverpass(high);

  try {
    return await new Promise<Json[]>((resolve, reject) => {
      let launched = 0;
      let failed = 0;
      let done = false;
      let lastError: unknown;
      let timer: NodeJS.Timeout | null = null;

      const launch = () => {
        if (done || launched >= OVERPASS_URLS.length) return;
        const url = OVERPASS_URLS[launched++];

        overpassOne(url, query, timeout).then(
          (elements) => {
            if (done) return;
            done = true;
            if (timer) clearTimeout(timer);
            resolve(elements);
          },
          (error) => {
            lastError = error;
            failed++;
            if (done) return;
            if (failed >= OVERPASS_URLS.length) {
              done = true;
              if (timer) clearTimeout(timer);
              reject(lastError);
            } else launch();
          }
        );

        if (!done && launched < OVERPASS_URLS.length) {
          if (timer) clearTimeout(timer);
          timer = setTimeout(launch, OVERPASS_HEDGE_MS);
        }
      };

      launch();
    });
  } finally {
    releaseOverpass();
  }
}
