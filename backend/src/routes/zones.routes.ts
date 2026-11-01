import { Request, Response, Router } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import axios from "axios";
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "../utils/db";
import { communeByKey, communeKey, findCommunes, fokontanyKey, hasFokontanyData } from "../utils/fokontanyData";

import { sendError } from "../middlewares/error.middleware";
/* Zones d'intervention (et siège) — gérées par ADMIN / DIRECTION. */

const router = Router();
export const publicOrganizationRouter = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const num = (value: unknown) => (value === "" || value === null || value === undefined ? null : Number(value));
const text = (value: unknown) => (value ? String(value).trim() : null);

/* Niveaux administratifs d'une zone (Madagascar) */
const LEVELS = ["PROVINCE", "REGION", "DISTRICT", "COMMUNE", "FOKONTANY"];

/** Niveau de détail demandé à Nominatim (OpenStreetMap) pour chaque type de zone. */
const NOMINATIM_ZOOM: Record<string, number> = { PROVINCE: 5, REGION: 5, DISTRICT: 8, COMMUNE: 10, FOKONTANY: 13 };

/** Rayon par défaut (km) quand le contour de la zone est introuvable. */
const DEFAULT_RADIUS_KM: Record<string, number> = { PROVINCE: 150, REGION: 80, DISTRICT: 30, COMMUNE: 8, FOKONTANY: 1.5 };

/** Contour GeoJSON (Polygon, MultiPolygon ou FeatureCollection de la sélection) conservé sous forme de texte, 1,5 Mo maximum. */
function boundaryText(value: unknown): string | null {
  if (!value) return null;

  try {
    const geo: Json = typeof value === "string" ? JSON.parse(value) : value;
    if (!geo) return null;

    const isShape = ["Polygon", "MultiPolygon"].includes(geo.type) && Array.isArray(geo.coordinates);
    const isCollection = geo.type === "FeatureCollection" && Array.isArray(geo.features);
    if (!isShape && !isCollection) return null;

    const out = JSON.stringify(isShape ? { type: geo.type, coordinates: geo.coordinates } : { type: "FeatureCollection", features: geo.features });
    return out.length <= 1_500_000 ? out : null;
  } catch {
    return null;
  }
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (v: number) => (v * Math.PI) / 180;
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;

  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rayon = distance du centre au coin le plus éloigné de l'emprise de la zone (le cercle couvre toute la zone). */
function radiusFromBbox(lat: number, lng: number, bbox: unknown, level: string): number {
  const b = Array.isArray(bbox) ? bbox.map(Number) : [];

  if (b.length === 4 && b.every(Number.isFinite)) {
    const [south, north, west, east] = b;
    const km = Math.max(
      distanceKm(lat, lng, south, west),
      distanceKm(lat, lng, south, east),
      distanceKm(lat, lng, north, west),
      distanceKm(lat, lng, north, east)
    );

    if (km > 0) return Math.max(0.1, Math.round(km * 10) / 10);
  }

  return DEFAULT_RADIUS_KM[level] ?? 10;
}

/** Adresse postale lisible construite à partir des composants OpenStreetMap. */
function addressFrom(place: Json): string {
  const a: Json = place?.address ?? {};
  const keys = ["neighbourhood", "suburb", "village", "hamlet", "town", "city", "municipality", "county", "state_district", "state", "postcode"];
  const parts: string[] = [];

  for (const key of keys) {
    const value = a[key] ? String(a[key]).trim() : "";
    if (value && !parts.includes(value)) parts.push(value);
  }

  parts.push("Madagascar");
  return parts.join(", ");
}

function toData(body: Json) {
  return {
    name: String(body.name ?? "").trim(),
    region: text(body.region),
    level: LEVELS.includes(String(body.level)) ? String(body.level) : null,
    boundary: boundaryText(body.boundary),
    latitude: num(body.latitude),
    longitude: num(body.longitude),
    radiusKm: num(body.radiusKm),
    address: text(body.address),
    phone: text(body.phone),
    email: text(body.email),
    isHeadquarters: Boolean(body.isHeadquarters),
    isActive: body.isActive === undefined ? true : Boolean(body.isActive),
  };
}

function validate(data: ReturnType<typeof toData>): string | null {
  if (!data.name) return "Le nom est obligatoire";
  if (data.latitude === null || !Number.isFinite(data.latitude) || Math.abs(data.latitude) > 90) return "Latitude invalide (-90 à 90)";
  if (data.longitude === null || !Number.isFinite(data.longitude) || Math.abs(data.longitude) > 180) return "Longitude invalide (-180 à 180)";
  return null;
}

/** Un seul siège : on retire l'ancien quand un nouveau est défini. */
async function enforceSingleHq(id: number) {
  await db.zone.updateMany({ where: { isHeadquarters: true, id: { not: id } }, data: { isHeadquarters: false } });
}

router.use(authenticate);

/* ---------- Découpage administratif : Province > Région > District > Commune > Fokontany ---------- */

const UA = "NdaoHifanosika/1.0 (suivi-evaluation)";

/** Les 6 provinces et leurs régions ; "pattern" sert à retrouver la région dans OpenStreetMap. */
const PROVINCES: { name: string; regions: { name: string; pattern: string }[] }[] = [
  { name: "Antananarivo", regions: [
    { name: "Analamanga", pattern: "Analamanga" }, { name: "Vakinankaratra", pattern: "Vakinankaratra" },
    { name: "Itasy", pattern: "Itasy" }, { name: "Bongolava", pattern: "Bongolava" } ] },
  { name: "Antsiranana", regions: [{ name: "Diana", pattern: "Diana" }, { name: "Sava", pattern: "Sava" }] },
  { name: "Fianarantsoa", regions: [
    { name: "Haute Matsiatra", pattern: "Haute.Matsiatra|Matsiatra.Ambony" }, { name: "Amoron'i Mania", pattern: "Amoron.?i.Mania" },
    { name: "Vatovavy", pattern: "Vatovavy(.Fitovinany)?" }, { name: "Fitovinany", pattern: "Fitovinany" },
    { name: "Ihorombe", pattern: "Ihorombe" }, { name: "Atsimo-Atsinanana", pattern: "Atsimo.Atsinanana" } ] },
  { name: "Mahajanga", regions: [
    { name: "Boeny", pattern: "Boeny" }, { name: "Sofia", pattern: "Sofia" },
    { name: "Betsiboka", pattern: "Betsiboka" }, { name: "Melaky", pattern: "Melaky" } ] },
  { name: "Toamasina", regions: [
    { name: "Atsinanana", pattern: "Atsinanana" }, { name: "Analanjirofo", pattern: "Analanjirofo" },
    { name: "Alaotra-Mangoro", pattern: "Alaotra.Mangoro" } ] },
  { name: "Toliara", regions: [
    { name: "Atsimo-Andrefana", pattern: "Atsimo.Andrefana" }, { name: "Androy", pattern: "Androy" },
    { name: "Anosy", pattern: "Anosy" }, { name: "Menabe", pattern: "Menabe" } ] },
];

/* ------------------------------------------------------------------------------------------------
 * Cache : mémoire + disque.
 * Les contours et sous-divisions d'OpenStreetMap ne changent presque jamais : une fois chargés ils
 * sont gardés 30 jours (même après un redémarrage du serveur), donc le chargement n'est lent
 * que la toute première fois. Les échecs ne sont JAMAIS mis en cache.
 * ------------------------------------------------------------------------------------------------ */

const CACHE_FILE = process.env.ZONES_GEO_CACHE || path.join(process.cwd(), ".cache", "zones-geo.json");
const CACHE_TTL = 30 * 24 * 3600 * 1000;
const CACHE_MAX_BYTES = 80 * 1024 * 1024;

const memo = new Map<string, { at: number; value: unknown }>();
let diskLoaded = false;
let saveTimer: NodeJS.Timeout | null = null;

function loadDisk() {
  if (diskLoaded) return;
  diskLoaded = true;

  try {
    const raw: Record<string, { at: number; value: unknown }> = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    const now = Date.now();
    for (const [key, entry] of Object.entries(raw)) {
      if (entry && now - entry.at < CACHE_TTL) memo.set(key, entry);
    }
  } catch {
    /* pas encore de cache sur le disque */
  }
}

function saveDisk() {
  if (saveTimer) return;

  saveTimer = setTimeout(() => {
    saveTimer = null;

    try {
      const text = JSON.stringify(Object.fromEntries(memo));
      if (text.length > CACHE_MAX_BYTES) return;

      fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
      fs.writeFileSync(`${CACHE_FILE}.tmp`, text);
      fs.renameSync(`${CACHE_FILE}.tmp`, CACHE_FILE);
    } catch (error) {
      logger.warn("Cache des zones non enregistré sur le disque", error);
    }
  }, 5000);

  saveTimer.unref?.();
}

function memoGet<T>(key: string): T | null {
  loadDisk();
  const hit = memo.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL) {
    memo.delete(key);
    return null;
  }
  return hit.value as T;
}

function memoSet(key: string, value: unknown) {
  memo.set(key, { at: Date.now(), value });
  saveDisk();
}

/** Une même opération demandée plusieurs fois en même temps n'est exécutée qu'une fois. */
const pending = new Map<string, Promise<unknown>>();

function once<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = pending.get(key);
  if (hit) return hit as Promise<T>;

  const promise = fn().finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}

/** Le travail continue en arrière-plan : au nouvel essai du client, le résultat est déjà prêt. */
class PendingError extends Error {}

function withDeadline<T>(promise: Promise<T>, ms = 24000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new PendingError("pending")), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

function replyMapError(res: Response, error: unknown, message: string) {
  // Chargement encore en cours côté serveur : le client réessaie automatiquement
  if (error instanceof PendingError) return res.status(202).json({ success: false, pending: true, message: "Chargement en cours..." });

  logger.error(message, error);
  const cause = (error as Error)?.message ? ` (${String((error as Error).message).slice(0, 120)})` : "";
  return res.status(502).json({ success: false, message: `${message}${cause}` });
}

/* ------------------------------------------------------------------------------------------------
 * Outils géométriques
 * ------------------------------------------------------------------------------------------------ */

const round4 = (n: number) => Math.round(n * 10000) / 10000;

function roundGeometry(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(roundGeometry);
  return typeof node === "number" ? round4(node) : node;
}

function pointInRing(lat: number, lng: number, ring: number[][]): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }

  return inside;
}

function pointInGeometry(lat: number, lng: number, geometry: Json): boolean {
  const polygons: number[][][][] = geometry?.type === "Polygon" ? [geometry.coordinates] : geometry?.type === "MultiPolygon" ? geometry.coordinates : [];
  return polygons.some((rings) => rings[0] && pointInRing(lat, lng, rings[0]));
}

/** Allège une ligne : garde les points distants d'au moins `tol` degrés (le dernier est toujours gardé). */
function decimate(ring: number[][], tol: number): number[][] {
  if (ring.length <= 8) return ring;

  const out: number[][] = [ring[0]];
  for (let i = 1; i < ring.length - 1; i++) {
    const last = out[out.length - 1];
    if (Math.abs(ring[i][0] - last[0]) + Math.abs(ring[i][1] - last[1]) >= tol) out.push(ring[i]);
  }
  out.push(ring[ring.length - 1]);

  return out.length >= 4 ? out : ring;
}

/** Assemble des segments (ways OSM) bout à bout pour former des anneaux fermés. */
function stitchRings(ways: number[][][]): number[][][] {
  const key = (p: number[]) => `${p[0]},${p[1]}`;
  const pool = ways.filter((w) => w.length > 1).map((w) => [...w]);
  const rings: number[][][] = [];

  while (pool.length) {
    let ring = pool.shift() as number[][];

    while (key(ring[0]) !== key(ring[ring.length - 1])) {
      const tail = key(ring[ring.length - 1]);
      const index = pool.findIndex((w) => key(w[0]) === tail || key(w[w.length - 1]) === tail);
      if (index < 0) break;

      const next = pool.splice(index, 1)[0];
      ring = ring.concat(key(next[0]) === tail ? next.slice(1) : [...next].reverse().slice(1));
    }

    if (key(ring[0]) !== key(ring[ring.length - 1])) ring.push(ring[0]); // anneau resté ouvert : on le ferme
    if (ring.length >= 4) rings.push(ring);
  }

  return rings;
}

const bboxCenter = (bbox: number[]) => ({ lat: round4((bbox[0] + bbox[1]) / 2), lng: round4((bbox[2] + bbox[3]) / 2) });
const bboxOk = (bbox: number[]) => bbox.length === 4 && bbox.every(Number.isFinite);

/** [sud, nord, ouest, est] */
interface ShapeInfo { geometry: Json | null; bbox: number[]; center: { lat: number; lng: number }; partial?: boolean }

/* ------------------------------------------------------------------------------------------------
 * Nominatim (contours simplifiés) : requêtes groupées, 1 par seconde maximum
 * ------------------------------------------------------------------------------------------------ */

let nominatimQueue: Promise<unknown> = Promise.resolve();
let nominatimDownUntil = 0;

function nominatimGet(url: string, params: Record<string, unknown>) {
  const run = nominatimQueue.then(() => axios.get(url, { params, headers: { "User-Agent": UA }, timeout: 20000 }));
  nominatimQueue = run.catch(() => null).then(() => new Promise((resolve) => setTimeout(resolve, 1100)));
  return run;
}

/** Contours d'une liste de relations en UNE seule requête (50 maximum). */
async function nominatimShapes(ids: number[], threshold: number): Promise<Map<number, ShapeInfo>> {
  const out = new Map<number, ShapeInfo>();
  if (!ids.length || Date.now() < nominatimDownUntil) return out;

  try {
    const response = await nominatimGet("https://nominatim.openstreetmap.org/lookup", {
      osm_ids: ids.map((id) => `R${id}`).join(","),
      format: "jsonv2",
      polygon_geojson: 1,
      polygon_threshold: threshold,
      "accept-language": "fr",
    });

    for (const place of Array.isArray(response.data) ? response.data : []) {
      const geo: Json = place.geojson;
      const bbox = (place.boundingbox ?? []).map(Number);
      if (!geo || !["Polygon", "MultiPolygon"].includes(geo.type) || !bboxOk(bbox)) continue;

      out.set(Number(place.osm_id), { geometry: { type: geo.type, coordinates: roundGeometry(geo.coordinates) }, bbox, center: bboxCenter(bbox) });
    }
  } catch (error) {
    nominatimDownUntil = Date.now() + 20000;
    logger.warn("Nominatim indisponible : repli sur Overpass", (error as Error)?.message);
  }

  return out;
}

/* ------------------------------------------------------------------------------------------------
 * Overpass (OpenStreetMap) : 2 requêtes à la fois, plusieurs serveurs miroirs
 * ------------------------------------------------------------------------------------------------ */

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/** Miroir qui vient d'échouer : mis de côté un moment (429 = trop de requêtes) au lieu d'être retenté à chaque appel. */
const mirrorDownUntil = new Map<string, number>();

let overpassActive = 0;
const overpassWaiters: (() => void)[] = [];

async function overpass(query: string, timeout = 35000): Promise<Json[]> {
  if (overpassActive >= 2) await new Promise<void>((resolve) => overpassWaiters.push(resolve));
  overpassActive++;

  try {
    let lastError: unknown;

    const nowMs = Date.now();
    const ordered = [
      ...OVERPASS_URLS.filter((u) => (mirrorDownUntil.get(u) ?? 0) <= nowMs),
      ...OVERPASS_URLS.filter((u) => (mirrorDownUntil.get(u) ?? 0) > nowMs),
    ];

    for (const url of ordered) {
      try {
        const response = await axios.post(url, `data=${encodeURIComponent(query)}`, {
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
          timeout,
        });
        const elements: Json[] = response.data?.elements ?? [];

        // "out bb" et "out center" ne se combinent pas : on demande l'emprise et on en déduit le centre
        for (const e of elements) {
          if (e.bounds && !e.center) e.center = { lat: (Number(e.bounds.minlat) + Number(e.bounds.maxlat)) / 2, lon: (Number(e.bounds.minlon) + Number(e.bounds.maxlon)) / 2 };
        }

        // Overpass répond 200 avec une "remark" quand il est surchargé : on essaie le serveur suivant
        if (!elements.length && /runtime error|timed out|out of memory/i.test(String(response.data?.remark ?? ""))) {
          throw new Error(String(response.data.remark));
        }

        return elements;
      } catch (error) {
        lastError = error;

        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status !== 400) mirrorDownUntil.set(url, Date.now() + (status === 429 ? 60000 : 20000));
      }
    }

    throw lastError;
  } finally {
    overpassActive--;
    overpassWaiters.shift()?.();
  }
}

/** Emprise + centre d'un élément Overpass (`out bb center`). */
function stubOf(e: Json): ShapeInfo | null {
  const b = e?.bounds;
  const bbox = b ? [b.minlat, b.maxlat, b.minlon, b.maxlon].map(Number) : [];
  if (!bboxOk(bbox)) return null;

  return { geometry: null, bbox, center: bboxCenter(bbox), partial: true };
}

/** Contours complets (anneaux extérieurs) de relations, directement depuis Overpass. */
async function overpassShapes(ids: number[], tolerance: number): Promise<Map<number, ShapeInfo>> {
  const out = new Map<number, ShapeInfo>();
  if (!ids.length) return out;

  try {
    const elements = await overpass(`[out:json][timeout:60];rel(id:${ids.join(",")});out geom;`, 60000);

    for (const e of elements) {
      if (e.type !== "relation") continue;

      const ways: number[][][] = (e.members ?? [])
        .filter((m: Json) => m.type === "way" && Array.isArray(m.geometry) && m.geometry.length > 1 && m.role !== "inner")
        .map((m: Json) => m.geometry.map((p: Json) => [round4(Number(p.lon)), round4(Number(p.lat))]));

      const rings = stitchRings(ways).map((ring) => decimate(ring, tolerance));
      const stub = stubOf(e);
      if (!rings.length || !stub) continue;

      out.set(Number(e.id), { geometry: { type: "MultiPolygon", coordinates: rings.map((ring) => [ring]) }, bbox: stub.bbox, center: stub.center });
    }
  } catch (error) {
    logger.warn("Contours Overpass indisponibles", (error as Error)?.message);
  }

  return out;
}

/* ------------------------------------------------------------------------------------------------
 * Relations OpenStreetMap : niveau, emprise, contour
 * ------------------------------------------------------------------------------------------------ */

interface RelationInfo { level: number; name?: string; stub: ShapeInfo | null }

const infoKey = (id: number) => `info:v5:R${id}`;
const shapeKey = (id: number) => `shape:v3:R${id}`;

async function relationInfo(relId: number): Promise<RelationInfo> {
  const hit = memoGet<RelationInfo>(infoKey(relId));
  if (hit?.stub) return hit;

  return once(infoKey(relId), async () => {
    const e = (await overpass(`[out:json][timeout:25];rel(${relId});out tags bb;`))[0];
    if (!e) throw new Error("Zone introuvable dans OpenStreetMap");

    const info: RelationInfo = { level: Number(e.tags?.admin_level) || 4, name: e.tags?.name ? String(e.tags.name) : undefined, stub: stubOf(e) };
    memoSet(infoKey(relId), info);
    return info;
  });
}

/** Simplification demandée à Nominatim : plus la zone est petite, plus le contour est précis. */
function thresholdFor(level: number | null): number {
  if (level === null || level <= 4) return 0.01;
  if (level <= 6) return 0.004;
  return 0.001;
}

/** Tolérance (degrés) pour alléger les contours venant d'Overpass. */
function toleranceFor(level: number | null): number {
  if (level === null || level <= 4) return 0.004;
  if (level <= 6) return 0.002;
  return 0.0004;
}

const levelOf = (id: number): number | null => memoGet<RelationInfo>(infoKey(id))?.level ?? null;

const inflightShapes = new Map<number, Promise<void>>();
const resolvers = new Map<number, () => void>();
const queued = new Set<number>();
let flushTimer: NodeJS.Timeout | null = null;

/** Charge (et met en cache) les contours demandés : Nominatim pour les grandes zones, Overpass pour les petites, chacun en secours de l'autre. */
async function fetchShapeChunk(ids: number[]) {
  const store = (found: Map<number, ShapeInfo>) => found.forEach((shape, id) => memoSet(shapeKey(id), shape));
  const missing = (list: number[]) => list.filter((id) => !memoGet(shapeKey(id)));

  const coarse = ids.filter((id) => (levelOf(id) ?? 4) <= 6);
  const fine = ids.filter((id) => !coarse.includes(id));

  // 1er passage : la source la plus adaptée à chaque taille de zone
  const byThreshold = new Map<number, number[]>();
  coarse.forEach((id) => {
    const t = thresholdFor(levelOf(id));
    byThreshold.set(t, [...(byThreshold.get(t) ?? []), id]);
  });

  await Promise.all([
    ...[...byThreshold.entries()].map(async ([threshold, list]) => store(await nominatimShapes(list, threshold))),
    fine.length ? overpassShapes(fine, toleranceFor(7)).then(store) : Promise.resolve(),
  ]);

  // 2e passage : l'autre source pour ce qui manque encore
  const coarseLeft = missing(coarse);
  const fineLeft = missing(fine);

  await Promise.all([
    fineLeft.length ? nominatimShapes(fineLeft, 0.001).then(store) : Promise.resolve(),
    (async () => {
      for (let i = 0; i < coarseLeft.length; i += 2) {
        const part = coarseLeft.slice(i, i + 2);
        store(await overpassShapes(part, toleranceFor(levelOf(part[0]))));
      }
    })(),
  ]);

  // 3e passage : les petites zones encore absentes (Nominatim en panne) retentent Overpass une fois
  const stillLeft = missing(fineLeft);
  if (stillLeft.length) store(await overpassShapes(stillLeft, toleranceFor(7)));
}

/** Demande groupée de contours : tout ce qui est demandé dans les 150 ms part en UNE seule requête. Ne rejette jamais. */
function flushShapes() {
  flushTimer = null;
  const ids = [...queued];
  queued.clear();

  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);

    fetchShapeChunk(chunk)
      .catch((error) => logger.warn("Contours non chargés", (error as Error)?.message))
      .finally(() =>
        chunk.forEach((id) => {
          inflightShapes.delete(id);
          resolvers.get(id)?.();
          resolvers.delete(id);
        })
      );
  }
}

function requestShapes(ids: number[]): Promise<void> {
  const waits: Promise<void>[] = [];

  for (const id of new Set(ids)) {
    if (memoGet(shapeKey(id))) continue;

    let wait = inflightShapes.get(id);
    if (!wait) {
      wait = new Promise<void>((resolve) => resolvers.set(id, resolve));
      inflightShapes.set(id, wait);
      queued.add(id);
    }
    waits.push(wait);
  }

  if (queued.size && !flushTimer) flushTimer = setTimeout(flushShapes, 150);
  return Promise.all(waits).then(() => undefined);
}

/** Contour d'une relation. À défaut de contour, l'emprise + le centre (avec `partial`) : la carte affiche alors au moins le cercle du rayon. */
async function shapeOfRelation(relId: number, fast = false): Promise<ShapeInfo> {
  const hit = memoGet<ShapeInfo>(shapeKey(relId));
  if (hit) return hit;

  // Mode rapide : l'emprise + le centre répondent tout de suite, le contour détaillé se charge en arrière-plan
  if (fast) {
    const info = await relationInfo(relId);
    if (info.stub) {
      void requestShapes([relId]);
      return info.stub;
    }
  }

  await requestShapes([relId]);

  const done = memoGet<ShapeInfo>(shapeKey(relId));
  if (done) return done;

  const info = await relationInfo(relId);
  if (info.stub) return info.stub;

  throw new Error("Zone introuvable dans OpenStreetMap");
}

/* ------------------------------------------------------------------------------------------------
 * Régions (niveau 4) : toutes retrouvées en UNE requête, limitée à Madagascar
 * ------------------------------------------------------------------------------------------------ */

interface RegionRef { id: number }

const nameVariants = (tags: Json): string[] =>
  ["name", "name:fr", "name:mg", "name:en", "official_name", "alt_name"]
    .map((k) => tags?.[k])
    .filter(Boolean)
    .flatMap((v) => String(v).split(";").map((s) => s.trim()))
    .filter(Boolean);

const alnum = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const coreName = (v: string) => alnum(v).split(" ").filter((t) => !["region", "faritra", "de", "du", "d", "la", "l"].includes(t)).join(" ");

const REGIONS_KEY = "regions:v4";

function allRegions(): Promise<Record<string, RegionRef>> {
  const hit = memoGet<Record<string, RegionRef>>(REGIONS_KEY);
  if (hit) return Promise.resolve(hit);

  return once(REGIONS_KEY, async () => {
    const query = (area: string) =>
      `[out:json][timeout:40];${area}->.mg;rel(area.mg)["boundary"="administrative"]["admin_level"~"^[3-5]$"];out tags bb;`;

    let elements = await overpass(query(`area["ISO3166-1"="MG"]["admin_level"="2"]`), 45000);
    if (!elements.length) elements = await overpass(query(`area["name"~"^(Madagascar|Madagasikara)$"]["admin_level"="2"]`), 45000);

    const out: Record<string, RegionRef> = {};

    for (const province of PROVINCES) {
      for (const region of province.regions) {
        const regex = new RegExp(`^(R.gion (de |du |d.)?)?(${region.pattern})( [Rr].gion)?$`, "i");
        const exact = elements.filter((e) => nameVariants(e.tags).some((n) => regex.test(n)));
        const loose = exact.length ? exact : elements.filter((e) => nameVariants(e.tags).some((n) => coreName(n) === coreName(region.name)));
        const best = loose.find((e) => e.tags?.admin_level === "4") ?? loose[0];
        if (!best) continue;

        out[region.name] = { id: Number(best.id) };
        const regionInfo: RelationInfo = { level: Number(best.tags?.admin_level) || 4, stub: stubOf(best) };
        memoSet(infoKey(Number(best.id)), regionInfo);
      }
    }

    if (!Object.keys(out).length) throw new Error("Régions introuvables dans OpenStreetMap");

    // Un résultat incomplet est renvoyé mais pas gardé : il sera recalculé au prochain appel
    if (Object.keys(out).length >= 20) memoSet(REGIONS_KEY, out);
    return out;
  });
}

async function regionRelation(name: string): Promise<number | null> {
  return (await allRegions())[name]?.id ?? null;
}

async function relationOf(parent: string): Promise<number | null> {
  if (parent.startsWith("RG:")) return regionRelation(parent.slice(3));
  if (parent.startsWith("R:")) return Number(parent.slice(2)) || null;
  return null;
}

/** Au démarrage de la saisie : régions et contours préchargés en arrière-plan, pour une sélection instantanée. */
let warmedAt = 0;

function warmUp() {
  if (Date.now() - warmedAt < 10 * 60 * 1000) return;
  warmedAt = Date.now();

  allRegions()
    .then((regions) => requestShapes(Object.values(regions).map((r) => r.id)))
    .catch((error) => {
      warmedAt = 0;
      logger.warn("Préchargement des régions impossible", (error as Error)?.message);
    });
}

/* ------------------------------------------------------------------------------------------------
 * Sous-divisions : uniquement ce qui est réellement DANS la zone parente
 * ------------------------------------------------------------------------------------------------ */

interface Child { id: string; name: string; lat: number; lng: number }

/** Un élément appartient à la zone parente si son centre y est, ou si la majorité de son emprise y est. */
function belongsTo(e: Json, parent: ShapeInfo): boolean {
  const b = e.bounds;
  const c = e.center;
  if (!b || !c) return false;

  // Emprise totalement hors de celle du parent : écarté sans calcul
  const [s, n, w, ea] = parent.bbox;
  if (b.maxlat < s || b.minlat > n || b.maxlon < w || b.minlon > ea) return false;

  if (!parent.geometry) {
    const inCenter = Number(c.lat) >= s && Number(c.lat) <= n && Number(c.lon) >= w && Number(c.lon) <= ea;
    const area = Math.max(1e-9, (b.maxlat - b.minlat) * (b.maxlon - b.minlon));
    const overlap = Math.max(0, Math.min(b.maxlat, n) - Math.max(b.minlat, s)) * Math.max(0, Math.min(b.maxlon, ea) - Math.max(b.minlon, w));
    return inCenter && overlap / area >= 0.7;
  }
  if (pointInGeometry(Number(c.lat), Number(c.lon), parent.geometry)) return true;

  // Centre tombé dehors (zone en forme de croissant, côte...) : 9 points répartis dans l'emprise
  let inside = 0;
  for (const fy of [1 / 6, 3 / 6, 5 / 6]) {
    for (const fx of [1 / 6, 3 / 6, 5 / 6]) {
      if (pointInGeometry(b.minlat + (b.maxlat - b.minlat) * fy, b.minlon + (b.maxlon - b.minlon) * fx, parent.geometry)) inside++;
    }
  }

  return inside >= 6;
}

/** Demi-côté (degrés) du carré tracé autour d'un lieu sans contour : rayon ≈ 1,5 km (valeur par défaut d'un fokontany). */
const POINT_HALF = 0.0095;

const pointKey = (id: number) => `pt:v1:N${id}`;

function pointShape(lat: number, lng: number): ShapeInfo {
  return { geometry: null, bbox: [round4(lat - POINT_HALF), round4(lat + POINT_HALF), round4(lng - POINT_HALF), round4(lng + POINT_HALF)], center: { lat: round4(lat), lng: round4(lng) } };
}

/**
 * Beaucoup de communes n'ont pas de contour de fokontany dans OpenStreetMap : on propose alors les villages,
 * hameaux et quartiers (points « place ») situés dans la commune. Chacun devient un fokontany localisé par son point.
 */
async function placesInside(parent: ShapeInfo): Promise<Child[]> {
  const [south, north, west, east] = parent.bbox;
  const elements = await overpass(
    `[out:json][timeout:40];node["place"~"^(village|hamlet|suburb|neighbourhood|quarter|town)$"]["name"](${south},${west},${north},${east});out;`,
    45000
  );

  const seen = new Set<string>();
  const list: Child[] = [];

  for (const e of elements) {
    const lat = Number(e.lat);
    const lng = Number(e.lon);
    const name = String(e.tags?.name ?? "").trim();
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (parent.geometry && !pointInGeometry(lat, lng, parent.geometry)) continue;

    const dedupe = `${name.toLowerCase()}|${lat.toFixed(2)}|${lng.toFixed(2)}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    memoSet(pointKey(Number(e.id)), { lat, lng });
    list.push({ id: `N:${e.id}`, name, lat, lng });
  }

  return list.sort((a, b) => a.name.localeCompare(b.name, "fr")).slice(0, 400);
}

/* ------------------------------------------------------------------------------------------------
 * Liste officielle des communes / fokontany (fichier local data/mg-fokontany-by-commune.json)
 * Identifiants : C:<commune>@lat,lng (commune retrouvée par son chef-lieu)
 *                F:<commune>:<n°>@lat,lng (fokontany ; le point est celui du lieu OSM de même nom, sinon le centre de la commune)
 * Ils contiennent leurs coordonnées : ils restent valables après un redémarrage du serveur.
 * ------------------------------------------------------------------------------------------------ */

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const slug = (key: string) => key.replace(/ /g, "_");

/** Villages / quartiers d'une commune, gardés en cache ; les lenteurs d'Overpass ne bloquent plus la réponse. */
function placesOf(relId: number, parent: ShapeInfo): Promise<Child[]> {
  const key = `places:v1:R${relId}`;
  const hit = memoGet<Child[]>(key);
  if (hit) return Promise.resolve(hit);

  return once(key, async () => {
    const list = await placesInside(parent);
    memoSet(key, list);
    return list;
  });
}

async function fokontanyOfCommunes(entries: ReturnType<typeof findCommunes>, relId: number, parent: ShapeInfo): Promise<{ items: Child[]; complete: boolean }> {
  // Position précise : lieux OpenStreetMap portant le même nom (8 s d'attente au plus, le reste continue en arrière-plan)
  let places: Child[] = [];
  let complete = true;

  if (parent.geometry) {
    const found = await Promise.race([placesOf(relId, parent).catch(() => null), sleep(8000).then(() => null)]);
    if (found) places = found;
    else complete = false;
  }

  const byName = new Map<string, Child>();
  for (const place of places) {
    const k = fokontanyKey(place.name);
    if (k && !byName.has(k)) byName.set(k, place);
  }

  const items: Child[] = [];

  for (const entry of entries) {
    entry.fokontany.forEach((name, index) => {
      const spot = byName.get(fokontanyKey(name));
      const lat = round4(spot?.lat ?? parent.center.lat);
      const lng = round4(spot?.lng ?? parent.center.lng);

      items.push({
        id: `F:${slug(entry.key)}:${index}@${lat},${lng}`,
        name: entries.length > 1 ? `${name} (${entry.name})` : name,
        lat,
        lng,
      });
    });
  }

  items.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return { items, complete };
}

const RANK: Record<string, number> = { city: 0, town: 0, village: 1, suburb: 2, hamlet: 3, locality: 4 };

/** Communes d'un district quand OpenStreetMap n'en a pas le contour : on les retrouve par le lieu qui porte leur nom. */
async function communesFromPlaces(parent: ShapeInfo): Promise<Child[]> {
  const [south, north, west, east] = parent.bbox;
  const elements = await overpass(
    `[out:json][timeout:40];node["place"~"^(city|town|village|hamlet|suburb|locality)$"]["name"](${south},${west},${north},${east});out;`,
    45000
  );

  const best = new Map<string, { rank: number; child: Child }>();

  for (const e of elements) {
    const lat = Number(e.lat);
    const lng = Number(e.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (parent.geometry && !pointInGeometry(lat, lng, parent.geometry)) continue;

    const rank = RANK[String(e.tags?.place)] ?? 5;

    for (const entry of findCommunes(e.tags?.name, false)) {
      const known = best.get(entry.key);
      if (known && known.rank <= rank) continue;

      best.set(entry.key, { rank, child: { id: `C:${slug(entry.key)}@${round4(lat)},${round4(lng)}`, name: entry.name, lat: round4(lat), lng: round4(lng) } });
    }
  }

  return [...best.values()].map((b) => b.child).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

const DATA_ID = /^([CF]):([a-z0-9_]+)(?::(\d+))?@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/;

function parseDataId(id: string) {
  const m = DATA_ID.exec(id);
  if (!m) return null;
  return { kind: m[1], key: m[2].replace(/_/g, " "), index: m[3] === undefined ? null : Number(m[3]), lat: Number(m[4]), lng: Number(m[5]) };
}

/** Fokontany d'une commune identifiée par C:... (point = chef-lieu de la commune). */
function childrenOfDataCommune(id: string): Child[] | null {
  const parsed = parseDataId(id);
  if (!parsed || parsed.kind !== "C") return null;

  const entry = communeByKey(communeKey(parsed.key));
  if (!entry) return null;

  return entry.fokontany
    .map((name, index) => ({ id: `F:${slug(entry.key)}:${index}@${round4(parsed.lat)},${round4(parsed.lng)}`, name, lat: parsed.lat, lng: parsed.lng }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

function shapeOfDataId(id: string): ShapeInfo | null {
  const parsed = parseDataId(id);
  if (!parsed) return null;

  const half = parsed.kind === "C" ? DEFAULT_RADIUS_KM.COMMUNE / 111 : POINT_HALF;
  return { geometry: null, bbox: [round4(parsed.lat - half), round4(parsed.lat + half), round4(parsed.lng - half), round4(parsed.lng + half)], center: { lat: round4(parsed.lat), lng: round4(parsed.lng) } };
}

/** Sous-divisions directes : le premier niveau administratif inférieur qui contient des éléments (les niveaux vides sont sautés). */
function childrenOfRelation(relId: number): Promise<Child[]> {
  const key = `children:v5:R${relId}`;
  const hit = memoGet<Child[]>(key);
  if (hit) return Promise.resolve(hit);

  return once(key, async () => {
    const info = await relationInfo(relId);
    const shapePromise = shapeOfRelation(relId);

    // Le contour du parent sert à écarter les zones voisines ; on l'attend 12 s au plus, sans quoi on filtre sur l'emprise
    let parent: ShapeInfo;
    if (info.stub) {
      parent = await Promise.race([
        shapePromise,
        new Promise<ShapeInfo>((resolve) => setTimeout(() => resolve(info.stub as ShapeInfo), 12000)),
      ]).catch(() => info.stub as ShapeInfo);
    } else {
      parent = await shapePromise; // emprise connue uniquement via le contour
    }

    const [south, north, west, east] = parent.bbox;

    // Sans contour du parent (Nominatim et Overpass indisponibles pour ce contour), repli sur l'emprise :
    // une zone n'est gardée que si l'essentiel de SON emprise est dans celle du parent. Ce résultat n'est pas mis en cache.
    const approximate = !parent.geometry;
    if (approximate) logger.warn(`Contour du parent R${relId} indisponible : sous-divisions filtrées sur l'emprise`);

    // Commune connue de la liste officielle : ses fokontany viennent du fichier local, pas d'OpenStreetMap
    const official = info.level >= 8 ? findCommunes(info.name) : [];
    if (official.length) {
      const list = await fokontanyOfCommunes(official, relId, parent);
      if (list.complete && !approximate) memoSet(key, list.items);
      return list.items;
    }

    // Un district contient des communes (niveau 8) : inutile de chercher des niveaux plus fins
    const passes = info.level >= 6 && info.level < 8 ? [[info.level + 1, info.level + 2]] : [[info.level + 1, info.level + 2], [info.level + 3, info.level + 4]];

    for (const levels of passes) {
      const elements = await overpass(
        // Recherche par emprise : beaucoup plus légère pour Overpass qu'une recherche par surface (map_to_area)
        `[out:json][timeout:50];rel["boundary"="administrative"]["admin_level"~"^(${levels.join("|")})$"](${south},${west},${north},${east});out tags bb;`,
        55000
      );

      const inside = elements.filter((e) => Number(e.id) !== relId && e.tags?.name && e.center && belongsTo(e, parent));

      for (const level of levels) {
        const group = inside.filter((e) => Number(e.tags.admin_level) === level);
        if (!group.length) continue;

        const seen = new Set<number>();
        const list: Child[] = [];

        for (const e of group) {
          if (seen.has(e.id)) continue;
          seen.add(e.id);

          const childInfo: RelationInfo = { level, name: String(e.tags.name), stub: stubOf(e) };
          memoSet(infoKey(Number(e.id)), childInfo);
          list.push({ id: `R:${e.id}`, name: String(e.tags.name), lat: Number(e.center.lat), lng: Number(e.center.lon) });
        }

        list.sort((a, b) => a.name.localeCompare(b.name, "fr"));
        if (!approximate) memoSet(key, list);

        // Contours des enfants préchargés par lots : cocher un élément est ensuite instantané
        void requestShapes(list.filter((c) => c.id.startsWith("R:")).slice(0, 80).map((c) => Number(c.id.slice(2))));

        return list;
      }
    }

    // District sans contour de commune dans OpenStreetMap : communes de la liste officielle retrouvées par leur chef-lieu
    if (info.level >= 6 && info.level < 8 && hasFokontanyData()) {
      const communes = await communesFromPlaces(parent);
      if (communes.length) {
        if (!approximate) memoSet(key, communes);
        return communes;
      }
    }

    // Commune (ou plus fin) sans contour de fokontany : villages / quartiers de la commune
    if (info.level >= 8) {
      const places = await placesInside(parent);
      if (places.length) {
        if (!approximate) memoSet(key, places);
        return places;
      }
    }

    return [];
  });
}

/** Contour d'une province : assemblage des contours de ses régions (une province n'existe plus dans OpenStreetMap). */
function provinceShape(name: string, fast = false): Promise<ShapeInfo> {
  const key = `shape:v3:PV:${name}`;
  const hit = memoGet<ShapeInfo>(key);
  if (hit) return Promise.resolve(hit);

  return once(`${key}:${fast ? "fast" : "full"}`, async () => {
    const province = PROVINCES.find((p) => p.name === name);
    if (!province) throw new Error("Province inconnue");

    const regions = await allRegions();
    const ids = province.regions.map((r) => regions[r.name]?.id).filter((id): id is number => Boolean(id));
    if (!ids.length) throw new Error("Contour de province introuvable");

    if (fast) void requestShapes(ids);
    else await requestShapes(ids);

    const polygons: unknown[] = [];
    let south = 90, north = -90, west = 180, east = -180;
    let complete = ids.length === province.regions.length;

    for (const id of ids) {
      const s = await shapeOfRelation(id, fast);

      if (s.geometry) polygons.push(...(s.geometry.type === "Polygon" ? [s.geometry.coordinates] : s.geometry.coordinates));
      else complete = false;

      south = Math.min(south, s.bbox[0]); north = Math.max(north, s.bbox[1]);
      west = Math.min(west, s.bbox[2]); east = Math.max(east, s.bbox[3]);
    }

    const bbox = [south, north, west, east];
    const shape: ShapeInfo = {
      geometry: polygons.length ? { type: "MultiPolygon", coordinates: polygons } : null,
      bbox,
      center: bboxCenter(bbox),
      ...(complete ? {} : { partial: true }),
    };

    if (complete) memoSet(key, shape);
    return shape;
  });
}

const adminRoles = authorizeRoles("ADMIN", "DIRECTION");

router.get("/admin/provinces", adminRoles, (_req: Request, res: Response) => {
  warmUp();
  res.json({ success: true, data: PROVINCES.map((p) => ({ id: `PV:${p.name}`, name: p.name })) });
});

router.get("/admin/children", adminRoles, async (req: Request, res: Response) => {
  try {
    const parent = String(req.query.parent ?? "");

    if (parent.startsWith("PV:")) {
      warmUp();
      const province = PROVINCES.find((p) => p.name === parent.slice(3));
      return res.json({ success: true, data: (province?.regions ?? []).map((r) => ({ id: `RG:${r.name}`, name: r.name })) });
    }

    if (parent.startsWith("C:") || parent.startsWith("F:")) {
      const list = parent.startsWith("C:") ? childrenOfDataCommune(parent) : [];
      if (!list) return res.status(404).json({ success: false, message: "Commune introuvable dans la liste officielle." });
      return res.json({ success: true, data: list });
    }

    const data = await withDeadline(
      (async () => {
        const relId = await relationOf(parent);
        return relId ? childrenOfRelation(relId) : null;
      })()
    );

    if (!data) return res.status(404).json({ success: false, message: "Zone parente introuvable dans OpenStreetMap." });
    res.json({ success: true, data });
  } catch (error) {
    replyMapError(res, error, "Service de cartographie indisponible, réessayez dans un instant.");
  }
});

/** Contour d'une zone (`id` = PV:..., RG:... ou R:...). */
async function shapeOfId(id: string, fast = false): Promise<ShapeInfo | null> {
  if (id.startsWith("N:")) {
    const nodeId = Number(id.slice(2));
    if (!nodeId) return null;

    let point = memoGet<{ lat: number; lng: number }>(pointKey(nodeId));
    if (!point) {
      const e = (await overpass(`[out:json][timeout:25];node(${nodeId});out;`))[0];
      if (!e) return null;
      point = { lat: Number(e.lat), lng: Number(e.lon) };
      memoSet(pointKey(nodeId), point);
    }

    return pointShape(point.lat, point.lng);
  }

  if (id.startsWith("C:") || id.startsWith("F:")) return shapeOfDataId(id);

  if (id.startsWith("PV:")) return PROVINCES.some((p) => p.name === id.slice(3)) ? provinceShape(id.slice(3), fast) : null;

  const relId = await relationOf(id);
  return relId ? shapeOfRelation(relId, fast) : null;
}

router.get("/admin/shape", adminRoles, async (req: Request, res: Response) => {
  try {
    const shape = await withDeadline(shapeOfId(String(req.query.id ?? ""), req.query.fast === "1"));
    if (!shape) return res.status(404).json({ success: false, message: "Zone introuvable dans OpenStreetMap." });

    res.json({ success: true, data: shape });
  } catch (error) {
    replyMapError(res, error, "Contour indisponible pour le moment, réessayez.");
  }
});

/** Plusieurs contours d'un coup (`ids` séparés par des virgules) ; ceux qui échouent sont simplement absents. */
router.get("/admin/shapes", adminRoles, async (req: Request, res: Response) => {
  try {
    const ids = String(req.query.ids ?? "").split(",").map((v) => v.trim()).filter(Boolean).slice(0, 40);
    const out: Record<string, ShapeInfo> = {};

    await withDeadline(
      (async () => {
        await requestShapes(ids.filter((id) => id.startsWith("R:")).map((id) => Number(id.slice(2))).filter(Boolean));

        await Promise.all(
          ids.map(async (id) => {
            try {
              const shape = await shapeOfId(id);
              if (shape) out[id] = shape;
            } catch {
              /* absent de la réponse */
            }
          })
        );
      })()
    );

    res.json({ success: true, data: out });
  } catch (error) {
    replyMapError(res, error, "Contours indisponibles pour le moment, réessayez.");
  }
});

/**
 * Détecte une zone depuis la carte (GET /zones/lookup?lat=&lng=&level=) ou depuis son nom
 * (GET /zones/lookup?q=&level=) : adresse postale, région, rayon calculé et contour.
 * Source : Nominatim (OpenStreetMap), comme l'altitude passe par le backend.
 */
router.get("/lookup", authorizeRoles("ADMIN", "DIRECTION"), async (req: Request, res: Response) => {
  try {
    const level = LEVELS.includes(String(req.query.level)) ? String(req.query.level) : "COMMUNE";
    const q = String(req.query.q ?? "").trim();
    const lat = num(req.query.lat);
    const lng = num(req.query.lng);
    const hasPoint = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);

    if (!hasPoint && !q) {
      return res.status(400).json({ success: false, message: "Indiquez un point sur la carte ou le nom de la zone." });
    }

    const common = { format: "jsonv2", addressdetails: 1, polygon_geojson: 1, polygon_threshold: 0.01, "accept-language": "fr" };
    const headers = { "User-Agent": "NdaoHifanosika/1.0 (suivi-evaluation)" };

    let place: Json = null;

    if (hasPoint) {
      const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
        params: { ...common, lat, lon: lng, zoom: NOMINATIM_ZOOM[level] },
        headers,
        timeout: 12000,
      });
      place = response.data && !response.data.error ? response.data : null;
    } else {
      const response = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { ...common, q: `${q}, Madagascar`, countrycodes: "mg", limit: 1 },
        headers,
        timeout: 12000,
      });
      place = Array.isArray(response.data) ? response.data[0] ?? null : null;
    }

    if (!place) {
      return res.status(404).json({ success: false, message: "Aucun lieu trouvé : saisissez les informations manuellement." });
    }

    const centerLat = hasPoint ? (lat as number) : Number(place.lat);
    const centerLng = hasPoint ? (lng as number) : Number(place.lon);
    const a: Json = place.address ?? {};
    const name = place.name || a.neighbourhood || a.suburb || a.village || a.hamlet || a.town || a.city || a.municipality || a.county || a.state || "";

    res.json({
      success: true,
      data: {
        name: String(name),
        address: addressFrom(place),
        region: a.state ?? a.state_district ?? null,
        latitude: centerLat,
        longitude: centerLng,
        radiusKm: radiusFromBbox(centerLat, centerLng, place.boundingbox, level),
        boundary: boundaryText(place.geojson),
        level,
      },
    });
  } catch (error) {
    logger.error("Erreur recherche zone", error);
    res.status(502).json({ success: false, message: "Service de cartographie indisponible : saisissez les informations manuellement." });
  }
});

router.get("/", authorizeRoles("ADMIN", "DIRECTION", "COORDINATOR", "DAF", "COMMUNICATION"), async (_req: Request, res: Response) => {
  try {
    // La zone ajoutée en dernier apparaît en premier
    res.json({ success: true, data: await db.zone.findMany({ orderBy: { id: "desc" } }) });
  } catch (error) {
    logger.error("Erreur liste zones", error);
    sendError(res, error, "Erreur serveur");
  }
});

router.get("/:id", authorizeRoles("ADMIN", "DIRECTION", "COORDINATOR", "DAF", "COMMUNICATION"), async (req: Request, res: Response) => {
  const zone = await db.zone.findUnique({ where: { id: Number(req.params.id) } });
  if (!zone) return res.status(404).json({ success: false, message: "Zone introuvable" });
  res.json({ success: true, data: zone });
});

router.post("/", authorizeRoles("ADMIN", "DIRECTION"), async (req: Request, res: Response) => {
  try {
    const data = toData(req.body ?? {});
    const error = validate(data);
    if (error) return res.status(400).json({ success: false, message: error });

    if (await db.zone.findUnique({ where: { name: data.name } })) {
      return res.status(409).json({ success: false, message: "Une zone porte déjà ce nom" });
    }

    const zone = await db.zone.create({ data });
    if (zone.isHeadquarters) await enforceSingleHq(zone.id);

    res.status(201).json({ success: true, data: zone });
  } catch (error) {
    logger.error("Erreur création zone", error);
    sendError(res, error, "Erreur serveur");
  }
});

router.put("/:id", authorizeRoles("ADMIN", "DIRECTION"), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = toData(req.body ?? {});
    const error = validate(data);
    if (error) return res.status(400).json({ success: false, message: error });

    if (!(await db.zone.findUnique({ where: { id } }))) {
      return res.status(404).json({ success: false, message: "Zone introuvable" });
    }

    const zone = await db.zone.update({ where: { id }, data });
    if (zone.isHeadquarters) await enforceSingleHq(zone.id);

    res.json({ success: true, data: zone });
  } catch (error) {
    logger.error("Erreur mise à jour zone", error);
    sendError(res, error, "Erreur serveur (nom déjà utilisé ?)");
  }
});

router.delete("/:id", authorizeRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    await db.zone.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch {
    res.status(404).json({ success: false, message: "Zone introuvable" });
  }
});

/** Zones par défaut au premier démarrage (modifiables ensuite par l'administrateur). */
export async function ensureDefaultZones(): Promise<void> {
  try {
    if ((await db.zone.count()) > 0) return;

    await db.zone.createMany({
      data: [
        { name: "Antananarivo", region: "Analamanga", latitude: -18.8792, longitude: 47.5079, radiusKm: 30 },
        { name: "Fianarantsoa", region: "Haute Matsiatra", latitude: -21.4536, longitude: 47.0857, radiusKm: 30 },
      ],
    });
  } catch (error) {
    logger.error("Zones par défaut non créées", error);
  }
}

/* ---------------- Page d'accueil publique : adresse + zones ---------------- */

publicOrganizationRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const [zones, projects, beneficiaries] = await Promise.all([
      db.zone.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.project.count(),
      prisma.beneficiary.count(),
    ]);

    const hq = zones.find((z: Json) => z.isHeadquarters) ?? null;

    res.json({
      success: true,
      data: {
        headquarters: hq
          ? { name: hq.name, address: hq.address, phone: hq.phone, email: hq.email, latitude: hq.latitude, longitude: hq.longitude }
          : null,
        zones: zones.map((z: Json) => ({ id: z.id, name: z.name, region: z.region, latitude: z.latitude, longitude: z.longitude })),
        stats: { projects, beneficiaries, zones: zones.length },
      },
    });
  } catch (error) {
    logger.error("Erreur organisation publique", error);
    sendError(res, error, "Erreur serveur");
  }
});

export default router;
