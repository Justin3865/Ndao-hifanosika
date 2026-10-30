"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { Building2, Check, ImagePlus, Plus, X } from "lucide-react";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";

export interface PartnerItem {
  id: number;
  name: string;
  type?: string;
  slogan?: string | null;
  logoUrl?: string | null;
}

const TYPE_OPTIONS = [
  { value: "FUNDING_PARTNER", label: "Bailleur / financeur" },
  { value: "IMPLEMENTING_PARTNER", label: "Partenaire de mise en œuvre" },
  { value: "TECHNICAL_PARTNER", label: "Partenaire technique" },
  { value: "INSTITUTIONAL_PARTNER", label: "Partenaire institutionnel" },
  { value: "OTHER", label: "Autre" },
];

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

/** Liste d'identifiants stockée sous forme « 1,4,7 » dans le formulaire. */
export const parseIds = (value: string): number[] =>
  value
    .split(",")
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v > 0);

/** Réduit le logo (max 320 px) pour rester léger sur le certificat et en base. */
function readLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) {
      reject(new Error("Format non pris en charge (PNG, JPG, WEBP ou SVG)."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.onload = () => {
      const dataUrl = String(reader.result);

      if (file.type === "image/svg+xml") {
        if (dataUrl.length > 390_000) reject(new Error("Logo trop lourd (400 Ko maximum)."));
        else resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error("Image illisible."));
      img.onload = () => {
        const scale = Math.min(1, 320 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function PartnersField({
  label,
  value,
  onChange,
  options,
  allowCreate = true,
  emptyHint,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  /** Liste imposée (ex. partenaires du projet) : aucun chargement, sélection multiple uniquement */
  options?: PartnerItem[];
  /** « Nouveau partenaire » : réservé au formulaire du projet */
  allowCreate?: boolean;
  emptyHint?: string;
}) {
  const [partners, setPartners] = useState<PartnerItem[] | null | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("FUNDING_PARTNER");
  const [slogan, setSlogan] = useState("");
  const [logo, setLogo] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = parseIds(value);
  const list = options ?? partners;

  useEffect(() => {
    if (options) return;

    api
      .get("/partners")
      .then((res) => setPartners(res.data?.partners ?? []))
      .catch(() => setPartners(null));
  }, []);

  const toggle = (id: number) =>
    onChange(
      (selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]).join(",")
    );

  const resetForm = () => {
    setName("");
    setType("FUNDING_PARTNER");
    setSlogan("");
    setLogo("");
    setError("");
  };

  const handleLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setError("");
      setLogo(await readLogo(file));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Le nom du partenaire est obligatoire.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await api.post("/partners", {
        name: name.trim(),
        type,
        slogan: slogan.trim() || undefined,
        logoUrl: logo || undefined,
      });

      const created: PartnerItem = res.data.partner;
      setPartners((cur) => [...(cur ?? []), created].sort((a, b) => a.name.localeCompare(b.name)));
      if (!selected.includes(created.id)) onChange([...selected, created.id].join(","));
      resetForm();
      setAdding(false);
    } catch (err) {
      const existing = (err as { response?: { status?: number; data?: { partner?: PartnerItem } } })?.response;

      // Partenaire déjà enregistré : on le sélectionne simplement
      if (existing?.status === 409 && existing.data?.partner) {
        const found = existing.data.partner;
        setPartners((cur) => (cur?.some((p) => p.id === found.id) ? cur : [...(cur ?? []), found]));
        if (!selected.includes(found.id)) onChange([...selected, found.id].join(","));
        resetForm();
        setAdding(false);
      } else {
        setError(errorMessage(err, "Création du partenaire impossible."));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {allowCreate && (
        <button
          type="button"
          onClick={() => {
            setAdding((v) => !v);
            setError("");
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
        >
          {adding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {adding ? "Fermer" : "Nouveau partenaire"}
        </button>
        )}
      </div>

      {list === undefined && <p className="text-sm text-gray-500">Chargement des partenaires...</p>}
      {list === null && (
        <p className="text-sm text-amber-700">Liste des partenaires indisponible pour votre rôle.</p>
      )}
      {list && list.length === 0 && !adding && (
        <p className="text-sm text-gray-500">{emptyHint ?? "Aucun partenaire enregistré. Utilisez « Nouveau partenaire »."}</p>
      )}

      {list && list.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {list.map((partner) => {
            const on = selected.includes(partner.id);

            return (
              <button
                key={partner.id}
                type="button"
                onClick={() => toggle(partner.id)}
                className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition ${
                  on ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
                  {partner.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={partner.logoUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <Building2 className="h-5 w-5 text-gray-400" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-900">{partner.name}</span>
                  {partner.slogan && <span className="block truncate text-xs italic text-gray-500">« {partner.slogan} »</span>}
                </span>
                {on && <Check className="h-4 w-4 shrink-0 text-blue-700" />}
              </button>
            );
          })}
        </div>
      )}

      {allowCreate && adding && (
        <div
          className="space-y-3 rounded-xl border border-dashed border-blue-300 bg-blue-50/40 p-4"
          onKeyDown={(e) => {
            // Entrée ne doit pas envoyer tout le formulaire du projet
            if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
              e.preventDefault();
              void handleCreate();
            }
          }}
        >
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1 text-xs font-medium text-gray-700">
              Nom du partenaire *
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Orange Madagascar" />
            </label>

            <label className="block space-y-1 text-xs font-medium text-gray-700">
              Type
              <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1 text-xs font-medium text-gray-700">
            Slogan du partenaire
            <input className={inputClass} value={slogan} maxLength={200} onChange={(e) => setSlogan(e.target.value)} placeholder="Ex. Ensemble pour la jeunesse" />
          </label>

          <div className="flex items-center gap-3">
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <ImagePlus className="h-6 w-6 text-gray-400" />
              )}
            </span>

            <label className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              {logo ? "Changer le logo" : "Choisir le logo"}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogo} />
            </label>

            {logo && (
              <button type="button" onClick={() => setLogo("")} className="text-xs text-red-600 hover:underline">
                Retirer
              </button>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Enregistrement..." : "Ajouter ce partenaire"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
