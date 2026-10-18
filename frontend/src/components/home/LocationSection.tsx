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

  useEffect(() => {
    fetch(`${API}/public/organization`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setZones(j?.data?.zones ?? []))
      .catch(() => setZones([]));
  }, []);

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
            href={`https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            <MapPin className="h-4 w-4" />
            Ouvrir dans Google Maps
          </a>
        </div>

        <div className="border-t border-gray-100">
          <iframe
            title="Localisation du siège de l'ONG Ndao Hifanosika à Fianarantsoa"
            src={`https://maps.google.com/maps?q=${MAPS_QUERY}&output=embed`}
            className="block h-[260px] w-full sm:h-[360px]"
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
