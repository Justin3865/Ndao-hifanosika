"use client";

import { useEffect, useMemo, useState } from "react";
import { ZONE_COLORS, ZoneMap, ZoneShape, zoneLevelLabel } from "@/components/zones/ZoneMap";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Carte de la liste des zones : on peut afficher toutes les zones, une seule (clic sur son nom)
 * ou plusieurs en cochant les cases.
 */
export function ZonesOverview({ zones }: { zones: any[] }) {
  const valid = useMemo(
    () => zones.filter((z) => Number.isFinite(Number(z.latitude)) && Number.isFinite(Number(z.longitude))),
    [zones]
  );
  const [selected, setSelected] = useState<Set<number> | null>(null); // null = toutes

  // Garde seulement les zones encore présentes (après une recherche par exemple)
  useEffect(() => {
    setSelected((cur) => (cur ? new Set([...cur].filter((id) => valid.some((z) => z.id === id))) : cur));
  }, [valid]);

  const isOn = (id: number) => (selected ? selected.has(id) : true);

  const toggle = (id: number) =>
    setSelected((cur) => {
      const next = new Set(cur ?? valid.map((z) => z.id));
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const shapes: ZoneShape[] = valid
    .map((z, index) => ({
      id: z.id,
      name: z.name,
      latitude: z.latitude,
      longitude: z.longitude,
      radiusKm: z.radiusKm,
      boundary: z.boundary,
      level: z.level,
      color: ZONE_COLORS[index % ZONE_COLORS.length],
    }))
    .filter((z) => isOn(Number(z.id)));

  if (valid.length === 0) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">
          Carte des zones <span className="font-normal text-gray-500">({shapes.length}/{valid.length} affichée(s))</span>
        </p>

        <div className="flex gap-2">
          <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Tout afficher
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Aucune
          </button>
        </div>
      </div>

      <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
        {valid.map((z, index) => (
          <label
            key={z.id}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs ${
              isOn(z.id) ? "border-gray-300 bg-gray-50 text-gray-900" : "border-gray-200 text-gray-500"
            }`}
          >
            <input type="checkbox" checked={isOn(z.id)} onChange={() => toggle(z.id)} className="h-3.5 w-3.5" />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: ZONE_COLORS[index % ZONE_COLORS.length] }} />
            <button
              type="button"
              title="Voir cette zone seule"
              onClick={() => setSelected(new Set([z.id]))}
              className="font-medium hover:underline"
            >
              {z.name}
            </button>
            <span className="text-gray-500">{zoneLevelLabel(z.level)}</span>
          </label>
        ))}
      </div>

      <ZoneMap zones={shapes} height={380} />
    </div>
  );
}
