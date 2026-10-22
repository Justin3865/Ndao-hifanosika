import { Request, Response } from "express";
import axios from "axios";
import { logger } from "../config/logger";

/**
 * Altitude d'un point (GET /api/elevation?lat=..&lng=..).
 *
 * Le service public « api.open-elevation.com » est souvent lent ou hors service.
 * On interroge donc plusieurs fournisseurs gratuits, dans l'ordre, jusqu'à obtenir une valeur :
 *   1. Open-Meteo      (fiable, sans clé)
 *   2. Open-Elevation  (ancien fournisseur)
 *   3. OpenTopoData    (SRTM 90 m)
 *   4. Google Elevation, seulement si GOOGLE_ELEVATION_API_KEY est défini dans le .env du backend
 * Les résultats sont gardés en mémoire (24 h) pour éviter de rappeler les services externes.
 */

const TIMEOUT_MS = 7000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;

type Provider = {
  name: string;
  enabled?: () => boolean;
  lookup: (lat: number, lng: number) => Promise<unknown>;
};

const PROVIDERS: Provider[] = [
  {
    name: "open-meteo",
    lookup: async (lat, lng) => {
      const res = await axios.get("https://api.open-meteo.com/v1/elevation", {
        params: { latitude: lat, longitude: lng },
        timeout: TIMEOUT_MS,
      });
      const value = res.data?.elevation;
      return Array.isArray(value) ? value[0] : value;
    },
  },
  {
    name: "open-elevation",
    lookup: async (lat, lng) => {
      const res = await axios.get("https://api.open-elevation.com/api/v1/lookup", {
        params: { locations: `${lat},${lng}` },
        timeout: TIMEOUT_MS,
      });
      return res.data?.results?.[0]?.elevation;
    },
  },
  {
    name: "opentopodata",
    lookup: async (lat, lng) => {
      const res = await axios.get("https://api.opentopodata.org/v1/srtm90m", {
        params: { locations: `${lat},${lng}` },
        timeout: TIMEOUT_MS,
      });
      return res.data?.results?.[0]?.elevation;
    },
  },
  {
    name: "google",
    enabled: () => Boolean(process.env.GOOGLE_ELEVATION_API_KEY),
    lookup: async (lat, lng) => {
      const res = await axios.get("https://maps.googleapis.com/maps/api/elevation/json", {
        params: { locations: `${lat},${lng}`, key: process.env.GOOGLE_ELEVATION_API_KEY },
        timeout: TIMEOUT_MS,
      });
      return res.data?.status === "OK" ? res.data?.results?.[0]?.elevation : null;
    },
  },
];

const cache = new Map<string, { elevation: number; source: string; at: number }>();

const isValidElevation = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > -1000 && value < 9500;

export async function lookupElevation(
  lat: number,
  lng: number,
): Promise<{ elevation: number; source: string } | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const hit = cache.get(key);

  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { elevation: hit.elevation, source: `${hit.source} (cache)` };
  }

  for (const provider of PROVIDERS) {
    if (provider.enabled && !provider.enabled()) continue;

    try {
      const value = await provider.lookup(lat, lng);

      if (isValidElevation(value)) {
        const elevation = Math.round(value);

        if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
        cache.set(key, { elevation, source: provider.name, at: Date.now() });

        return { elevation, source: provider.name };
      }
    } catch (error) {
      logger.warn(
        `Altitude : ${provider.name} indisponible`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return null;
}

export async function getElevation(req: Request, res: Response): Promise<void> {
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lng);

  if (
    req.query.lat === undefined ||
    req.query.lng === undefined ||
    req.query.lat === "" ||
    req.query.lng === "" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    res.status(400).json({ success: false, message: "Latitude ou longitude invalide." });
    return;
  }

  try {
    const result = await lookupElevation(latitude, longitude);

    if (!result) {
      res.status(502).json({
        success: false,
        message: "Altitude indisponible : aucun service d'altitude ne répond pour le moment.",
      });
      return;
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error("Erreur récupération altitude", error);
    res.status(502).json({ success: false, message: "Impossible de récupérer l'altitude pour le moment." });
  }
}
