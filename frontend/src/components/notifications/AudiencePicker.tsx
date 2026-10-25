"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Check, ChevronDown, ChevronUp, Loader2, Search, Users, X } from "lucide-react";
import api from "@/lib/axios";
import type { LookupItem } from "@/lib/crud";
import { roleLabel } from "@/lib/roles";

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

interface Recipient {
  id: number;
  name: string;
  role: string;
  department: string | null;
}

/* ------------------------------------------------------------------ */
/* Choix d'une personne : on tape le nom (ou le rôle) pour filtrer      */
/* ------------------------------------------------------------------ */

const fold = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function UserCombobox({
  users,
  value,
  onChange,
}: {
  users: LookupItem[];
  value: string;
  onChange: (userId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const selected = users.find((user) => String(user.id) === value) ?? null;

  const results = useMemo(() => {
    const words = fold(query.trim()).split(/\s+/).filter(Boolean);
    if (words.length === 0) return users;

    return users.filter((user) => {
      const label = fold(user.label);
      return words.every((word) => label.includes(word));
    });
  }, [users, query]);

  // Fermer en cliquant ailleurs
  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => setActive(0), [query]);

  // Garder l'élément actif visible pendant la navigation au clavier
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (user: LookupItem) => {
    onChange(String(user.id));
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open && results[active]) choose(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={box} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          value={open ? query : selected?.label ?? ""}
          placeholder={selected ? selected.label : "Destinataire : tapez un nom…"}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-9 pr-16 outline-none focus:border-blue-500"
        />

        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {value && (
            <button
              type="button"
              aria-label="Effacer le destinataire"
              onClick={() => {
                onChange("");
                setQuery("");
              }}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown className="pointer-events-none h-4 w-4 text-gray-400" />
        </div>
      </div>

      {open && (
        <ul
          ref={list}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {results.length === 0 && <li className="px-4 py-3 text-sm text-gray-500">Aucun résultat pour « {query} ».</li>}

          {results.map((user, index) => {
            const isSelected = String(user.id) === value;

            return (
              <li
                key={user.id}
                role="option"
                aria-selected={isSelected}
                data-index={index}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(user)}
                onMouseEnter={() => setActive(index)}
                className={`flex cursor-pointer items-center justify-between gap-2 px-4 py-2 text-sm ${
                  index === active ? "bg-blue-50 text-blue-900" : "text-gray-800"
                }`}
              >
                <span className="truncate">{user.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AudiencePicker({ value, onChange, users, departments }: Props) {
  const [count, setCount] = useState<{ n: number; tooMany: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [filter, setFilter] = useState("");

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

  // Liste détaillée : chargée quand on déplie « N destinataires », puis tenue à jour si la sélection change
  useEffect(() => {
    if (!open || audienceIsEmpty(value)) {
      setRecipients([]);
      return;
    }

    let cancelled = false;
    setLoadingList(true);

    const timer = window.setTimeout(() => {
      api
        .post("/notifications/audience/recipients", { audience: audienceToPayload(value) })
        .then((res) => !cancelled && setRecipients(res.data?.data?.recipients ?? []))
        .catch(() => !cancelled && setRecipients([]))
        .finally(() => !cancelled && setLoadingList(false));
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, value]);

  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const shown = filter.trim()
    ? recipients.filter((r) => normalize(`${r.name} ${roleLabel(r.role)} ${r.department ?? ""}`).includes(normalize(filter.trim())))
    : recipients;

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
        <UserCombobox users={users} value={value.userId} onChange={(userId) => onChange({ ...value, userId })} />
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
        <div className="space-y-2">
          <button
            type="button"
            disabled={count.tooMany || count.n === 0}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={`flex items-center gap-1.5 rounded-lg text-sm font-medium ${
              count.tooMany ? "text-red-600" : count.n === 0 ? "text-amber-600" : "text-green-700 hover:underline"
            }`}
            title={count.n > 0 && !count.tooMany ? "Voir la liste des destinataires" : undefined}
          >
            <Users className="h-4 w-4" />
            {count.tooMany
              ? "Trop de destinataires (500 maximum par envoi)"
              : count.n === 0
                ? "Aucun destinataire actif pour cette sélection"
                : `${count.n} destinataire${count.n > 1 ? "s" : ""}`}
            {count.n > 0 && !count.tooMany && (open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
          </button>

          {open && count.n > 0 && !count.tooMany && (
            <div className="rounded-xl border border-gray-200 bg-white">
              {recipients.length > 8 && (
                <div className="relative border-b border-gray-100 p-2">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder="Filtrer la liste…"
                    className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto">
                {loadingList && recipients.length === 0 && (
                  <li className="flex items-center gap-2 px-3 py-3 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
                  </li>
                )}

                {shown.map((person) => (
                  <li key={person.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {person.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate font-medium text-gray-900">{person.name}</span>
                    </span>

                    <span className="flex shrink-0 flex-wrap justify-end gap-1 text-[11px]">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">{roleLabel(person.role)}</span>
                      {person.department && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">{person.department}</span>}
                    </span>
                  </li>
                ))}

                {!loadingList && shown.length === 0 && recipients.length > 0 && (
                  <li className="px-3 py-3 text-sm text-gray-500">Aucun résultat.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
