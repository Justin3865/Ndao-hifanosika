"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchGeo } from "@/components/zones/ZoneHierarchyField";
import { LEVEL_COLORS, ZONE_LEVELS, ZoneMap, ZoneShape } from "@/components/zones/ZoneMap";
import { fullAddressOf } from "@/components/beneficiaries/BeneficiaryLocationField";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Unit {
  id: string;
  name: string;
  level: string;
  bbox: number[];
  center: { lat: number; lng: number } | null;
}

interface Shape {
  geometry: any | null;
  bbox: number[];
  center: { lat: number; lng: number };
  partial?: boolean;
}

const bboxPolygon = (bbox: number[]) => {
  if (bbox.length !== 4 || !bbox.every(Number.isFinite)) return null;
  const [s, n, w, e] = bbox;
  return { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] };
};

function parseUnits(raw: unknown): Unit[] {
  try {
    const geo: any = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (geo?.type !== "FeatureCollection") return [];

    return (geo.features ?? []).flatMap((f: any) => {
      const p = f?.properties ?? {};
      if (!p.id || !ZONE_LEVELS.some((l) => l.value === p.level)) return [];

      const lat = Number(p.center?.lat);
      const lng = Number(p.center?.lng);

      return [
        {
          id: String(p.id),
          name: String(p.name ?? ""),
          level: String(p.level),
          bbox: Array.isArray(p.bbox) ? p.bbox.map(Number) : [],
          center: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
        },
      ];
    });
  } catch {
    return [];
  }
}

/**
 * Fiche bénéficiaire : hiérarchie administrative, adresse exacte et carte
 * (contours colorés par niveau + domicile exact). Aucun rayon d'intervention.
 */
export function BeneficiaryLocationMap({ beneficiary: b }: { beneficiary: any }) {
  const units = useMemo(() => parseUnits(b?.zoneUnits), [b?.zoneUnits]);
  const [shapes, setShapes] = useState<Record<string, Shape>>({});
  const alive = useRef(true);

  const homeLat = b?.homeLatitude === null || b?.homeLatitude === undefined ? NaN : Number(b.homeLatitude);
  const homeLng = b?.homeLongitude === null || b?.homeLongitude === undefined ? NaN : Number(b.homeLongitude);
  const hasHome = Number.isFinite(homeLat) && Number.isFinite(homeLng);

  const unitKey = units.map((u) => u.id).join("|");

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Contour détaillé de chaque niveau (l'emprise enregistrée s'affiche en attendant)
  useEffect(() => {
    units.forEach((u) => {
      void (async () => {
        for (let attempt = 0; attempt < 8 && alive.current; attempt++) {
          try {
            const shape = await fetchGeo<Shape>("/zones/admin/shape", { id: u.id, fast: "1" }, () => alive.current);
            if (!alive.current) return;
            if (shape) setShapes((cur) => ({ ...cur, [u.id]: shape }));
            if (shape && !shape.partial) return;
          } catch {
            return; // contour indisponible : l'emprise enregistrée reste affichée
          }

          await new Promise((resolve) => window.setTimeout(resolve, 3000));
        }
      })();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitKey]);

  const levels = ZONE_LEVELS.map((l) => {
    const key = ({ PROVINCE: "adminProvince", REGION: "adminRegion", DISTRICT: "adminDistrict", COMMUNE: "adminCommune", FOKONTANY: "adminFokontany" } as Record<string, string>)[l.value];
    return { ...l, name: String(b?.[key] ?? "").trim() };
  }).filter((l) => l.name);

  const address = fullAddressOf(b ?? {});

  const zones: ZoneShape[] = units
    .map((u): ZoneShape | null => {
      const s = shapes[u.id];
      const center = s?.center ?? u.center;
      if (!center) return null;

      const geometry = s?.geometry ?? bboxPolygon(s?.bbox?.length ? s.bbox : u.bbox);

      return {
        id: `${u.id}${s?.geometry ? ":g" : ":b"}`,
        name: u.name,
        latitude: center.lat,
        longitude: center.lng,
        radiusKm: null,
        boundary: geometry,
        level: u.level,
        color: LEVEL_COLORS[u.level],
        circle: false,
        marker: false,
      };
    })
    .filter((z): z is ZoneShape => z !== null);

  if (!levels.length && !b?.addressDetail && !hasHome) return null;

  return (
    <div className="mt-6 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-800">Localisation du ménage</p>

      {levels.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
          {levels.map((l) => (
            <span key={l.value} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: LEVEL_COLORS[l.value] }} />
              {l.label} : <strong className="font-semibold">{l.name}</strong>
            </span>
          ))}
        </div>
      )}

      {address && <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">{address}</p>}

      {(zones.length > 0 || hasHome) && <ZoneMap zones={zones} height={340} legend={zones.length > 0} pin={hasHome ? { lat: homeLat, lng: homeLng } : null} />}
    </div>
  );
}
