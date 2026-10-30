"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BellRing, BookOpen, CheckCircle2, Eye, History, Loader2, PlayCircle, RotateCcw, X } from "lucide-react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { InsightHeader, LevelBadge, METHOD_NOTE, State } from "@/components/insights/parts";
import { errorMessage } from "@/lib/crud";
import { getStoredRole } from "@/lib/access";
import { confirmDialog, toast } from "@/lib/toast";
import { getSocket } from "@/lib/socket";

/* ------------------------------ Types ------------------------------ */

type Severity = "HIGH" | "MEDIUM" | "LOW";

interface Anomaly {
  key?: string;
  type: string;
  severity: Severity;
  title: string;
  detail: string;
  link: string;
  source?: "rules" | "isolation-forest";
  score?: number;
}

type ActionStatus = "IN_PROGRESS" | "RESOLVED" | "IGNORED";

interface AnomalyAction {
  key: string;
  type: string;
  title: string;
  status: ActionStatus;
  note: string | null;
  snoozedUntil: string | null;
  userName: string | null;
  updatedAt: string;
}

const ACTION_BADGE: Record<ActionStatus, { label: string; className: string }> = {
  IN_PROGRESS: { label: "En cours", className: "bg-amber-100 text-amber-800" },
  RESOLVED: { label: "Résolue", className: "bg-green-100 text-green-800" },
  IGNORED: { label: "Ignorée", className: "bg-gray-100 text-gray-700" },
};

/** Filtre de statut : « active » = sans action ou en cours. */
const STATUS_FILTERS: Array<[string, string]> = [
  ["active", "À traiter"],
  ["IN_PROGRESS", "En cours"],
  ["RESOLVED", "Résolues"],
  ["IGNORED", "Ignorées"],
  ["all", "Toutes"],
];

interface Engine {
  name: string;
  used: boolean;
  latencyMs: number | null;
  samples: Record<string, number>;
  flagged: number;
  reason: string | null;
  checkedAt: string;
}

interface CatalogItem {
  code: string;
  label: string;
  description: string;
  engine: "rules" | "isolation-forest";
  severityRule: string;
  audienceLabel: string;
}

interface AlertConfig {
  auto: boolean;
  realtime?: boolean;
  everyMinutes: number;
  minSeverity: Severity;
  cooldownHours: number;
  maxPerUser: number;
}

interface RunEntry {
  id: number;
  at: string;
  source?: "manual" | "auto";
  minSeverity?: Severity;
  triggeredByName?: string | null;
  analyzed?: number;
  eligible?: number;
  notificationsSent?: number;
  digestsSent?: number;
  usersNotified?: number;
  duplicatesSkipped?: number;
  engineUsed?: boolean;
}

interface NotifyResult {
  ranAt: string;
  dryRun: boolean;
  minSeverity: Severity;
  durationMs: number;
  analyzed: number;
  eligible: number;
  notificationsSent: number;
  digestsSent: number;
  usersNotified: number;
  duplicatesSkipped: number;
  bySeverity: Record<Severity, number>;
  preview: Array<{ title: string; severity: Severity; source: string; recipients: number }>;
}

const NOTIFY_ROLES = ["ADMIN", "DIRECTION", "DSI"];

const SEVERITY_CHOICES: Array<[Severity, string]> = [
  ["HIGH", "Critiques seulement"],
  ["MEDIUM", "Critiques + moyennes"],
  ["LOW", "Toutes les anomalies"],
];

const stamp = (value: string) => new Date(value).toLocaleString("fr-FR");

/**
 * Convertit n'importe quelle réponse « liste » du serveur en tableau :
 * un tableau tel quel, { items | catalog | types | rows | list: [...] }, ou un objet indexé par code.
 * Évite l'erreur « x.map is not a function » si le format change.
 */
function toList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  if (value && typeof value === "object") {
    const box = value as Record<string, unknown>;

    for (const key of ["items", "catalog", "types", "rows", "list", "data"]) {
      if (Array.isArray(box[key])) return box[key] as T[];
    }

    const entries = Object.entries(box).filter(([, item]) => item && typeof item === "object");

    if (entries.length > 0 && entries.length === Object.keys(box).length) {
      return entries.map(([code, item]) => ({ code, ...(item as object) })) as T[];
    }
  }

  return [];
}

/* ------------------------------ Page ------------------------------ */

export default function AiAnomalyPage() {
  const [rows, setRows] = useState<Anomaly[]>([]);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [severity, setSeverity] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [actions, setActions] = useState<Record<string, AnomalyAction>>({});
  const [acting, setActing] = useState("");

  const [role, setRole] = useState("");
  const [minSeverity, setMinSeverity] = useState<Severity>("MEDIUM");
  const [busy, setBusy] = useState<"" | "notify" | "preview">("");
  const [result, setResult] = useState<NotifyResult | null>(null);

  const [history, setHistory] = useState<RunEntry[]>([]);
  const [config, setConfig] = useState<AlertConfig | null>(null);

  const [showCatalog, setShowCatalog] = useState(false);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogError, setCatalogError] = useState("");

  const canNotify = NOTIFY_ROLES.includes(role);

  const loadAnomalies = useCallback(async (fresh = false) => {
    try {
      const res = await api.get("/ai/anomalies", { params: fresh ? { fresh: 1 } : undefined });
      setRows(toList<Anomaly>(res.data?.data));
      setEngine((res.data?.engine ?? null) as Engine | null);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Analyse indisponible."));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get("/ai/anomalies/alerts");
      setHistory(toList<RunEntry>(res.data?.data));
      setConfig((res.data?.config ?? null) as AlertConfig | null);
    } catch {
      /* le suivi est facultatif : la page reste utilisable sans lui */
    }
  }, []);

  const loadActions = useCallback(async () => {
    try {
      const res = await api.get("/ai/anomalies/actions");
      const map: Record<string, AnomalyAction> = {};
      for (const item of toList<AnomalyAction>(res.data?.data)) map[item.key] = item;
      setActions(map);
    } catch {
      /* les actions sont facultatives : la liste reste affichée sans elles */
    }
  }, []);

  useEffect(() => {
    setRole(getStoredRole());
    void loadAnomalies();
    void loadHistory();
    void loadActions();
  }, [loadAnomalies, loadHistory, loadActions]);

  useEffect(() => {
    if (config) setMinSeverity(config.minSeverity);
  }, [config]);

  // Temps réel : une analyse automatique vient de se terminer -> on actualise la liste et le suivi
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onRun = (payload: { source?: string; notificationsSent?: number; digestsSent?: number; usersNotified?: number }) => {
      void loadAnomalies(true);
      void loadHistory();

      const total = (payload?.notificationsSent ?? 0) + (payload?.digestsSent ?? 0);
      if (payload?.source === "auto" && total > 0) {
        toast.info(`Nouvelles anomalies détectées : ${total} alerte(s) envoyée(s) à ${payload.usersNotified ?? 0} personne(s).`);
      }
    };

    // Un collègue vient d'agir sur une anomalie : on resynchronise les statuts
    const onAction = () => void loadActions();

    socket.on("anomaly:run", onRun);
    socket.on("anomaly:action", onAction);
    return () => {
      socket.off("anomaly:run", onRun);
      socket.off("anomaly:action", onAction);
    };
  }, [loadAnomalies, loadHistory, loadActions]);

  /** Enregistre une action (en cours / résolue / ignorée) sur une anomalie. */
  const act = async (a: Anomaly, status: ActionStatus, extra: { note?: string; snoozeDays?: number } = {}) => {
    if (!a.key) return;
    setActing(a.key);

    try {
      const res = await api.put("/ai/anomalies/actions", { key: a.key, type: a.type, title: a.title, status, ...extra });
      const saved = res.data?.data as AnomalyAction | undefined;
      setActions((current) => ({ ...current, [a.key as string]: { ...(saved as AnomalyAction), key: a.key as string, status } }));
      toast.success(status === "RESOLVED" ? "Anomalie marquée comme résolue." : status === "IGNORED" ? "Anomalie ignorée." : "Anomalie prise en charge.");
      void loadActions();
    } catch (err) {
      toast.error(errorMessage(err, "Action impossible pour le moment."));
    } finally {
      setActing("");
    }
  };

  const resolve = (a: Anomaly) => {
    const note = window.prompt("Note de résolution (facultatif) :", "");
    if (note === null) return; // annulé
    void act(a, "RESOLVED", { note: note.trim() || undefined });
  };

  const ignore = async (a: Anomaly, snoozeDays?: number) => {
    if (!snoozeDays) {
      const ok = await confirmDialog("Ignorer définitivement cette anomalie ? Elle ne sera plus notifiée.", {
        title: "Ignorer l'anomalie",
        confirmLabel: "Ignorer",
        danger: true,
      });
      if (!ok) return;
    }
    void act(a, "IGNORED", { snoozeDays });
  };

  const reopen = async (a: Anomaly) => {
    if (!a.key) return;
    setActing(a.key);

    try {
      await api.delete("/ai/anomalies/actions", { params: { key: a.key } });
      setActions((current) => {
        const next = { ...current };
        delete next[a.key as string];
        return next;
      });
      toast.info("Anomalie rouverte.");
    } catch (err) {
      toast.error(errorMessage(err, "Impossible de rouvrir l'anomalie."));
    } finally {
      setActing("");
    }
  };

  const openCatalog = async () => {
    const next = !showCatalog;
    setShowCatalog(next);

    if (next && catalog.length === 0) {
      try {
        const res = await api.get("/ai/anomalies/catalog");
        setCatalog(toList<CatalogItem>(res.data?.data));
        setCatalogError("");
      } catch (err) {
        setCatalogError(errorMessage(err, "Catalogue indisponible."));
      }
    }
  };

  const runNotify = async (dryRun: boolean) => {
    if (!dryRun) {
      const label = SEVERITY_CHOICES.find(([value]) => value === minSeverity)?.[1] ?? "";
      const ok = await confirmDialog(
        `Lancer l'analyse maintenant (${label.toLowerCase()}) et envoyer les alertes aux personnes et départements concernés ?`,
        { title: "Analyser et notifier", confirmLabel: "Analyser et notifier", danger: false },
      );
      if (!ok) return;
    }

    setBusy(dryRun ? "preview" : "notify");

    try {
      const res = await api.post("/ai/anomalies/notify", { minSeverity, dryRun });
      const data = res.data?.data as NotifyResult | undefined;

      if (!data) throw new Error("Réponse vide du serveur.");

      setResult(data);

      const total = data.notificationsSent + data.digestsSent;

      if (dryRun) {
        toast.info(`Aperçu : ${total} notification(s) seraient envoyées à ${data.usersNotified} personne(s).`);
      } else if (total === 0) {
        toast.info(
          data.duplicatesSkipped > 0
            ? `Rien de nouveau à envoyer : ${data.duplicatesSkipped} anomalie(s) déjà notifiée(s) récemment.`
            : "Aucune anomalie à notifier avec ce seuil.",
        );
        void loadHistory();
      } else {
        toast.success(`${total} notification(s) envoyée(s) à ${data.usersNotified} personne(s).`);
        void loadAnomalies(true);
        void loadHistory();
      }
    } catch (err) {
      toast.error(errorMessage(err, "Analyse impossible pour le moment."));
    } finally {
      setBusy("");
    }
  };

  const statusOf = (a: Anomaly): ActionStatus | "" => (a.key ? actions[a.key]?.status ?? "" : "");

  const matchesStatus = (a: Anomaly) => {
    const st = statusOf(a);
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return st === "" || st === "IN_PROGRESS";
    return st === statusFilter;
  };

  const filtered = rows.filter(
    (a) => (!severity || a.severity === severity) && (!sourceFilter || (a.source ?? "rules") === sourceFilter) && matchesStatus(a),
  );

  const statusCount = (value: string) =>
    value === "all" ? rows.length : rows.filter((a) => (value === "active" ? ["", "IN_PROGRESS"].includes(statusOf(a)) : statusOf(a) === value)).length;

  const countFor = (code: string) => rows.filter((a) => a.type === code).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <InsightHeader title="Détection d'anomalies" subtitle="Retards, dépassements de budget, objectifs en retard et scores atypiques." />

        <State loading={loading} error={error}>
          {engine && (
            <div className={`rounded-2xl border p-4 text-sm ${engine.used ? "border-green-200 bg-green-50 text-green-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
              <p className="font-semibold">
                {engine.used ? "Isolation Forest actif" : "Isolation Forest non utilisé — règles statistiques seulement"}
              </p>
              <p className="mt-1 text-xs">
                {engine.used
                  ? `Service IA joint en ${engine.latencyMs} ms · éléments analysés : ${Object.entries(engine.samples ?? {}).map(([k, n]) => `${k} ${n}`).join(", ")} · ${engine.flagged} anomalie(s) détectée(s) par le modèle · vérifié à ${new Date(engine.checkedAt).toLocaleTimeString("fr-FR")}`
                  : `Raison : ${engine.reason ?? "service IA indisponible"}. Démarrez le service Python et vérifiez AI_SERVICE_URL dans le .env du backend.`}
              </p>
            </div>
          )}

          {/* ---------------- Alertes : analyser et notifier + catalogue ---------------- */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                  <BellRing className="h-5 w-5 text-blue-800" /> Alertes aux personnes concernées
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Chaque anomalie (règles métier et Isolation Forest) est envoyée par notification au créateur du projet, au personnel du département concerné, au tuteur ou aux RH ;
                  la Direction est toujours prévenue des anomalies critiques. Une même anomalie n&apos;est pas renotifiée avant {config?.cooldownHours ?? 72} h.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void openCatalog()}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                <BookOpen className="h-4 w-4" />
                {showCatalog ? "Masquer les types d'anomalies" : "Voir tous les types d'anomalies"}
              </button>
            </div>

            {canNotify && (
              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4">
                <label className="text-sm font-medium text-gray-700">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Anomalies à envoyer</span>
                  <select
                    value={minSeverity}
                    onChange={(event) => setMinSeverity(event.target.value as Severity)}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  >
                    {SEVERITY_CHOICES.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  disabled={busy !== ""}
                  onClick={() => void runNotify(false)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
                >
                  {busy === "notify" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
                  {busy === "notify" ? "Analyse en cours..." : "Analyser et notifier maintenant"}
                </button>

                <button
                  type="button"
                  disabled={busy !== ""}
                  onClick={() => void runNotify(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Aperçu sans envoyer
                </button>
              </div>
            )}

            {/* Résultat de la dernière analyse lancée depuis cette page */}
            {result && (
              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-blue-900">
                    {result.dryRun ? "Aperçu (rien n'a été envoyé)" : "Analyse terminée"} — {stamp(result.ranAt)} · {result.durationMs} ms
                  </p>
                  <button type="button" onClick={() => setResult(null)} className="rounded-lg p-1 text-blue-700 hover:bg-blue-100" aria-label="Fermer">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    ["Anomalies analysées", result.analyzed],
                    ["Au-dessus du seuil", result.eligible],
                    [result.dryRun ? "Notifications prévues" : "Notifications envoyées", result.notificationsSent + result.digestsSent],
                    ["Personnes prévenues", result.usersNotified],
                    ["Doublons ignorés", result.duplicatesSkipped],
                  ].map(([label, value]) => (
                    <div key={label as string} className="rounded-xl bg-white p-3 text-center ring-1 ring-blue-100">
                      <p className="text-xl font-extrabold text-blue-900">{value}</p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>

                {result.preview.length > 0 && (
                  <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1 text-sm">
                    {result.preview.map((item, index) => (
                      <li key={`${item.title}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-blue-100">
                        <span className="min-w-0 truncate text-gray-800">{item.title}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-gray-500">{item.recipients} destinataire(s)</span>
                          <LevelBadge level={item.severity} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Suivi */}
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <History className="h-4 w-4 text-gray-500" /> Suivi des analyses
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {config
                  ? config.realtime
                    ? `Détection en temps réel active : chaque modification de données déclenche une analyse et les alertes partent aussitôt${config.auto ? ` (contrôle de sécurité toutes les ${config.everyMinutes} min)` : ""}. Seuil par défaut : ${SEVERITY_CHOICES.find(([v]) => v === config.minSeverity)?.[1].toLowerCase()}.`
                    : config.auto
                      ? `Analyse automatique active : toutes les ${config.everyMinutes} min (seuil par défaut : ${SEVERITY_CHOICES.find(([v]) => v === config.minSeverity)?.[1].toLowerCase()}).`
                      : "Analyse automatique désactivée : retirez ANOMALY_REALTIME=false ou définissez ANOMALY_MONITOR_MINUTES dans le .env du backend."
                  : "Suivi indisponible pour le moment."}
              </p>

              {history.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">Aucune analyse enregistrée pour l&apos;instant.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {history.slice(0, 5).map((entry) => (
                    <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-gray-800">
                        {stamp(entry.at)} · {entry.source === "auto" ? "automatique" : `par ${entry.triggeredByName ?? "un administrateur"}`}
                      </span>
                      <span className="text-xs text-gray-600">
                        {(entry.notificationsSent ?? 0) + (entry.digestsSent ?? 0)} notification(s) → {entry.usersNotified ?? 0} personne(s)
                        {" · "}
                        {entry.engineUsed ? "Isolation Forest" : "règles seules"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ---------------- Catalogue des types d'anomalies ---------------- */}
          {showCatalog && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-gray-900">Tous les types d&apos;anomalies détectés</h2>
                <button type="button" onClick={() => setShowCatalog(false)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Fermer le catalogue">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {catalogError && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{catalogError}</p>}
              {!catalogError && catalog.length === 0 && <p className="mt-3 text-sm text-gray-500">Chargement...</p>}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {catalog.map((item) => (
                  <article key={item.code} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-gray-900">{item.label}</h3>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          item.engine === "isolation-forest" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.engine === "isolation-forest" ? "IA · Isolation Forest" : "Règle métier"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{item.description}</p>
                    <p className="mt-2 text-xs text-gray-500"><strong className="text-gray-700">Gravité :</strong> {item.severityRule}</p>
                    <p className="mt-1 text-xs text-gray-500"><strong className="text-gray-700">Prévenus :</strong> {item.audienceLabel}</p>
                    <p className="mt-2 text-xs font-semibold text-blue-800">Détectées actuellement : {countFor(item.code)}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ---------------- Liste des anomalies ---------------- */}
          <div className="flex flex-wrap items-center gap-2">
            {[["", "Toutes"], ["HIGH", "Critiques"], ["MEDIUM", "Moyennes"], ["LOW", "Faibles"]].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSeverity(value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  severity === value ? "bg-blue-800 text-white" : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}

            <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:block" />

            {[["", "Toutes sources"], ["rules", "Règles"], ["isolation-forest", "IA"]].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSourceFilter(value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  sourceFilter === value ? "bg-indigo-700 text-white" : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}

            <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:block" />

            <select
              aria-label="Statut des anomalies"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="cursor-pointer rounded-full bg-white px-4 py-1.5 text-sm font-medium text-gray-700 outline-none ring-1 ring-gray-200 transition hover:bg-gray-50 focus:ring-blue-500"
            >
              {STATUS_FILTERS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label} ({statusCount(value)})
                </option>
              ))}
            </select>

            <span className="ml-auto text-sm text-gray-500">{filtered.length} anomalie(s)</span>
          </div>

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-green-300 bg-green-50 p-10 text-center text-green-800">
              Aucune anomalie détectée. 🎉
            </div>
          )}

          <div className="space-y-3">
            {filtered.map((a, index) => {
              const action = a.key ? actions[a.key] : undefined;
              const badge = action ? ACTION_BADGE[action.status] : null;
              const busyNow = !!a.key && acting === a.key;
              const done = action?.status === "RESOLVED" || action?.status === "IGNORED";
              const btn = "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:opacity-60";

              return (
                <div
                  key={`${a.key ?? a.type}-${index}`}
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition ${done ? "border-gray-200 opacity-75" : "border-gray-200 hover:border-blue-300"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {a.title}
                        {a.source === "isolation-forest" && (
                          <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">IA · score {a.score}</span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">{a.detail}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <LevelBadge level={a.severity} />
                      {badge && <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.className}`}>{badge.label}</span>}
                    </div>
                  </div>

                  {action && (action.note || action.userName) && (
                    <p className="mt-2 text-xs text-gray-500">
                      {action.userName ? `Par ${action.userName}` : ""}
                      {action.userName ? " · " : ""}
                      {stamp(action.updatedAt)}
                      {action.snoozedUntil ? ` · ignorée jusqu'au ${new Date(action.snoozedUntil).toLocaleDateString("fr-FR")}` : ""}
                      {action.note ? ` — ${action.note}` : ""}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                    <Link href={a.link} className={btn}>
                      <Eye className="h-3.5 w-3.5 text-blue-500" /> Voir
                    </Link>

                    {a.key && !done && action?.status !== "IN_PROGRESS" && (
                      <button type="button" disabled={busyNow} onClick={() => void act(a, "IN_PROGRESS")} className={btn}>
                        <PlayCircle className="h-3.5 w-3.5 text-amber-500" /> Prendre en charge
                      </button>
                    )}

                    {a.key && !done && (
                      <button type="button" disabled={busyNow} onClick={() => resolve(a)} className={btn}>
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Résolue
                      </button>
                    )}

                    {a.key && !done && (
                      <select
                        aria-label="Ignorer l'anomalie"
                        disabled={busyNow}
                        value=""
                        onChange={(event) => {
                          const value = event.target.value;
                          event.target.value = "";
                          if (value) void ignore(a, value === "forever" ? undefined : Number(value));
                        }}
                        className={`${btn} cursor-pointer bg-transparent`}
                      >
                        <option value="">Ignorer…</option>
                        <option value="7">pendant 7 jours</option>
                        <option value="30">pendant 30 jours</option>
                        <option value="forever">définitivement</option>
                      </select>
                    )}

                    {a.key && action && (
                      <button type="button" disabled={busyNow} onClick={() => void reopen(a)} className={btn}>
                        <RotateCcw className="h-3.5 w-3.5 text-gray-500" /> Rouvrir
                      </button>
                    )}

                    {busyNow && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                  </div>
                </div>
              );
            })}
          </div>
        </State>

        <p className="text-xs text-gray-400">
          {engine?.used
            ? "Les anomalies « IA » viennent d'un modèle Isolation Forest (non supervisé) qui compare chaque projet, jalon et activité aux autres ; les autres viennent de règles métier. Un score élevé signale un élément atypique, pas forcément une erreur."
            : METHOD_NOTE}
        </p>
      </div>
    </AppLayout>
  );
}
