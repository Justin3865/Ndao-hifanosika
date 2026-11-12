"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { ageLabel, checkCin, codeForPlace } from "@/lib/madagascar";
import { sanitizePhone, phoneInputProps } from "@/lib/phone";
import { emailProblem, emailTypoHint, phoneProblem } from "@/lib/validation";

/**
 * Identité d'une personne liée à un formulaire (ex. le stagiaire d'un stage) :
 * téléphone, naissance, CIN. Les valeurs existantes sont lues dans la base de données ;
 * ce qui est saisi ici est enregistré dans la fiche de la personne (jamais perdu au moment du certificat).
 */

export const IDENTITY_KEYS = [
  "email",
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
  email: "E-mail",
  phone: "Téléphone",
  birthDate: "Date de naissance",
  birthPlace: "Lieu de naissance",
  cinNumber: "N° CIN (12 chiffres)",
  cinIssuedAt: "Date de délivrance du CIN",
  cinIssuedPlace: "Lieu de délivrance du CIN",
};

/** Problème bloquant dans l'identité saisie (null = tout va bien). Sert aussi à bloquer l'envoi du formulaire. */
export function identityProblem(values: Values): string | null {
  const v = (k: IdentityKey) => String(values[identityName(k)] ?? "").trim();
  const today = new Date().toISOString().slice(0, 10);

  const email = emailProblem(v("email"));
  if (email) return email;

  const phone = phoneProblem(v("phone"));
  if (phone) return phone;

  if (v("birthDate") && v("birthDate") > today) return "La date de naissance ne peut pas être dans le futur.";

  const cin = v("cinNumber").replace(/\D/g, "");

  if (cin) {
    if (cin.length !== 12) return "Le numéro de CIN doit contenir exactement 12 chiffres.";

    const check = checkCin(cin, v("cinIssuedPlace"));
    if (!check.ok) return check.message ?? "Numéro de CIN invalide.";
  }

  if (v("cinIssuedAt")) {
    if (v("cinIssuedAt") > today) return "La date de délivrance du CIN ne peut pas être dans le futur.";
    if (v("birthDate") && v("cinIssuedAt") < v("birthDate")) return "Le CIN ne peut pas être délivré avant la naissance.";
  }

  if (values[identityName("cinDuplicata")] && v("cinDuplicataAt")) {
    if (v("cinDuplicataAt") > today) return "La date du duplicata ne peut pas être dans le futur.";
    if (v("cinIssuedAt") && v("cinDuplicataAt") < v("cinIssuedAt")) return "Le duplicata ne peut pas précéder la délivrance du CIN.";
  }

  return null;
}

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
  const [cinServer, setCinServer] = useState<{ taken: boolean; takenBy: string | null } | null>(null);

  const cinValue = String(values[identityName("cinNumber")] ?? "");
  const issuedPlace = String(values[identityName("cinIssuedPlace")] ?? "");
  const birthValue = String(values[identityName("birthDate")] ?? "");
  const cinLocal = checkCin(cinValue, issuedPlace);
  const emailValue = String(values[identityName("email")] ?? "");
  const emailError = emailProblem(emailValue);
  const emailHint = emailError ? null : emailTypoHint(emailValue);

  // Un CIN complet : on demande au serveur s'il appartient déjà à une AUTRE personne (base de données)
  useEffect(() => {
    setCinServer(null);
    if (cinValue.length !== 12) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      api
        .get("/profile/cin-check", { params: { cin: cinValue, userId: personId || undefined } })
        .then((res) => {
          if (!cancelled) setCinServer({ taken: Boolean(res.data?.data?.taken), takenBy: res.data?.data?.takenBy ?? null });
        })
        .catch(() => undefined);
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cinValue, personId]);

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
          [identityName("email")]: toInput(d.email),
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
          email: Boolean(next[identityName("email")]),
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

  const onPlaceChange = (value: string) => {
    setValue(identityName("cinIssuedPlace"), value);

    // CIN encore vide et lieu connu : on propose directement le code du district
    const code = codeForPlace(value);
    if (code && !cinValue) setValue(identityName("cinNumber"), code);
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
        onChange={(e) =>
          key === "cinIssuedPlace"
            ? onPlaceChange(e.target.value)
            : setValue(identityName(key), key === "cinNumber" ? e.target.value.replace(/\D/g, "").slice(0, 12) : key === "phone" ? sanitizePhone(e.target.value) : key === "email" ? e.target.value.replace(/\s/g, "").toLowerCase() : e.target.value)
        }
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
        {/* Nouveau stagiaire : son e-mail est déjà demandé plus haut (obligatoire) ; ici on ne le propose que pour une fiche existante */}
        {personId && (
          <div className="space-y-1 md:col-span-2">
            {text("email", "email", "prenom.nom@exemple.com", {
              inputMode: "email",
              autoComplete: "email",
              maxLength: 254,
              "aria-invalid": Boolean(emailError),
            })}
            {emailError && <p className="text-xs font-semibold text-red-600">{emailError}</p>}
            {emailHint && <p className="text-xs text-amber-700">{emailHint}</p>}
            {!emailError && !emailHint && (
              <p className="text-xs text-gray-500">C&apos;est aussi l&apos;identifiant de connexion du stagiaire. Réservé à l&apos;administrateur et au RH.</p>
            )}
          </div>
        )}
        {text("phone", "tel", "Ex. 034 00 000 00", { ...phoneInputProps })}
      </div>

      {/* Naissance : date, âge (calculé) et lieu côte à côte */}
      <div className="grid gap-4 md:grid-cols-3">
        {text("birthDate", "date", "", { max: today })}

        <label className="block space-y-1 text-sm font-medium text-gray-700">
          <span>Âge (calculé)</span>
          <input
            type="text"
            readOnly
            tabIndex={-1}
            className={`${inputClass} cursor-not-allowed bg-gray-100 text-gray-600`}
            value={ageLabel(birthValue) || (birthValue ? "Date invalide" : "")}
            placeholder="Déduit de la date de naissance"
          />
        </label>

        {text("birthPlace", "text", "Ex. Fianarantsoa")}
      </div>

      {/* CIN : numéro, date et lieu de délivrance côte à côte */}
      <div className="grid gap-4 md:grid-cols-3">
        {text("cinNumber", "text", "12 chiffres", {
          inputMode: "numeric",
          maxLength: 12,
          "aria-invalid": !cinLocal.ok || Boolean(cinServer?.taken),
        })}
        {text("cinIssuedAt", "date", "", { max: today, min: birthValue || undefined })}
        {text("cinIssuedPlace", "text", "Ex. Antananarivo")}
      </div>

      <div className="space-y-1 text-xs">
        {cinValue.length > 0 && cinLocal.province && (
          <p className="text-gray-600">
            Province : {cinLocal.province}
            {cinLocal.district ? ` · District : ${cinLocal.district}` : cinValue.length >= 3 ? " · code district non listé" : ""}
          </p>
        )}
        {!cinLocal.ok && <p className="font-semibold text-red-600">{cinLocal.message}</p>}
        {cinValue.length > 0 && cinValue.length < 12 && cinLocal.ok && (
          <p className="text-gray-500">{12 - cinValue.length} chiffre(s) restant(s).</p>
        )}
        {cinServer?.taken && (
          <p className="font-semibold text-red-600">
            Ce CIN est déjà enregistré{cinServer.takenBy ? ` pour ${cinServer.takenBy}` : ""} : saisie impossible.
          </p>
        )}
        {cinServer && !cinServer.taken && cinLocal.ok && <p className="text-green-700">CIN disponible.</p>}
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
