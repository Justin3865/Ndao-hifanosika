"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { GoogleMap, MapMarker } from "@/components/maps/GoogleMap";

interface Org {
  name: string; address: string; latitude: number | null; longitude: number | null;
  zones: { id: number; name: string; region: string | null; latitude: number; longitude: number; altitude: number | null; beneficiaries: number }[];
}
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/** Adresse de l'ONG + zones d'intervention (données réelles, publiques, sans données personnelles). */
export default function LocationSection() {
  const [org, setOrg] = useState<Org | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`${API}/public/organization`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setOrg(j.data))
      .catch(() => setFailed(true));
  }, []);

  const markers = useMemo<MapMarker[]>(() => {
    if (!org) return [];
    const list: MapMarker[] = org.zones.map((z) => ({
      id: `zone-${z.id}`, latitude: z.latitude, longitude: z.longitude, title: z.name, color: "#0d9488",
      info: `Zone d'intervention${z.altitude != null ? ` — altitude ${z.altitude} m` : ""} — ${z.beneficiaries} bénéficiaire(s)`,
    }));
    if (org.latitude != null && org.longitude != null) {
      list.unshift({ id: "org", latitude: org.latitude, longitude: org.longitude, title: org.name, color: "#1d4ed8", info: org.address || "Siège de l'ONG" });
    }
    return list;
  }, [org]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold text-gray-900">Où nous trouver</h2>
        <p className="mt-3 text-gray-600">Notre siège et nos zones d'intervention.</p>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-blue-600" />
              <div>
                <p className="font-semibold text-gray-900">{org?.name ?? "Ndao Hifanosika"}</p>
                <p className="mt-1 text-sm text-gray-600">{org?.address || (failed ? "Adresse indisponible." : "Chargement…")}</p>
              </div>
            </div>
          </div>
          {org && org.zones.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-gray-900">Zones d'intervention</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {org.zones.map((z) => (
                  <li key={z.id} className="flex justify-between gap-2">
                    <span>{z.name}{z.region ? ` · ${z.region}` : ""}</span>
                    <span className="text-gray-500">{z.altitude != null ? `${z.altitude} m` : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
          <GoogleMap markers={markers} height={420} />
        </div>
      </div>
    </section>
  );
}
