"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

const ORG_NAME = "ONG Ndao Hifanosika";
const ORG_ADDRESS = "Lot 28TB/3609, Talatamaty Ambany, Fianarantsoa 301, Madagascar";
const MAPS_QUERY = encodeURIComponent(`${ORG_NAME}, ${ORG_ADDRESS}`);
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface Zone { id: number; name: string; region: string | null; latitude: number; longitude: number; altitude: number | null }

/**
 * Même présentation que la carte du tableau de bord (adresse + carte intégrée du siège),
 * sans clé API ni configuration. Les zones d'intervention (données réelles) s'affichent en dessous.
 */
export default function LocationSection() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [hq, setHq] = useState<{ lat: number; lng: number } | null>(null);
  const [mode, setMode] = useState<"satellite" | "plan">("satellite");

  useEffect(() => {
    fetch(`${API}/public/organization`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        setZones(j?.data?.zones ?? []);

        const lat = Number(j?.data?.headquarters?.latitude);
        const lng = Number(j?.data?.headquarters?.longitude);
        setHq(Number.isFinite(lat) && Number.isFinite(lng) && j?.data?.headquarters ? { lat, lng } : null);
      })
      .catch(() => setZones([]));
  }, []);

  // Siège enregistré : la carte est centrée sur ses coordonnées avec un repère (pin) portant son nom ; sinon recherche par adresse
  const mapQuery = hq ? encodeURIComponent(`${hq.lat},${hq.lng}(${ORG_NAME})`) : MAPS_QUERY;
  // Siège connu : carte centrée sur ses coordonnées SANS repère Google (rouge), le repère bleu est dessiné au centre
  const base = hq ? `https://maps.google.com/maps?ll=${hq.lat},${hq.lng}&hl=fr&output=embed` : `https://maps.google.com/maps?q=${mapQuery}&hl=fr&output=embed`;
  const mapSrc = mode === "plan" ? `${base}&z=19` : `${base}&t=h&z=19`; // satellite + noms : le bâtiment de l'ONG est visible
  const mapsLink = hq ? `https://www.google.com/maps/search/?api=1&query=${hq.lat}%2C${hq.lng}` : `https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold text-gray-900">Où nous trouver</h2>
        <p className="mt-3 text-gray-600">Notre siège et nos zones d&apos;intervention.</p>
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900">{ORG_NAME}</h3>
              <p className="mt-0.5 text-sm text-gray-600">{ORG_ADDRESS}</p>
              <p className="text-xs text-gray-500">Siège de l&apos;ONG</p>
            </div>
          </div>
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            <MapPin className="h-4 w-4" />
            Ouvrir dans Google Maps
          </a>
        </div>

        <div className="flex gap-2 border-t border-gray-100 px-3 py-2 sm:px-4">
          {([["satellite", "Satellite"], ["plan", "Plan"]] as [typeof mode, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                mode === id ? "border-blue-600 bg-blue-600 text-white" : "border-blue-200 text-blue-700 hover:bg-blue-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative border-t border-gray-100">
          {hq && (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 32"
              className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-10 w-8 -translate-x-1/2 -translate-y-full drop-shadow-lg"
            >
              <path d="M12 1C6 1 1.5 5.6 1.5 11.4 1.5 19 12 31 12 31s10.5-12 10.5-19.6C22.5 5.6 18 1 12 1z" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="12" cy="11.5" r="4" fill="#ffffff" />
            </svg>
          )}
          <iframe
            title="Localisation du siège de l'ONG Ndao Hifanosika à Fianarantsoa"
            key={mapSrc}
            src={mapSrc}
            className="block h-[380px] w-full sm:h-[540px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>

      {zones.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold text-gray-900">Zones d&apos;intervention</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {zones.map((z) => (
              <a
                key={z.id}
                href={`https://www.google.com/maps/search/?api=1&query=${z.latitude}%2C${z.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
                <span className="text-sm">
                  <span className="block font-semibold text-gray-900">{z.name}</span>
                  <span className="text-gray-500">
                    {[z.region, z.altitude != null ? `${z.altitude} m` : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
