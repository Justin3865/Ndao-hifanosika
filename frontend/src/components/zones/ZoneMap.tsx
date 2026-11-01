"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MAPS_ENABLED, loadGoogleMaps } from "@/components/maps/GoogleMap";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const ZONE_LEVELS = [
  { value: "PROVINCE", label: "Province" },
  { value: "REGION", label: "Région" },
  { value: "DISTRICT", label: "District" },
  { value: "COMMUNE", label: "Commune" },
  { value: "FOKONTANY", label: "Fokontany" },
];

export const zoneLevelLabel = (value?: string | null) => ZONE_LEVELS.find((l) => l.value === value)?.label ?? "—";

export interface ZoneLevelDetail {
  key: string;
  name: string;
  level: string;
  label: string;
  lat: number;
  lng: number;
  /** Rayon (km) : distance du centre au coin le plus éloigné de l'emprise, même formule que le formulaire */
  km: number;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (v: number) => (v * Math.PI) / 180;
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Latitude, longitude et rayon de chaque niveau enregistré dans le contour de la zone (comme dans le formulaire). */
export function zoneLevelDetails(zone: any): ZoneLevelDetail[] {
  try {
    const geo: any = typeof zone?.boundary === "string" ? JSON.parse(zone.boundary) : zone?.boundary;
    if (geo?.type !== "FeatureCollection") return [];

    const out: ZoneLevelDetail[] = [];

    (geo.features ?? []).forEach((f: any, index: number) => {
      const p = f?.properties ?? {};
      const lat = Number(p.center?.lat);
      const lng = Number(p.center?.lng);
      const bbox: number[] = Array.isArray(p.bbox) ? p.bbox.map(Number) : [];
      const level = ZONE_LEVELS.find((l) => l.value === p.level);
      if (!level || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

      let km = 0;
      if (bbox.length === 4 && bbox.every(Number.isFinite)) {
        const [s, n, w, e] = bbox;
        km = Math.max(haversineKm(lat, lng, s, w), haversineKm(lat, lng, s, e), haversineKm(lat, lng, n, w), haversineKm(lat, lng, n, e));
      }

      out.push({ key: `${p.id ?? index}`, name: String(p.name ?? ""), level: level.value, label: level.label, lat, lng, km: Math.round(km * 10) / 10 });
    });

    return out.sort((a, b) => ZONE_LEVELS.findIndex((l) => l.value === a.level) - ZONE_LEVELS.findIndex((l) => l.value === b.level));
  } catch {
    return [];
  }
}

export interface ZonePlace {
  level: string;
  label: string;
  names: string[];
}

/**
 * Hiérarchie enregistrée d'une zone (Province, Région, District, Commune, Fokontany) lue dans son contour :
 * chaque élément coché y garde son nom et la liste de ses parents. Une ancienne zone sans contour garde sa région.
 */
export function zonePlaces(zone: any): ZonePlace[] {
  const found: Record<string, string[]> = {};
  const add = (level: string, name: unknown) => {
    const value = String(name ?? "").trim();
    if (!value || !ZONE_LEVELS.some((l) => l.value === level)) return;
    found[level] = found[level] ?? [];
    if (!found[level].includes(value)) found[level].push(value);
  };

  try {
    const geo: any = typeof zone?.boundary === "string" ? JSON.parse(zone.boundary) : zone?.boundary;

    if (geo?.type === "FeatureCollection") {
      // Seul le niveau le plus précis compte : ses parents viennent de son chemin (les autres éléments cochés au-dessus ne sont pas ses parents)
      const props: any[] = (geo.features ?? []).map((f: any) => f?.properties ?? {});
      const depth = (p: any) => ZONE_LEVELS.findIndex((l) => l.value === p.level);
      const deepest = Math.max(-1, ...props.map(depth));

      for (const p of props.filter((q) => depth(q) === deepest && deepest >= 0)) {
        (Array.isArray(p.path) ? p.path : []).forEach((name: unknown, i: number) => add(ZONE_LEVELS[i]?.value ?? "", name));
        add(p.level, p.name);
      }
    }
  } catch {
    /* contour simple ou absent */
  }

  if (!Object.keys(found).length && zone?.region) add("REGION", zone.region);

  return ZONE_LEVELS.filter((l) => found[l.value]?.length).map((l) => ({ level: l.value, label: l.label, names: found[l.value] }));
}

/** Une couleur par niveau : province, région, district, commune, fokontany */
export const LEVEL_COLORS: Record<string, string> = {
  PROVINCE: "#7c3aed",
  REGION: "#2563eb",
  DISTRICT: "#16a34a",
  COMMUNE: "#ea580c",
  FOKONTANY: "#dc2626",
};

export const ZONE_COLORS = ["#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ea580c", "#0891b2", "#ca8a04", "#db2777"];

export interface ZoneShape {
  id: number | string;
  name: string;
  latitude: number | string;
  longitude: number | string;
  radiusKm?: number | string | null;
  /** GeoJSON Polygon / MultiPolygon (texte ou objet) */
  boundary?: unknown;
  level?: string | null;
  color?: string;
  /** Affiche le cercle du rayon d'intervention (défaut : oui) */
  circle?: boolean;
  /** Affiche le repère au centre (défaut : oui) */
  marker?: boolean;
}

type LatLng = { lat: number; lng: number };

type Piece = { paths: LatLng[][]; level?: string };

function toPaths(coordinates: any[]): LatLng[][] {
  return coordinates.map((ring: any[]) => ring.map(([lng, lat]: number[]) => ({ lat, lng })));
}

function geometryPieces(geo: any, level?: string): Piece[] {
  if (geo?.type === "Polygon") return [{ paths: toPaths(geo.coordinates), level }];
  if (geo?.type === "MultiPolygon") return geo.coordinates.map((poly: any[]) => ({ paths: toPaths(poly), level }));
  return [];
}

/** GeoJSON (Polygon, MultiPolygon ou FeatureCollection de la sélection) -> morceaux à dessiner */
function parseBoundary(raw: unknown): Piece[] {
  if (!raw) return [];

  try {
    const geo: any = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (geo?.type === "FeatureCollection") {
      return (geo.features ?? []).flatMap((f: any) => geometryPieces(f.geometry, f.properties?.level));
    }

    return geometryPieces(geo);
  } catch {
    return [];
  }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Carte d'une ou plusieurs zones : contour réel (si connu) + cercle du rayon d'intervention. */
export function ZoneMap({ zones, height = 380, className = "", legend = false }: { zones: ZoneShape[]; height?: number; className?: string; legend?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const infoRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const zonesRef = useRef(zones);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  zonesRef.current = zones;

  // Redessine seulement quand le contenu change (et non à chaque rendu du parent)
  const signature = useMemo(
    () =>
      JSON.stringify(
        zones.map((z) => [z.id, z.latitude, z.longitude, z.radiusKm ?? null, typeof z.boundary === "string" ? z.boundary.length : z.boundary ? 1 : 0, z.color ?? "", z.circle ?? true, z.marker ?? true])
      ),
    [zones]
  );

  useEffect(() => {
    if (!MAPS_ENABLED) return;

    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        mapRef.current = new window.google.maps.Map(containerRef.current, {
          center: { lat: -19.0, lng: 46.9 },
          zoom: 5,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
        });
        infoRef.current = new window.google.maps.InfoWindow();
        setReady(true);
      })
      .catch((err: Error) => setError(err.message));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const g = window.google.maps;
    const map = mapRef.current;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const bounds = new g.LatLngBounds();
    let any = false;

    zonesRef.current.forEach((z, index) => {
      const lat = Number(z.latitude);
      const lng = Number(z.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      any = true;
      const baseColor = z.color ?? LEVEL_COLORS[z.level ?? ""] ?? ZONE_COLORS[index % ZONE_COLORS.length];
      const center = { lat, lng };
      const pieces = parseBoundary(z.boundary);

      pieces.forEach((piece) => {
        const color = z.color ?? LEVEL_COLORS[piece.level ?? ""] ?? baseColor;
        overlaysRef.current.push(
          new g.Polygon({ map, paths: piece.paths, strokeColor: color, strokeWeight: 2, fillColor: color, fillOpacity: 0.2, clickable: false })
        );
        piece.paths.forEach((ring) => ring.forEach((p) => bounds.extend(p)));
      });

      const radiusM = Number(z.radiusKm) > 0 ? Number(z.radiusKm) * 1000 : 0;

      if (radiusM > 0 && z.circle !== false) {
        const circle = new g.Circle({
          map,
          center,
          radius: radiusM,
          strokeColor: baseColor,
          strokeOpacity: 0.8,
          strokeWeight: 1,
          fillColor: baseColor,
          fillOpacity: pieces.length ? 0.04 : 0.15,
          clickable: false,
        });
        overlaysRef.current.push(circle);
        const b = circle.getBounds();
        if (b) bounds.union(b);
      }

      if (z.marker !== false) {
        const marker = new g.Marker({ map, position: center, title: z.name });
        marker.addListener("click", () => {
          infoRef.current?.setContent(
            `<div style="font-family:system-ui"><strong>${escapeHtml(z.name)}</strong><div style="font-size:12px;color:#374151;margin-top:4px">${escapeHtml(
              zoneLevelLabel(z.level)
            )}${radiusM ? ` · rayon ${Number(z.radiusKm)} km` : ""}</div></div>`
          );
          infoRef.current?.open({ map, anchor: marker });
        });
        overlaysRef.current.push(marker);
      }

      bounds.extend(center);
    });

    if (any) {
      map.fitBounds(bounds, 50);
      g.event.addListenerOnce(map, "idle", () => {
        if (map.getZoom() > 14) map.setZoom(14);
      });
    }
  }, [ready, signature]);

  if (!MAPS_ENABLED) {
    return (
      <div className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 ${className}`}>
        Carte indisponible : la clé Google Maps (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) est absente.
      </div>
    );
  }

  return (
    <div className={className}>
      {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <div ref={containerRef} style={{ height }} className="w-full overflow-hidden rounded-2xl border border-gray-200" />
      {legend && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
          {ZONE_LEVELS.map((l) => (
            <span key={l.value} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: LEVEL_COLORS[l.value] }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
