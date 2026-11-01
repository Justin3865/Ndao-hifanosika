"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout";
import {
  FieldDef,
  LookupItem,
  LookupKind,
  ResourceConfig,
  canSeeBudget,
  errorMessage,
  fetchLookup,
  getItem,
  isBudgetField,
  saveItem,
} from "@/lib/crud";
import { confirmDialog, toast } from "@/lib/toast";
import { GeoPicker } from "@/components/maps/GeoPicker";
import { getStoredRole } from "@/lib/access";
import { IDENTITY_KEYS, IdentityFields, identityName, identityProblem } from "@/components/crud/IdentityFields";
import api from "@/lib/axios";
import { ageLabel, nextDay, statusFromDates } from "@/lib/madagascar";
import { NEW_PERSON_KEYS, NewPersonFields, newPersonFilled, newPersonName } from "@/components/crud/NewPersonFields";
import { PartnersField, parseIds } from "@/components/crud/PartnersField";
import { ZoneHierarchyField } from "@/components/zones/ZoneHierarchyField";

type Values = Record<string, string | boolean>;

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const geoKeys = (field: FieldDef) => ({
  lat: field.geoNames?.lat ?? `${field.name}Latitude`,
  lng: field.geoNames?.lng ?? `${field.name}Longitude`,
  alt: field.geoNames?.alt ?? `${field.name}Altitude`,
});

function initialEntries(field: FieldDef): Array<[string, string | boolean]> {
  if (field.type === "newperson") {
    return NEW_PERSON_KEYS.map((key): [string, string | boolean] => [newPersonName(key), key === "role" ? "STAGIAIRE_L3" : ""]);
  }

  if (field.type === "identity") {
    return IDENTITY_KEYS.map((key): [string, string | boolean] => [identityName(key), key === "cinDuplicata" ? false : ""]);
  }

  if (field.type === "geo") {
    const k = geoKeys(field);
    return [[k.lat, ""], [k.lng, ""], [k.alt, ""]];
  }

  return [[field.name, field.defaultValue ?? (field.type === "checkbox" ? false : "")]];
}

function loadedEntries(field: FieldDef, item: Record<string, unknown>): Array<[string, string | boolean]> {
  if (field.type === "identity" || field.type === "newperson") return initialEntries(field);

  // Partenaires du projet : identifiants « 1,4,7 » repris des liens existants
  if (field.type === "partners") {
    const links = Array.isArray(item?.partnerLinks) ? (item.partnerLinks as Array<{ partnerId?: number; partner?: { id?: number } }>) : [];
    return [[field.name, links.map((l) => String(l.partnerId ?? l.partner?.id ?? "")).filter(Boolean).join(",")]];
  }

  if (field.type === "geo") {
    const k = geoKeys(field);
    return [k.lat, k.lng, k.alt].map((key) => [key, item?.[key] === null || item?.[key] === undefined ? "" : String(item[key])]);
  }

  return [[field.name, toFormValue(field, item?.[field.name])]];
}

function toFormValue(field: FieldDef, raw: unknown): string | boolean {
  if (field.type === "checkbox") return Boolean(raw);
  if (raw === null || raw === undefined) return "";
  if (field.type === "date") return String(raw).slice(0, 10);
  return String(raw);
}

function toPayloadValue(field: FieldDef, value: string | boolean) {
  if (field.type === "checkbox") return Boolean(value);

  const text = String(value).trim();
  if (text === "") return undefined;

  if (field.type === "number") return Number(text);
  if (field.type === "select" && field.lookup) return Number(text);

  return text;
}

export function ResourceFormPage({
  config,
  mode,
  id,
}: {
  config: ResourceConfig;
  mode: "create" | "edit";
  id?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const showBudget = canSeeBudget(getStoredRole());

  // Le champ « budget » n'existe pas dans le formulaire des rôles non autorisés
  const fields = config.fields.filter(
    (field) =>
      (isEdit ? !field.hideOnEdit : !field.hideOnCreate) &&
      (showBudget || !isBudgetField(field.name))
  );

  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(fields.flatMap(initialEntries))
  );
  const [lookups, setLookups] = useState<Record<string, LookupItem[] | null>>({});
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [statusTouched, setStatusTouched] = useState(false);

  // Création depuis la fiche d'un projet : /…/create?projectId=ID présélectionne le projet
  useEffect(() => {
    if (isEdit || typeof window === "undefined") return;

    const projectId = new URLSearchParams(window.location.search).get("projectId");

    if (projectId && fields.some((field) => field.name === "projectId")) {
      setValues((cur) => ({ ...cur, projectId: cur.projectId || projectId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chargement des listes déroulantes (projets, départements, ...)
  useEffect(() => {
    const kinds = Array.from(
      new Set(fields.map((field) => field.lookup).filter(Boolean))
    ) as LookupKind[];

    kinds.forEach((kind) => {
      fetchLookup(kind)
        .then((data) => setLookups((cur) => ({ ...cur, [kind]: data })))
        .catch(() => setLookups((cur) => ({ ...cur, [kind]: null })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Chargement de l'élément à modifier
  useEffect(() => {
    if (!isEdit || !id) return;

    getItem(config, id)
      .then((item) => {
        setValues(
          Object.fromEntries(fields.flatMap((field) => loadedEntries(field, item)))
        );
      })
      .catch((err) => setError(errorMessage(err, "Élément introuvable.")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, id, isEdit]);

  const setValue = (name: string, value: string | boolean) =>
    setValues((cur) => {
      const next: Values = { ...cur, [name]: value };

      for (const field of fields) {
        // Date de fin : jamais avant (ni le même jour que) la date de début
        if (field.after && name === field.after) {
          const start = String(value);
          const end = String(next[field.name] ?? "");
          if (start && end && end <= start) next[field.name] = "";
        }

        // Statut : suit les dates tant que l'utilisateur ne l'a pas choisi lui-même (et sauf « Annulé »)
        const auto = field.statusFromDates;
        if (auto && (name === auto.start || name === auto.end) && !statusTouched && next[field.name] !== "CANCELLED") {
          const derived = statusFromDates(String(next[auto.start] ?? ""), String(next[auto.end] ?? ""));
          if (derived) next[field.name] = derived;
        }
      }

      return next;
    });

  const onFieldChange = (field: FieldDef, value: string | boolean) => {
    if (field.statusFromDates) setStatusTouched(true);
    setValue(field.name, value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    for (const field of fields) {
      if (field.required && field.type !== "checkbox") {
        const alternative = field.requiredUnless ? newPersonFilled(values) : false;

        if (String(values[field.name] ?? "").trim() === "" && !alternative) {
          setError(
            field.requiredUnless
              ? `Choisissez « ${field.label} » ou renseignez le nom et l'e-mail du nouveau stagiaire (le prénom est facultatif).`
              : `Le champ « ${field.label} » est obligatoire.`,
          );
          return;
        }
      }
    }

    for (const field of fields) {
      if (field.after) {
        const start = String(values[field.after] ?? "");
        const end = String(values[field.name] ?? "");

        if (start && end && end <= start) {
          setError(`« ${field.label} » doit être postérieure à « ${fields.find((f) => f.name === field.after)?.label ?? "la date de début"} ».`);
          return;
        }
      }

      if (field.type === "identity") {
        const problem = identityProblem(values);

        if (problem) {
          setError(problem);
          return;
        }

        // CIN déjà enregistré pour une autre personne : on bloque avant l'envoi
        const cin = String(values[identityName("cinNumber")] ?? "");

        if (cin.length === 12) {
          try {
            const res = await api.get("/profile/cin-check", {
              params: { cin, userId: String(values[field.identityOf ?? ""] ?? "") || undefined },
            });

            if (res.data?.data?.taken) {
              setError(`Ce numéro de CIN est déjà enregistré${res.data.data.takenBy ? ` pour ${res.data.data.takenBy}` : ""}.`);
              return;
            }
          } catch {
            /* le serveur refusera de toute façon un doublon à l'enregistrement */
          }
        }
      }
    }

    const payload: Record<string, unknown> = {};

    for (const field of fields) {
      if (field.ageFrom) continue; // l'âge est calculé, jamais envoyé

      // Partenaires : toujours envoyés (liste vide = aucun partenaire)
      if (field.type === "partners") {
        payload[field.name] = parseIds(String(values[field.name] ?? ""));
        continue;
      }

      if (field.type === "newperson") {
        if (String(values[field.identityOf ?? ""] ?? "") === "" && newPersonFilled(values)) {
          payload.newStudent = Object.fromEntries(
            NEW_PERSON_KEYS.map((key) => [key, String(values[newPersonName(key)] ?? "").trim()]),
          );
        }

        continue;
      }

      if (field.type === "identity") {
        const identity: Record<string, unknown> = {};

        for (const key of IDENTITY_KEYS) {
          const raw = values[identityName(key)];

          if (key === "cinDuplicata") identity[key] = Boolean(raw);
          else if (String(raw ?? "").trim() !== "") identity[key] = String(raw).trim();
        }

        const cin = String(identity.cinNumber ?? "").replace(/[\s.\-]/g, "");

        if (cin && !/^\d{12}$/.test(cin)) {
          setError("Le numéro de CIN doit contenir exactement 12 chiffres.");
          return;
        }

        if (String(values[field.identityOf ?? ""] ?? "") !== "" || newPersonFilled(values)) payload.identity = identity;

        continue;
      }

      if (field.type === "geo") {
        const k = geoKeys(field);

        [k.lat, k.lng, k.alt].forEach((key) => {
          const text = String(values[key] ?? "").trim();
          if (text !== "" && Number.isFinite(Number(text))) payload[key] = Number(text);
        });

        continue;
      }

      const value = toPayloadValue(field, values[field.name]);
      if (value !== undefined) payload[field.name] = value;
      else if (field.name === "firstName") payload.firstName = ""; // prénom facultatif : permet aussi de l'effacer
    }

    setSubmitting(true);

    try {
      await saveItem(config, isEdit ? (id as string) : null, payload);
      toast.success(isEdit ? "Modification enregistrée." : "Élément créé avec succès.");
      router.push(config.basePath);
    } catch (err) {
      setError(errorMessage(err, "Enregistrement impossible."));
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FieldDef) => {
    const value = values[field.name];

    if (field.type === "zonehierarchy") {
      return <ZoneHierarchyField values={values} setMany={(patch) => setValues((cur) => ({ ...cur, ...patch }))} />;
    }

    if (field.type === "partners") {
      return <PartnersField label={field.label} value={String(value ?? "")} onChange={(next) => setValue(field.name, next)} />;
    }

    if (field.type === "newperson") {
      return (
        <NewPersonFields
          disabled={String(values[field.identityOf ?? ""] ?? "") !== ""}
          values={values}
          setValue={setValue}
        />
      );
    }

    if (field.type === "identity") {
      return (
        <IdentityFields
          personId={String(values[field.identityOf ?? ""] ?? "")}
          values={values}
          setValue={setValue}
          setMany={(patch) => setValues((cur) => ({ ...cur, ...patch }))}
        />
      );
    }

    if (field.type === "geo") {
      const k = geoKeys(field);

      return (
        <div className="space-y-1 text-sm font-medium text-gray-700">
          {field.label}
          <GeoPicker
            value={{
              latitude: String(values[k.lat] ?? ""),
              longitude: String(values[k.lng] ?? ""),
              altitude: String(values[k.alt] ?? ""),
            }}
            withAltitude={Boolean(field.geoNames?.alt) || !field.geoNames}
            onChange={(next) =>
              setValues((cur) => ({ ...cur, [k.lat]: next.latitude, [k.lng]: next.longitude, [k.alt]: next.altitude }))
            }
          />
        </div>
      );
    }

    if (field.type === "checkbox") {
      return (
        <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => setValue(field.name, e.target.checked)}
            className="h-4 w-4"
          />
          {field.label}
        </label>
      );
    }

    if (field.readOnly) {
      const shown = String(value ?? "").trim();

      return (
        <label className="block space-y-1 text-sm font-medium text-gray-700">
          {field.label}
          <input
            readOnly
            tabIndex={-1}
            className={`${inputClass} cursor-not-allowed bg-gray-100 text-gray-600`}
            value={shown !== "" ? `${shown} %` : ""}
            placeholder={field.readOnlyPlaceholder ?? "Calculé automatiquement"}
          />
          {field.hint && (
            <span className="block text-xs font-normal text-gray-500">{field.hint}</span>
          )}
        </label>
      );
    }

    if (field.ageFrom) {
      const label = ageLabel(String(values[field.ageFrom] ?? ""));

      return (
        <label className="block space-y-1 text-sm font-medium text-gray-700">
          {field.label}
          <input
            readOnly
            tabIndex={-1}
            className={`${inputClass} cursor-not-allowed bg-gray-100 text-gray-600`}
            value={label}
            placeholder="Calculé à partir de la date de naissance"
          />
        </label>
      );
    }

    let control;

    if (field.type === "textarea") {
      control = (
        <textarea
          rows={4}
          className={inputClass}
          value={String(value)}
          onChange={(e) => setValue(field.name, e.target.value)}
        />
      );
    } else if (field.type === "select" && field.lookup) {
      const list = lookups[field.lookup];

      control =
        list === null ? (
          // Liste indisponible pour ce rôle : saisie directe de l'identifiant
          <input
            type="number"
            className={inputClass}
            placeholder="Identifiant"
            value={String(value)}
            onChange={(e) => setValue(field.name, e.target.value)}
          />
        ) : (
          <select
            className={inputClass}
            value={String(value)}
            onChange={(e) => setValue(field.name, e.target.value)}
          >
            <option value="">
              {list === undefined ? "Chargement..." : "Sélectionner"}
            </option>
            {(list ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        );
    } else if (field.type === "select") {
      control = (
        <select
          className={inputClass}
          value={String(value)}
          onChange={(e) => onFieldChange(field, e.target.value)}
        >
          <option value="">Sélectionner</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    } else {
      control = (
        <input
          type={field.type}
          min={field.after ? nextDay(String(values[field.after] ?? "")) || undefined : field.min}
          max={field.max}
          maxLength={field.digitsOnly}
          inputMode={field.digitsOnly ? "numeric" : undefined}
          className={inputClass}
          value={String(value)}
          onChange={(e) =>
            setValue(field.name, field.digitsOnly ? e.target.value.replace(/\D/g, "").slice(0, field.digitsOnly) : e.target.value)
          }
        />
      );
    }

    return (
      <label className="block space-y-1 text-sm font-medium text-gray-700">
        {field.label}
        {field.required ? " *" : ""}
        {control}
      </label>
    );
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? `Modifier ${config.singular}` : `Ajouter ${config.singular}`}
        </h1>

        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <div
                  key={field.name}
                  className={
                    field.full || field.type === "textarea" || field.type === "geo" || field.type === "partners" || field.type === "zonehierarchy" ? "md:col-span-2" : ""
                  }
                >
                  {renderField(field)}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Link
                href={config.basePath}
                className="rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
