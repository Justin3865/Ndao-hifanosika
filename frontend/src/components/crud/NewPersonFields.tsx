"use client";

/**
 * Nouveau stagiaire saisi directement dans le formulaire d'un stage : le compte est créé à l'enregistrement
 * (puis ses informations personnelles : téléphone, naissance, CIN, sont enregistrées dans sa fiche).
 */

type Values = Record<string, string | boolean>;

export const NEW_PERSON_KEYS = ["firstName", "lastName", "email", "role"] as const;
export type NewPersonKey = (typeof NEW_PERSON_KEYS)[number];

export const newPersonName = (key: NewPersonKey) => `newPerson.${key}`;

/** Nom et e-mail renseignés : un nouveau compte stagiaire est demandé (le prénom est facultatif : certaines personnes n'en ont pas). */
export const newPersonFilled = (values: Values): boolean =>
  (["lastName", "email"] as const).every((key) => String(values[newPersonName(key)] ?? "").trim() !== "");

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export function NewPersonFields({
  disabled,
  values,
  setValue,
}: {
  /** Un stagiaire existant est déjà choisi : ce bloc est ignoré. */
  disabled: boolean;
  values: Values;
  setValue: (name: string, value: string | boolean) => void;
}) {
  const field = (key: NewPersonKey, label: string, type = "text", placeholder = "") => (
    <label className="block space-y-1 text-sm font-medium text-gray-700">
      {label}
      <input
        type={type}
        className={inputClass}
        placeholder={placeholder}
        disabled={disabled}
        value={String(values[newPersonName(key)] ?? "")}
        onChange={(e) => setValue(newPersonName(key), e.target.value)}
      />
    </label>
  );

  return (
    <div className={`space-y-3 rounded-2xl border border-dashed p-4 ${disabled ? "border-gray-200 bg-gray-50 opacity-60" : "border-blue-300 bg-blue-50/40"}`}>
      <div>
        <p className="text-sm font-semibold text-gray-800">Nouveau stagiaire (absent de la liste)</p>
        <p className="text-xs text-gray-500">
          {disabled
            ? "Un stagiaire existant est choisi ci-dessus : ce bloc est ignoré."
            : "Un compte stagiaire sera créé avec ce stage ; il définira son mot de passe via « Mot de passe oublié »."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {field("firstName", "Prénom (facultatif)")}
        {field("lastName", "Nom *")}
        {field("email", "E-mail *", "email", "prenom.nom@exemple.com")}

        <label className="block space-y-1 text-sm font-medium text-gray-700">
          Niveau
          <select
            className={inputClass}
            disabled={disabled}
            value={String(values[newPersonName("role")] || "STAGIAIRE_L3")}
            onChange={(e) => setValue(newPersonName("role"), e.target.value)}
          >
            <option value="STAGIAIRE_L3">Stagiaire L3</option>
            <option value="STAGIAIRE_M2">Stagiaire M2</option>
          </select>
        </label>
      </div>
    </div>
  );
}
