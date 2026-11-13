"use client";

import { useCallback, useEffect, useState } from "react";

import api from "@/lib/axios";
import type { Item } from "@/lib/crud";
import type { ObjectiveRow } from "@/lib/gaps";
import type { InternshipMonitoring } from "@/lib/internshipMonitoring";
import type { InternshipJournal } from "@/lib/presence";
import { fetchMine } from "@/lib/activitySpace";
import { activitiesConfig } from "@/lib/resources";
import { fetchInternshipMonitoring, fetchInternshipsMonitoring } from "@/services/monitoring.service";

/**
 * Données « Mon avancement » du stagiaire connecté. Tout passe par des routes déjà ouvertes aux stagiaires
 * (le serveur ne renvoie que SON stage) : /monitoring/internships, /presence/internship/:id, /objectives.
 * Chaque source secondaire est facultative : si elle échoue, le reste de la page reste utilisable.
 */
export function useMyInternship(opts: { loadActivities?: boolean } = {}) {
  const { loadActivities = false } = opts;

  const [stages, setStages] = useState<InternshipMonitoring[]>([]);
  const [stageId, setStageId] = useState<number | null>(null);
  const [internship, setInternship] = useState<InternshipMonitoring | null>(null);
  const [journal, setJournal] = useState<InternshipJournal | null>(null);
  const [objectives, setObjectives] = useState<ObjectiveRow[]>([]);
  const [activities, setActivities] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  // 1) liste de MES stages -> stage affiché par défaut (en cours, sinon le plus récent)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchInternshipsMonitoring(false)
      .then((list) => {
        if (cancelled) return;
        setStages(list);
        setStageId((cur) => {
          if (cur && list.some((s) => s.id === cur)) return cur;
          const pick = list.find((s) => s.status === "IN_PROGRESS") ?? [...list].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0];
          return pick?.id ?? null;
        });
        if (list.length === 0) setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.response?.data?.message ?? e?.message ?? "Impossible de charger votre stage.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  // 2) détail du stage choisi + journal GPS + objectifs (+ activités)
  useEffect(() => {
    if (stageId === null) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const detail = await fetchInternshipMonitoring(stageId);
        if (cancelled) return;
        setInternship(detail);
        setError(null);
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.message ?? e?.message ?? "Impossible de charger votre stage.");
      }

      const [journalRes, objectivesRes] = await Promise.all([
        api.get(`/presence/internship/${stageId}`, { params: { days: 365 } }).catch(() => null),
        api.get("/objectives").catch(() => null),
      ]);
      if (cancelled) return;
      setJournal(journalRes?.data?.data ?? null);
      setObjectives(Array.isArray(objectivesRes?.data?.data) ? (objectivesRes!.data.data as ObjectiveRow[]) : []);

      if (loadActivities) {
        try {
          const [all, mine] = await Promise.all([api.get(activitiesConfig.endpoint), fetchMine().catch(() => null)]);
          if (cancelled) return;
          const list: Item[] = all.data?.[activitiesConfig.listKey] ?? [];
          const mineIds = new Set((mine?.mine ?? []).filter((m) => m.status !== "REJECTED").map((m) => m.activityId));
          setActivities(list.filter((a) => mineIds.has(a.id)));
        } catch {
          if (!cancelled) setActivities([]);
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [stageId, loadActivities, tick]);

  return { stages, stageId, setStageId, internship, journal, objectives, activities, loading, error, reload };
}
