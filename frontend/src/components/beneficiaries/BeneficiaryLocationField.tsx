"use client";

import { useRef } from "react";
import { MapPin } from "lucide-react";
import api from "@/lib/axios";
import { GeoPicker } from "@/components/maps/GeoPicker";
import { BeneficiaryZoneInfo, ZoneHierarchyField } from "@/components/zones/ZoneHierarchyField";
import { LEVEL_COLORS } from "@/components/zones/ZoneMap";

type Values = Record<string, string | boolean>;

/** Champs enregistrés avec le bénéficiaire (en plus de homeLatitude / homeLongitude / homeAltitude) */
export const BENEFICIARY_ZONE_KEYS = [
  "adminProvince",
  "adminRegion",
  "adminDistrict",
  "adminCommune",
  "adminFokontany",
  "addressDetail",
  "zoneUnits",
] as const;

const input =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

/** Saisie manuelle possible : se remplit seule au choix sur la carte, et reste modifiable à la main */
const LEVEL_FIELDS = [
  { key: "adminProvince", label: "Province", color: LEVEL_COLORS.PROVINCE },
  { key: "adminRegion", label: "Région", color: LEVEL_COLORS.REGION },
  { key: "adminDistrict", label: "District", color: LEVEL_COLORS.DISTRICT },
  { key: "adminCommune", label: "Commune", color: LEVEL_COLORS.COMMUNE },
  { key: "adminFokontany", label: "Fokontany", color: LEVEL_COLORS.FOKONTANY },
] as const;

/** Adresse complète lisible : adresse exacte, fokontany, commune, district, région, province. */
export function fullAddressOf(b: {
  addressDetail?: unknown;
  adminFokontany?: unknown;
  adminCommune?: unknown;
  adminDistrict?: unknown;
  adminRegion?: unknown;
  adminProvince?: unknown;
}): string {
  const text = (v: unknown) => String(v ?? "").trim();
  const parts = [
    text(b.addressDetail),
    text(b.adminFokontany) && `Fokontany ${text(b.adminFokontany)}`,
    text(b.adminCommune) && `Commune ${text(b.adminCommune)}`,
    text(b.adminDistrict) && `District ${text(b.adminDistrict)}`,
    text(b.adminRegion) && `Région ${text(b.adminRegion)}`,
    text(b.adminProvince) && `Province ${text(b.adminProvince)}`,
  ].filter(Boolean);

  return parts.length ? [...parts, "Madagascar"].join(", ") : "";
}

/**
 * Localisation du ménage dans le formulaire bénéficiaire :
 * - province > région > district > commune > fokontany (même sélecteur que les zones d'intervention, sans rayon ni calcul)
 * - une seule carte : contours colorés par niveau + domicile exact (clic ou repère déplaçable)
 * - adresse exacte saisie à la main (lot, hameau / « zanabohitra »)
 * Les coordonnées du domicile restent dans homeLatitude / homeLongitude / homeAltitude (inchangé).
 */
export function BeneficiaryLocationField({
  label,
  values,
  setMany,
  geo,
}: {
  label: string;
  values: Values;
  setMany: (patch: Values) => void;
  geo: { lat: string; lng: string; alt: string };
}) {
  const elevationCall = useRef(0);

  const lat = Number(values[geo.lat]);
  const lng = Number(values[geo.lng]);
  const hasPoint = String(values[geo.lat] ?? "") !== "" && String(values[geo.lng] ?? "") !== "" && Number.isFinite(lat) && Number.isFinite(lng);

  const onSelection = (info: BeneficiaryZoneInfo) => {
    const patch: Values = {
      adminProvince: info.province,
      adminRegion: info.region,
      adminDistrict: info.district,
      adminCommune: info.commune,
      adminFokontany: info.fokontany,
      zoneUnits: info.units,
    };

    setMany(patch);
  };

  /** Clic sur la carte : domicile exact + altitude calculée par le backend (comme avant) */
  const placeHome = async (latitude: number, longitude: number) => {
    const call = ++elevationCall.current;
    setMany({ [geo.lat]: latitude.toFixed(6), [geo.lng]: longitude.toFixed(6) });

    try {
      const res = await api.get("/elevation", { params: { lat: latitude, lng: longitude } });
      const elevation = res.data?.data?.elevation;

      if (call === elevationCall.current && typeof elevation === "number" && Number.isFinite(elevation)) {
        setMany({ [geo.alt]: String(Math.round(elevation)) });
      }
    } catch {
      /* altitude modifiable à la main, ou via « Calculer l'altitude » */
    }
  };

  // Partie administrative seule (l'adresse exacte se saisit dans le champ juste en dessous)
  const address = fullAddressOf({
    adminFokontany: values.adminFokontany,
    adminCommune: values.adminCommune,
    adminDistrict: values.adminDistrict,
    adminRegion: values.adminRegion,
    adminProvince: values.adminProvince,
  });

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">{label}</p>

      <ZoneHierarchyField
        variant="beneficiary"
        values={values}
        setMany={setMany}
        onSelection={onSelection}
        pin={hasPoint ? { lat, lng } : null}
        onMapClick={(a, b) => void placeHome(a, b)}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {LEVEL_FIELDS.map((f) => (
          <label key={f.key} className="block text-xs font-medium text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: f.color }} />
              {f.label}
            </span>
            <input
              className={`${input} mt-1`}
              value={String(values[f.key] ?? "")}
              maxLength={120}
              onChange={(e) => setMany({ [f.key]: e.target.value })}
              placeholder={f.label}
            />
          </label>
        ))}
      </div>

      <label className="block text-sm font-medium text-gray-700">
        Adresse exacte du bénéficiaire : lot, zanabohitra, etc.
        <div className="mt-1 overflow-hidden rounded-xl border border-gray-300 bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100">
          {address && (
            <div className="flex items-start gap-2 border-b border-gray-200 px-3 py-2 text-xs font-normal text-gray-600">
              <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                <MapPin className="relative h-3.5 w-3.5 text-red-600" />
              </span>
              <span>{address}</span>
            </div>
          )}
          <input
            className="w-full bg-transparent px-3 py-2.5 text-sm font-normal outline-none"
            value={String(values.addressDetail ?? "")}
            maxLength={300}
            onChange={(e) => setMany({ addressDetail: e.target.value })}
            placeholder="Ex. Lot II M 45 Bis, Ankalamavony"
          />
        </div>
      </label>

      <GeoPicker
        showMap={false}
        value={{ latitude: String(values[geo.lat] ?? ""), longitude: String(values[geo.lng] ?? ""), altitude: String(values[geo.alt] ?? "") }}
        onChange={(next) => setMany({ [geo.lat]: next.latitude, [geo.lng]: next.longitude, [geo.alt]: next.altitude })}
      />
      <p className="text-xs text-gray-500">Cliquez sur la carte (ou déplacez le repère) pour placer le domicile exact ; la latitude, la longitude et l&apos;altitude se remplissent seules.</p>
    </div>
  );
}
