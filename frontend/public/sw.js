/* Service worker — notifications système (toast en bas à droite de Windows, centre de notifications macOS/Android).
   À placer dans le dossier public/ du frontend (accessible sur /sw.js). */

// Logo officiel Ndao Hifanosika (public/logos/ndao-hifanosika.png)
const ICON = "/logos/ndao-hifanosika.png";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Réception d'un Web Push envoyé par le serveur (fonctionne même application fermée)
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Ndao Hifanosika", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Ndao Hifanosika";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "Une nouvelle notification est disponible.",
      tag: data.tag || undefined, // même tag = pas de doublon avec l'affichage local
      icon: ICON,
      badge: ICON,
      requireInteraction: false,
      data: { url: data.url || "/notifications" },
    }),
  );
});

// Clic sur la notification : ouvre / met au premier plan l'application sur la bonne page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL((event.notification.data && event.notification.data.url) || "/notifications", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          return client.focus().then((focused) => ("navigate" in focused ? focused.navigate(target) : focused));
        }
      }

      return self.clients.openWindow(target);
    }),
  );
});

/* ==========================================================================
   MODE HORS-LIGNE / CONNECTIVITÉ LIMITÉE (cahier des charges §2.7 et §6)
   - Pages : réseau d abord (délai 8 s), repli sur la dernière copie, puis /offline.html.
   - Fichiers statiques NEXT hachés + logos/icônes : servis depuis le cache.
   - API : LECTURE SEULE, liste blanche ci-dessous, copie propre à chaque utilisateur, 24 h maximum.
   - Aucune écriture n est mise en file : les règles métier (ex. pointage du jour, 08h–17h, heure serveur)
     seraient violées par un rejeu différé. Le front bloque les écritures hors ligne avec un message clair.
   - Les données nominatives (bénéficiaires, mineurs, utilisateurs, notifications…) ne sont JAMAIS mises en cache.
   ========================================================================== */
const NH_VERSION = "v1";
const STATIC_CACHE = "nh-static-" + NH_VERSION;
const PAGE_CACHE = "nh-pages-" + NH_VERSION;
const API_CACHE = "nh-api-" + NH_VERSION;
const OFFLINE_URL = "/offline.html";
const NAV_TIMEOUT_MS = 8000;
const API_TIMEOUT_MS = 6000;
const API_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const API_MAX_ENTRIES = 200;

// Chemins API (après /api/) autorisés en cache : données de pilotage non nominatives.
// Listes uniquement (pas de /:id, qui peut embarquer des membres ou participants nominatifs).
// Pour en ajouter un, l ajouter ici ET vérifier qu il ne renvoie ni noms ni coordonnées de personnes.
const API_CACHEABLE = /^\/api\/(?:projects|activities|milestones|departements|zones|public\/organization|reports\/dashboard|dashboard\/department)\/?$/;

// Fichiers dont le nom contient un hash de build (jamais modifiés) : sûrs en cache-first, absents en mode dev.
const HASHED_ASSET = /(?:[-.](?=[0-9a-zA-Z]*\d)[0-9a-zA-Z]{8,}|\/[0-9a-f]{12,})\.(?:js|css|woff2?)$/;
const PLAIN_ASSET = /^\/(logos|images|icons)\//;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/manifest.webmanifest", ICON]))
      .catch(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  const keep = [STATIC_CACHE, PAGE_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("nh-") && !keep.includes(k)).map((k) => caches.delete(k)))),
  );
});

self.addEventListener("message", (event) => {
  // Envoyé à la déconnexion : aucune donnée d un utilisateur ne doit rester pour le suivant.
  if (event.data && event.data.type === "NH_CLEAR_CACHE") event.waitUntil(caches.delete(API_CACHE));
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

function userIdFromAuth(request) {
  try {
    const header = request.headers.get("Authorization") || "";
    const parts = header.replace(/^Bearer\s+/i, "").split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "=")));
    return payload && payload.id != null ? String(payload.id) : null;
  } catch (e) {
    return null;
  }
}

// Clé de cache = URL + identifiant de l utilisateur : deux comptes sur le même navigateur ne partagent rien.
function apiCacheKey(request, userId) {
  const u = new URL(request.url);
  return new Request(u.origin + u.pathname + u.search + (u.search ? "&" : "?") + "__u=" + encodeURIComponent(userId));
}

async function stamp(response) {
  const headers = new Headers(response.headers);
  headers.set("x-nh-cached-at", String(Date.now()));
  return new Response(await response.blob(), { status: response.status, statusText: response.statusText, headers });
}

async function trimApiCache(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - API_MAX_ENTRIES; i += 1) await cache.delete(keys[i]);
}

async function notifyClients(message) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  windows.forEach((client) => client.postMessage(message));
}

async function handleNavigation(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await withTimeout(fetch(request), NAV_TIMEOUT_MS);
    if (response.ok && response.type === "basic" && !response.redirected) cache.put(request, response.clone());
    return response;
  } catch (e) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline || new Response("Hors ligne", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  if (hit) { refresh.catch(() => undefined); return hit; }
  return refresh;
}

async function networkFirstApi(event) {
  const request = event.request;
  const userId = userIdFromAuth(request);
  if (!userId) return fetch(request);

  const cache = await caches.open(API_CACHE);
  const key = apiCacheKey(request, userId);

  const network = fetch(request).then(async (response) => {
    if (response.ok) {
      await cache.put(key, await stamp(response.clone()));
      trimApiCache(cache).catch(() => undefined);
    }
    return response;
  });

  const fromCache = async () => {
    const hit = await cache.match(key);
    if (!hit) return null;
    const at = Number(hit.headers.get("x-nh-cached-at") || 0);
    if (!at || Date.now() - at > API_MAX_AGE_MS) return null;
    notifyClients({ type: "NH_FROM_CACHE", url: request.url, cachedAt: at });
    return hit;
  };

  try {
    // Connexion lente : après API_TIMEOUT_MS on sert la copie, la requête continue et met le cache à jour.
    return await withTimeout(network, API_TIMEOUT_MS);
  } catch (e) {
    const hit = await fromCache();
    if (hit) { event.waitUntil(network.catch(() => undefined)); return hit; }
    return network; // pas de copie : on attend la réponse réelle (ou son échec)
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    if (url.origin === self.location.origin) event.respondWith(handleNavigation(request));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/_next/static/") && HASHED_ASSET.test(url.pathname)) return void event.respondWith(cacheFirst(request));
    if (PLAIN_ASSET.test(url.pathname)) return void event.respondWith(staleWhileRevalidate(request));
  }

  if (url.pathname.startsWith("/api/") && API_CACHEABLE.test(url.pathname)) event.respondWith(networkFirstApi(event));
});
