"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import api from "@/lib/axios";
import type { LookupItem } from "@/lib/crud";

/** Destinataires : une personne, ou un ou plusieurs groupes (rôles, directions, agents en mission). */
export interface AudienceValue {
  mode: "user" | "group";
  userId: string;
  /** "role:STAGIAIRE_L3" | "dept:3" | "mission" */
  tokens: string[];
}

export const EMPTY_AUDIENCE: AudienceValue = { mode: "user", userId: "", tokens: [] };

const ROLE_CHIPS: Array<{ label: string; roles: string[] }> = [
  { label: "Tous les stagiaires", roles: ["STAGIAIRE_L3", "STAGIAIRE_M2"] },
  { label: "Stagiaires L3", roles: ["STAGIAIRE_L3"] },
  { label: "Stagiaires M2", roles: ["STAGIAIRE_M2"] },
  { label: "Tous les tuteurs", roles: ["TUTEUR_L3", "TUTEUR_M2"] },
  { label: "Tuteurs L3", roles: ["TUTEUR_L3"] },
  { label: "Tuteurs M2", roles: ["TUTEUR_M2"] },
  { label: "Direction", roles: ["DIRECTION"] },
  { label: "DSI", roles: ["DSI"] },
  { label: "DAF", roles: ["DAF"] },
  { label: "RH", roles: ["RH"] },
  { label: "Communication", roles: ["COMMUNICATION"] },
  { label: "Coordinateurs", roles: ["COORDINATOR"] },
  { label: "Administrateurs", roles: ["ADMIN"] },
];

export function audienceToPayload(value: AudienceValue) {
  if (value.mode === "user") {
    return { userIds: value.userId ? [Number(value.userId)] : [] };
  }

  return {
    roles: value.tokens.filter((t) => t.startsWith("role:")).map((t) => t.slice(5)),
    departmentIds: value.tokens.filter((t) => t.startsWith("dept:")).map((t) => Number(t.slice(5))),
    onMission: value.tokens.includes("mission"),
  };
}

export const audienceIsEmpty = (value: AudienceValue): boolean =>
  value.mode === "user" ? !value.userId : value.tokens.length === 0;

interface Props {
  value: AudienceValue;
  onChange: (value: AudienceValue) => void;
  users: LookupItem[];
  departments: LookupItem[];
}

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm font-medium transition ${
    active ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
  }`;

export function AudiencePicker({ value, onChange, users, departments }: Props) {
  const [count, setCount] = useState<{ n: number; tooMany: boolean } | null>(null);

  const has = (token: string) => value.tokens.includes(token);

  const toggle = (tokens: string[]) => {
    const active = tokens.every(has);

    onChange({
      ...value,
      tokens: active
        ? value.tokens.filter((t) => !tokens.includes(t))
        : Array.from(new Set([...value.tokens, ...tokens])),
    });
  };

  // Nombre de destinataires (mis à jour automatiquement à chaque changement)
  useEffect(() => {
    if (audienceIsEmpty(value)) {
      setCount(null);
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(() => {
      api
        .post("/notifications/audience/preview", { audience: audienceToPayload(value) })
        .then((res) => !cancelled && setCount({ n: res.data?.data?.count ?? 0, tooMany: !!res.data?.data?.tooMany }))
        .catch(() => !cancelled && setCount(null));
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value]);

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-xl border border-gray-300 bg-white p-1 text-sm font-medium">
        {(["user", "group"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange({ ...value, mode })}
            className={`rounded-lg px-3 py-1.5 ${value.mode === mode ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            {mode === "user" ? "Une personne" : "Groupe(s)"}
          </button>
        ))}
      </div>

      {value.mode === "user" ? (
        <select
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
          value={value.userId}
          onChange={(event) => onChange({ ...value, userId: event.target.value })}
        >
          <option value="">Destinataire</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>{user.label}</option>
          ))}
        </select>
      ) : (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Rôles</p>
            <div className="flex flex-wrap gap-2">
              {ROLE_CHIPS.map(({ label, roles }) => {
                const tokens = roles.map((role) => `role:${role}`);

                return (
                  <button key={label} type="button" onClick={() => toggle(tokens)} className={chip(tokens.every(has))}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Terrain</p>
            <button type="button" onClick={() => toggle(["mission"])} className={chip(has("mission"))}>
              Agents en mission
            </button>
          </div>

          {departments.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Directions / départements</p>
              <div className="flex flex-wrap gap-2">
                {departments.map((department) => (
                  <button
                    key={department.id}
                    type="button"
                    onClick={() => toggle([`dept:${department.id}`])}
                    className={chip(has(`dept:${department.id}`))}
                  >
                    {department.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {count && (
        <p
          className={`flex items-center gap-1.5 text-sm font-medium ${
            count.tooMany ? "text-red-600" : count.n === 0 ? "text-amber-600" : "text-green-700"
          }`}
        >
          <Users className="h-4 w-4" />
          {count.tooMany
            ? "Trop de destinataires (500 maximum par envoi)"
            : count.n === 0
              ? "Aucun destinataire actif pour cette sélection"
              : `${count.n} destinataire${count.n > 1 ? "s" : ""}`}
        </p>
      )}
    </div>
  );
}
