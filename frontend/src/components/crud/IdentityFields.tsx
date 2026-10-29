"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";

/**
 * Identité d'une personne liée à un formulaire (ex. le stagiaire d'un stage) :
 * téléphone, naissance, CIN. Les valeurs existantes sont lues dans la base de données ;
 * ce qui est saisi ici est enregistré dans la fiche de la personne (jamais perdu au moment du certificat).
 */

export const IDENTITY_KEYS = [
  "phone",
  "birthDate",
  "birthPlace",
  "cinNumber",
  "cinIssuedAt",
  "cinIssuedPlace",
  "cinDuplicata",
  "cinDuplicataAt",
] as const;

export type IdentityKey = (typeof IDENTITY_KEYS)[number];

type Values = Record<string, string | boolean>;

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export const identityName = (key: IdentityKey) => `identity.${key}`;

const LABELS: Record<Exclude<IdentityKey, "cinDuplicata" | "cinDuplicataAt">, string> = {
  phone: "Téléphone",
  birthDate: "Date de naissance",
  birthPlace: "Lieu de naissance",
  cinNumber: "N° CIN (12 chiffres)",
  cinIssuedAt: "Date de délivrance du CIN",
  cinIssuedPlace: "Lieu de délivrance du CIN",
};

const toInput = (value: unknown, date = false): string => {
  if (value === null || value === undefined) return "";
  return date ? String(value).slice(0, 10) : String(value);
};

export function IdentityFields({
  personId,
  values,
  setValue,
  setMany,
}: {
  personId: string;
  values: Values;
  setValue: (name: string, value: string | boolean) => void;
  setMany: (patch: Values) => void;
}) {
  const [inDb, setInDb] = useState<Partial<Record<IdentityKey, boolean>>>({});
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    const id = Number(personId);

    if (!personId || !Number.isInteger(id) || id <= 0) {
      setInDb({});
      setState("idle");
      return;
    }

    let cancelled = false;
    setState("loading");

    api
      .get(`/profile/identity/${id}`)
      .then((res) => {
        if (cancelled) return;

        const d = res.data?.data ?? {};
        const next: Values = {
          [identityName("phone")]: toInput(d.phone),
          [identityName("birthDate")]: toInput(d.birthDate, true),
          [identityName("birthPlace")]: toInput(d.birthPlace),
          [identityName("cinNumber")]: toInput(d.cinNumber),
          [identityName("cinIssuedAt")]: toInput(d.cinIssuedAt, true),
          [identityName("cinIssuedPlace")]: toInput(d.cinIssuedPlace),
          [identityName("cinDuplicata")]: Boolean(d.cinDuplicata),
          [identityName("cinDuplicataAt")]: toInput(d.cinDuplicataAt, true),
        };

        setMany(next);
        setInDb({
          phone: Boolean(next[identityName("phone")]),
          birthDate: Boolean(next[identityName("birthDate")]),
          birthPlace: Boolean(next[identityName("birthPlace")]),
          cinNumber: Boolean(next[identityName("cinNumber")]),
          cinIssuedAt: Boolean(next[identityName("cinIssuedAt")]),
          cinIssuedPlace: Boolean(next[identityName("cinIssuedPlace")]),
          cinDuplicataAt: Boolean(next[identityName("cinDuplicataAt")]),
        });
        setState("idle");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId]);

  const tag = (key: IdentityKey) => {
    if (!personId || state === "loading") return null;
    const present = Boolean(values[identityName(key)]);

    if (inDb[key] && present) {
      return <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">Dans la base de données</span>;
    }

    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Absent de la base — à compléter</span>;
  };

  const text = (key: keyof typeof LABELS, type = "text", placeholder = "", extra: Record<string, unknown> = {}) => (
    <label key={key} className="block space-y-1 text-sm font-medium text-gray-700">
      <span className="flex flex-wrap items-center gap-2">
        {LABELS[key]}
        {tag(key)}
      </span>
      <input
        type={type}
        className={inputClass}
        placeholder={placeholder}
        value={String(values[identityName(key)] ?? "")}
        onChange={(e) => setValue(identityName(key), key === "cinNumber" ? e.target.value.replace(/\D/g, "").slice(0, 12) : e.target.value)}
        {...extra}
      />
    </label>
  );

  const today = new Date().toISOString().slice(0, 10);
  const duplicata = Boolean(values[identityName("cinDuplicata")]);

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div>
        <p className="text-sm font-semibold text-gray-800">Informations personnelles du stagiaire</p>
        <p className="text-xs text-gray-500">
          {!personId
            ? "Choisissez le stagiaire : sa fiche sera lue dans la base de données. Vous pouvez déjà saisir les informations."
            : state === "loading"
            ? "Lecture de la fiche dans la base de données…"
            : state === "error"
              ? "Fiche non lisible : vous pouvez tout de même saisir les informations."
              : "Elles sont enregistrées dans la fiche du stagiaire et reprises automatiquement dans son certificat."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {text("phone", "tel", "Ex. 034 00 000 00")}
        {text("birthDate", "date", "", { max: today })}
        {text("birthPlace", "text", "Ex. Fianarantsoa")}
        {text("cinNumber", "text", "12 chiffres", { inputMode: "numeric", maxLength: 12 })}
        {text("cinIssuedAt", "date", "", { max: today })}
        {text("cinIssuedPlace", "text", "Ex. Antananarivo")}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={duplicata}
          onChange={(e) => setValue(identityName("cinDuplicata"), e.target.checked)}
        />
        Le CIN est un duplicata
      </label>

      {duplicata && (
        <label className="block max-w-xs space-y-1 text-sm font-medium text-gray-700">
          <span className="flex flex-wrap items-center gap-2">
            Date du duplicata
            {tag("cinDuplicataAt")}
          </span>
          <input
            type="date"
            className={inputClass}
            max={today}
            value={String(values[identityName("cinDuplicataAt")] ?? "")}
            onChange={(e) => setValue(identityName("cinDuplicataAt"), e.target.value)}
          />
        </label>
      )}
    </div>
  );
}
