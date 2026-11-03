"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";
import { LEVEL_COLORS, ZONE_LEVELS, ZoneMap, ZoneShape } from "@/components/zones/ZoneMap";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Values = Record<string, string | boolean>;
type Level = "PROVINCE" | "REGION" | "DISTRICT" | "COMMUNE" | "FOKONTANY";

const ORDER: Level[] = ["PROVINCE", "REGION", "DISTRICT", "COMMUNE", "FOKONTANY"];
const LABEL: Record<Level, string> = { PROVINCE: "Province", REGION: "Région", DISTRICT: "District", COMMUNE: "Commune", FOKONTANY: "Fokontany" };

interface Unit {
  id: string;
  name: string;
  level: Level;
  parentId: string | null;
  /** Noms des niveaux supérieurs, de la province vers le parent direct */
  path: string[];
}

interface Shape {
  geometry: any | null;
  bbox: number[]; // [sud, nord, ouest, est]
  center: { lat: number; lng: number };
  /** Contour détaillé pas encore disponible : seule l'emprise est connue (le cercle du rayon s'affiche quand même) */
  partial?: boolean;
}

interface Problem {
  message: string;
  retry: () => void;
}

const norm = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (v: number) => (v * Math.PI) / 180;
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rayon = distance du centre au coin le plus éloigné de l'emprise : le cercle couvre toute la zone. */
function radiusOf(lat: number, lng: number, bbox: number[]): number {
  if (bbox.length !== 4 || !bbox.every(Number.isFinite)) return 0;
  const [s, n, w, e] = bbox;
  return Math.max(distanceKm(lat, lng, s, w), distanceKm(lat, lng, s, e), distanceKm(lat, lng, n, w), distanceKm(lat, lng, n, e));
}

/** Rectangle de l'emprise, dessiné sur la carte tant que le contour détaillé n'est pas disponible. */
function bboxPolygon(bbox: number[]) {
  if (bbox.length !== 4 || !bbox.every(Number.isFinite)) return null;
  const [s, n, w, e] = bbox;
  return { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] };
}

/**
 * Appel au service de cartographie avec nouvel essai automatique : le serveur peut mettre quelques
 * secondes à répondre la première fois (OpenStreetMap) ; il garde alors le résultat prêt pour l'essai suivant.
 * Une réponse 4xx (zone introuvable...) n'est pas retentée.
 */
export async function fetchGeo<T>(url: string, params: Record<string, string>, alive: () => boolean): Promise<T> {
  let last: unknown = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    if (!alive()) throw new Error("annulé");

    try {
      const res = await api.get(url, { params });
      if (!res.data?.pending) return res.data?.data as T;
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status && status >= 400 && status < 500 && status !== 429) throw err;
      last = err;
    }

    await sleep(Math.min(1500 * (attempt + 1), 6000));
  }

  throw last ?? new Error("Le service de cartographie met trop de temps à répondre.");
}

/**
 * Sélection hiérarchique d'une zone : Province > Région > District > Commune > Fokontany.
 * - cocher un élément affiche ses sous-divisions dans la colonne suivante (sélection multiple possible)
 * - chaque niveau a sa couleur sur la carte
 * - nom, type, adresse, région, coordonnées, rayon d'intervention et contour se remplissent seuls
 */
/** Résultat de la sélection en mode « bénéficiaire » (aucun rayon, aucun calcul de zone d'intervention) */
export interface BeneficiaryZoneInfo {
  province: string;
  region: string;
  district: string;
  commune: string;
  fokontany: string;
  /** Sélection allégée (sans géométrie), à enregistrer pour la restaurer à la modification */
  units: string;
}

export function ZoneHierarchyField({
  values,
  setMany,
  variant = "zone",
  onSelection,
  pin = null,
  onMapClick,
}: {
  values: Values;
  setMany: (patch: Values) => void;
  /** "zone" (défaut) : formulaire des zones d'intervention, inchangé. "beneficiary" : un seul choix par niveau, sans rayon. */
  variant?: "zone" | "beneficiary";
  /** variant "beneficiary" : reçoit la sélection (à la place du remplissage des champs de la zone) */
  onSelection?: (info: BeneficiaryZoneInfo) => void;
  /** variant "beneficiary" : domicile exact à repérer sur la carte */
  pin?: { lat: number; lng: number } | null;
  /** variant "beneficiary" : clic sur la carte = nouvelle position du domicile */
  onMapClick?: (latitude: number, longitude: number) => void;
}) {
  const isBen = variant === "beneficiary";
  const onSelectionRef = useRef(onSelection);
  onSelectionRef.current = onSelection;
  const [units, setUnits] = useState<Record<string, Unit>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [shapes, setShapes] = useState<Record<string, Shape>>({});
  const [busy, setBusy] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [problems, setProblems] = useState<Record<string, Problem>>({});

  const touched = useRef(false);
  const restored = useRef(false);
  const alive = useRef(true);
  const childrenAsked = useRef<Set<string>>(new Set());
  const shapeAsked = useRef<Set<string>>(new Set());
  const unitsRef = useRef(units);
  const selectedRef = useRef(selected);
  const setManyRef = useRef(setMany);

  unitsRef.current = units;
  selectedRef.current = selected;
  setManyRef.current = setMany;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const isAlive = () => alive.current;
  const mark = (key: string, on: boolean) => setBusy((cur) => (on ? [...cur, key] : cur.filter((k) => k !== key)));
  const setProblem = (key: string, problem: Problem | null) =>
    setProblems((cur) => {
      const next = { ...cur };
      if (problem) next[key] = problem;
      else delete next[key];
      return next;
    });

  const loadChildren = async (unit: Unit) => {
    if (unit.level === "FOKONTANY" || childrenAsked.current.has(unit.id)) return;
    childrenAsked.current.add(unit.id);
    setProblem(`c:${unit.id}`, null);
    mark(`c:${unit.id}`, true);

    try {
      const list = await fetchGeo<{ id: string; name: string }[]>("/zones/admin/children", { parent: unit.id }, isAlive);
      if (!isAlive() || !selectedRef.current.includes(unit.id)) {
        childrenAsked.current.delete(unit.id); // décoché pendant le chargement
        return;
      }

      const next = ORDER[ORDER.indexOf(unit.level) + 1];

      setUnits((cur) => {
        const merged = { ...cur };
        (list ?? []).forEach((c) => {
          merged[c.id] = { id: c.id, name: c.name, level: next, parentId: unit.id, path: [...unit.path, unit.name] };
        });
        return merged;
      });
    } catch (err) {
      childrenAsked.current.delete(unit.id);
      if (isAlive()) {
        setProblem(`c:${unit.id}`, {
          message: `${unit.name} : ${errorMessage(err, "chargement des sous-divisions impossible.")}`,
          retry: () => void loadChildren(unit),
        });
      }
    } finally {
      mark(`c:${unit.id}`, false);
    }
  };

  const loadShape = async (unit: Unit) => {
    if (shapeAsked.current.has(unit.id)) return;
    shapeAsked.current.add(unit.id);
    setProblem(`s:${unit.id}`, null);
    mark(`s:${unit.id}`, true);

    try {
      const shape = await fetchGeo<Shape>("/zones/admin/shape", { id: unit.id, fast: "1" }, isAlive);
      if (!isAlive() || !selectedRef.current.includes(unit.id)) {
        shapeAsked.current.delete(unit.id);
        return;
      }
      if (shape) setShapes((cur) => ({ ...cur, [unit.id]: shape }));
    } catch (err) {
      shapeAsked.current.delete(unit.id);
      if (isAlive()) {
        setProblem(`s:${unit.id}`, {
          message: `${unit.name} : ${errorMessage(err, "contour indisponible.")}`,
          retry: () => void loadShape(unit),
        });
      }
    } finally {
      mark(`s:${unit.id}`, false);
    }
  };

  /** Un seul essai silencieux : remplace l'emprise provisoire par le contour détaillé dès qu'il est prêt. */
  const refreshShape = async (id: string) => {
    try {
      const res = await api.get("/zones/admin/shape", { params: { id, fast: "1" } });
      const shape: Shape | undefined = res.data?.data;
      if (isAlive() && shape && !shape.partial && selectedRef.current.includes(id)) setShapes((cur) => ({ ...cur, [id]: shape }));
    } catch {
      /* on réessaiera au prochain passage */
    }
  };

  // Provinces (liste fixe)
  const loadProvinces = () => {
    setProblem("provinces", null);

    api
      .get("/zones/admin/provinces")
      .then((res) => {
        const list: { id: string; name: string }[] = res.data?.data ?? [];
        setUnits((cur) => {
          const merged = { ...cur };
          list.forEach((p) => {
            merged[p.id] = merged[p.id] ?? { id: p.id, name: p.name, level: "PROVINCE", parentId: null, path: [] };
          });
          return merged;
        });
      })
      .catch((err) => setProblem("provinces", { message: errorMessage(err, "Liste des provinces indisponible."), retry: loadProvinces }));
  };

  useEffect(() => {
    loadProvinces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fiche existante : on reconstruit la sélection enregistrée (sans rien écraser)
  useEffect(() => {
    const source = isBen ? values.zoneUnits : values.boundary;
    if (restored.current || touched.current || !source) return;
    restored.current = true;

    try {
      const geo = JSON.parse(String(source));
      if (geo?.type !== "FeatureCollection") return;

      const restoredUnits: Record<string, Unit> = {};
      const restoredShapes: Record<string, Shape> = {};
      const ids: string[] = [];

      (geo.features ?? []).forEach((f: any) => {
        const p = f.properties ?? {};
        if (!p.id || !ORDER.includes(p.level)) return;
        restoredUnits[p.id] = { id: p.id, name: p.name, level: p.level, parentId: p.parentId ?? null, path: p.path ?? [] };
        restoredShapes[p.id] = { geometry: f.geometry ?? null, bbox: p.bbox ?? [], center: p.center ?? { lat: 0, lng: 0 }, partial: !f.geometry };
        shapeAsked.current.add(p.id);
        ids.push(p.id);
      });

      selectedRef.current = ids;
      setUnits((cur) => ({ ...cur, ...restoredUnits }));
      setShapes((cur) => ({ ...cur, ...restoredShapes }));
      setSelected(ids);
      Object.values(restoredUnits).forEach((u) => void loadChildren(u));
    } catch {
      /* contour ancien (simple polygone) : rien à reconstruire */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBen ? values.zoneUnits : values.boundary]);

  const toggle = (unit: Unit) => {
    touched.current = true;

    // Mode bénéficiaire : un seul élément par niveau (choisir un autre remplace l'ancien et ses sous-niveaux)
    const replaced = !isBen || selected.includes(unit.id) ? [] : selected.filter((id) => unitsRef.current[id]?.level === unit.level);

    if (selected.includes(unit.id) || replaced.length) {
      const roots = replaced.length ? replaced : [unit.id];
      const remove = new Set<string>(roots);
      let grew = true;

      while (grew) {
        grew = false;
        Object.values(unitsRef.current).forEach((x) => {
          if (x.parentId && remove.has(x.parentId) && !remove.has(x.id)) {
            remove.add(x.id);
            grew = true;
          }
        });
      }

      remove.forEach((id) => {
        childrenAsked.current.delete(id);
        shapeAsked.current.delete(id);
      });

      const keep = selected.filter((id) => !remove.has(id));
      selectedRef.current = keep;
      setSelected(keep);
      setUnits((cur) => {
        const next = { ...cur };
        remove.forEach((id) => {
          if (!roots.includes(id)) delete next[id];
        });
        return next;
      });
      setShapes((cur) => {
        const next = { ...cur };
        remove.forEach((id) => delete next[id]);
        return next;
      });
      setProblems((cur) => {
        const next = { ...cur };
        remove.forEach((id) => {
          delete next[`c:${id}`];
          delete next[`s:${id}`];
        });
        return next;
      });

      if (!replaced.length) return;
    }

    const base = replaced.length ? selectedRef.current : selected;
    const added = [...base, unit.id];
    selectedRef.current = added; // à jour immédiatement : les chargements ci-dessous vérifient que l'élément est toujours coché
    setSelected(added);
    void loadChildren(unit);
    void loadShape(unit);
  };

  const selectedUnits = useMemo(
    () =>
      selected
        .map((id) => units[id])
        .filter(Boolean)
        .sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level)),
    [selected, units]
  );

  const deepest = useMemo(() => {
    for (let i = ORDER.length - 1; i >= 0; i--) {
      const list = selectedUnits.filter((u) => u.level === ORDER[i]);
      if (list.length) return { level: ORDER[i], units: list };
    }
    return null;
  }, [selectedUnits]);

  // Contour provisoire (emprise seule) : on retente discrètement pour obtenir le contour détaillé
  const partialIds = selectedUnits.filter((u) => shapes[u.id]?.partial).map((u) => u.id).join("|");

  useEffect(() => {
    if (!partialIds) return;

    let rounds = 0;
    const timer = window.setInterval(() => {
      rounds += 1;
      if (rounds > 25) {
        window.clearInterval(timer);
        return;
      }
      partialIds.split("|").forEach((id) => void refreshShape(id));
    }, 3000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partialIds]);

  // Remplissage automatique du formulaire (après une action de l'utilisateur uniquement)
  const shapesKey = selectedUnits.map((u) => `${u.id}:${shapes[u.id] ? (shapes[u.id].geometry ? 2 : 1) : 0}`).join("|");

  useEffect(() => {
    if (!touched.current) return;

    const timer = window.setTimeout(() => {
      if (isBen) {
        const names: Record<Level, string> = { PROVINCE: "", REGION: "", DISTRICT: "", COMMUNE: "", FOKONTANY: "" };

        if (deepest) {
          const first = deepest.units[0];
          first.path.forEach((name, i) => {
            if (ORDER[i]) names[ORDER[i]] = name;
          });
          names[first.level] = first.name;
        }

        const features = selectedUnits
          .filter((u) => shapes[u.id])
          .map((u) => ({
            type: "Feature",
            properties: { id: u.id, name: u.name, level: u.level, parentId: u.parentId, path: u.path, bbox: shapes[u.id].bbox, center: shapes[u.id].center },
            geometry: null, // la géométrie n'est pas enregistrée dans la fiche : elle est redemandée à l'affichage
          }));

        onSelectionRef.current?.({
          province: names.PROVINCE,
          region: names.REGION,
          district: names.DISTRICT,
          commune: names.COMMUNE,
          fokontany: names.FOKONTANY,
          units: features.length ? JSON.stringify({ type: "FeatureCollection", features }) : "",
        });
        return;
      }

      if (!deepest) {
        setManyRef.current({ name: "", address: "", region: "", latitude: "", longitude: "", radiusKm: "", boundary: "" });
        return;
      }

      const first = deepest.units[0];
      const ready = deepest.units.filter((u) => shapes[u.id]);
      const latitude = ready.length ? ready.reduce((sum, u) => sum + shapes[u.id].center.lat, 0) / ready.length : null;
      const longitude = ready.length ? ready.reduce((sum, u) => sum + shapes[u.id].center.lng, 0) / ready.length : null;
      const radius =
        latitude !== null && longitude !== null ? Math.max(...ready.map((u) => radiusOf(latitude, longitude, shapes[u.id].bbox))) : 0;

      const features = selectedUnits
        .filter((u) => shapes[u.id])
        .map((u) => ({
          type: "Feature",
          properties: { id: u.id, name: u.name, level: u.level, parentId: u.parentId, path: u.path, bbox: shapes[u.id].bbox, center: shapes[u.id].center },
          geometry: shapes[u.id].geometry,
        }));

      const region = first.level === "REGION" ? first.name : first.level === "PROVINCE" ? "" : first.path[1] ?? "";
      const extra = deepest.units.length > 1 ? ` (+${deepest.units.length - 1})` : "";

      // Commune et fokontany : le nom du parent est ajouté (« Antoetra, Ambositra I (Fokontany) »), car un même nom existe dans plusieurs communes
      const parentName = first.path[first.path.length - 1];
      const sameParent = deepest.units.every((u) => u.parentId === first.parentId);
      const withParent = (deepest.level === "COMMUNE" || deepest.level === "FOKONTANY") && parentName && sameParent;

      // Adresse : chaque niveau est nommé (Fokontany X, Commune Y, District Z, Région ..., Province ...)
      const addressParts = [
        `${LABEL[first.level]} ${first.name}`,
        ...[...first.path].map((name, i) => `${LABEL[ORDER[i]]} ${name}`).reverse(),
        "Madagascar",
      ];

      const patch: Values = {
        name: `${deepest.units.map((u) => u.name).join(", ")}${withParent ? `, ${parentName}` : ""} (${LABEL[deepest.level]})`,
        level: deepest.level,
        region,
        address: addressParts.join(", ") + extra,
        boundary: features.length ? JSON.stringify({ type: "FeatureCollection", features }) : "",
      };

      if (latitude !== null && longitude !== null) {
        patch.latitude = latitude.toFixed(6);
        patch.longitude = longitude.toFixed(6);
        patch.radiusKm = String(Math.max(0.1, Math.round(radius * 10) / 10));
      }

      setManyRef.current(patch);
    }, 400);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapesKey]);

  // Carte : tous les éléments cochés, une couleur par niveau ; cercle de rayon pour le niveau le plus fin
  const mapZones: ZoneShape[] = selectedUnits
    .filter((u) => shapes[u.id])
    .map((u) => {
      const s = shapes[u.id];
      const isDeepest = deepest?.level === u.level;

      return {
        // le suffixe force le redessin quand le contour détaillé remplace l'emprise provisoire
        id: `${u.id}${s.geometry ? ":g" : ":b"}`,
        name: u.name,
        latitude: s.center.lat,
        longitude: s.center.lng,
        radiusKm: isDeepest && !isBen ? Math.round(radiusOf(s.center.lat, s.center.lng, s.bbox) * 10) / 10 : null,
        boundary: s.geometry ?? bboxPolygon(s.bbox),
        level: u.level,
        color: LEVEL_COLORS[u.level],
        circle: isDeepest && !isBen,
        marker: isDeepest && !isBen,
      };
    });

  const loading = busy.length > 0;
  const problemList = Object.entries(problems);
  const hasPartial = Boolean(partialIds);

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">
          {isBen ? "Localisation : province, région, district, commune, fokontany" : "Zone : province, région, district, commune, fokontany"}
        </p>
        {loading && (
          <span className="inline-flex items-center gap-1.5 text-xs text-blue-700">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500">
        {isBen
          ? "Cochez un élément par niveau : la colonne suivante affiche ce qu'il contient. Chaque niveau a sa couleur sur la carte. Cliquez ensuite sur la carte pour placer le domicile exact."
          : "Cochez une ou plusieurs zones : la colonne suivante affiche ce qu'elles contiennent. Chaque niveau a sa couleur sur la carte. Le nom, l'adresse, le rayon d'intervention et les coordonnées se remplissent à partir du niveau le plus précis choisi."}
      </p>

      {problemList.length > 0 && (
        <div className="space-y-1.5">
          {problemList.map(([key, problem]) => (
            <div key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <span>{problem.message}</span>
              <button type="button" onClick={problem.retry} className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-0.5 font-medium hover:bg-red-100">
                <RefreshCw className="h-3 w-3" /> Réessayer
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {ORDER.map((level, index) => {
          const list = Object.values(units)
            .filter((u) => u.level === level)
            .sort((a, b) => a.name.localeCompare(b.name, "fr"));
          const filter = filters[level] ?? "";
          const shown = filter ? list.filter((u) => norm(u.name).includes(norm(filter))) : list;
          const parentLevel = ORDER[index - 1];
          const chosenParents = parentLevel ? selectedUnits.filter((u) => u.level === parentLevel) : [];
          const parentChosen = !parentLevel || chosenParents.length > 0;
          const waiting = chosenParents.some((p) => busy.includes(`c:${p.id}`));
          const count = selectedUnits.filter((u) => u.level === level).length;

          // Plusieurs parents cochés : les éléments sont regroupés sous leur parent pour rester lisibles
          const groups: { key: string; title: string | null; items: Unit[] }[] = [];
          shown.forEach((u) => {
            const key = u.parentId ?? "";
            let group = groups.find((g) => g.key === key);
            if (!group) {
              group = { key, title: u.parentId ? u.path[u.path.length - 1] ?? null : null, items: [] };
              groups.push(group);
            }
            group.items.push(u);
          });
          groups.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", "fr"));
          const grouped = groups.length > 1;

          return (
            <div key={level} className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-800">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: LEVEL_COLORS[level] }} />
                  {LABEL[level]}
                </span>
                {waiting && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                {count > 0 && <span className="rounded-full bg-gray-100 px-1.5 text-[11px] text-gray-600">{count}</span>}
              </div>

              {list.length > 8 && (
                <input
                  value={filter}
                  onChange={(e) => setFilters((cur) => ({ ...cur, [level]: e.target.value }))}
                  placeholder="Filtrer"
                  className="mx-2 mt-2 rounded-lg border border-gray-200 bg-transparent px-2 py-1 text-xs"
                />
              )}

              <div className="max-h-48 flex-1 overflow-y-auto p-1">
                {groups.map((group) => (
                  <div key={group.key}>
                    {grouped && group.title && (
                      <p className="sticky top-0 bg-white px-2 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{group.title}</p>
                    )}

                    {group.items.map((u) => (
                      <label key={u.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1 text-xs hover:bg-gray-100">
                        <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 shrink-0" checked={selected.includes(u.id)} onChange={() => toggle(u)} />
                        <span className="min-w-0 break-words">{u.name}</span>
                        {busy.includes(`s:${u.id}`) && <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin text-gray-400" />}
                      </label>
                    ))}
                  </div>
                ))}

                {shown.length === 0 && (
                  <p className="px-2 py-2 text-xs text-gray-500">
                    {!parentChosen
                      ? `Cochez d'abord ${parentLevel === "REGION" ? "une région" : parentLevel === "PROVINCE" ? "une province" : `un(e) ${LABEL[parentLevel].toLowerCase()}`}.`
                      : waiting
                        ? "Chargement... (la première fois peut prendre quelques secondes)"
                        : list.length
                          ? "Aucun résultat."
                          : index > 0 && Object.keys(problems).some((k) => k.startsWith("c:"))
                            ? "Chargement interrompu : utilisez « Réessayer »."
                            : "Aucune donnée disponible."}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {deepest && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {selectedUnits.length} élément(s) affiché(s) · niveau le plus précis : {LABEL[deepest.level]} ({deepest.units.map((u) => u.name).join(", ")})
          {!isBen && values.radiusKm ? ` · rayon ≈ ${values.radiusKm} km` : ""}
          {hasPartial ? " · contour détaillé en cours de chargement (emprise affichée en attendant)" : ""}
        </p>
      )}

      {selectedUnits.some((u) => shapes[u.id]) && (
        <details className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
          <summary className="cursor-pointer font-medium">{isBen ? "Latitude et longitude de chaque niveau" : "Latitude, longitude et rayon de chaque niveau"}</summary>
          <ul className="mt-2 space-y-1">
            {selectedUnits
              .filter((u) => shapes[u.id])
              .map((u) => {
                const s = shapes[u.id];
                const km = Math.round(radiusOf(s.center.lat, s.center.lng, s.bbox) * 10) / 10;

                return (
                  <li key={u.id} className="flex flex-wrap items-center gap-x-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: LEVEL_COLORS[u.level] }} />
                    <span className="font-medium">{u.name}</span>
                    <span className="text-gray-500">({LABEL[u.level]})</span>
                    <span>
                      {s.center.lat.toFixed(4)}, {s.center.lng.toFixed(4)}
                      {isBen ? "" : ` · rayon ≈ ${km} km`}
                    </span>
                  </li>
                );
              })}
          </ul>
        </details>
      )}

      {mapZones.length > 0 || isBen ? (
        <ZoneMap zones={mapZones} height={isBen ? 380 : 340} legend pin={isBen ? pin : null} onMapClick={isBen ? onMapClick : undefined} />
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-xs text-gray-500">
          {loading && selected.length > 0 ? "Chargement de la carte..." : "La carte s'affichera ici dès qu'une zone sera cochée."}
        </div>
      )}
    </div>
  );
}
