"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  FileText,
  GraduationCap,
  Mail,
  Phone,
  X,
} from "lucide-react";
import {
  InternshipOffer,
  apiRequest,
  formatDate,
  getApiUrl,
  getStoredUser,
  goToAuth,
  isAdmin,
} from "@/lib/stages";

type Status = "PENDING" | "ACCEPTED" | "REJECTED";

type Application = {
  id: number;
  phone?: string | null;
  school?: string | null;
  level?: string | null;
  motivation: string;
  status: Status;
  createdAt: string;
  dossierNumber?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  applicantName?: string | null;
  applicantEmail?: string | null;
  files?: { id: number; fileName: string; fileSize: number }[];
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
};

const statusStyle: Record<Status, { label: string; className: string }> = {
  PENDING: {
    label: "En attente",
    className: "bg-[#1B8FAE]/10 text-[#1B8FAE] dark:bg-cyan-400/15 dark:text-cyan-300",
  },
  ACCEPTED: {
    label: "Acceptée",
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  REJECTED: {
    label: "Refusée",
    className: "bg-[#D01C7F]/10 text-[#D01C7F] dark:bg-pink-400/15 dark:text-pink-300",
  },
};

export default function CandidaturesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [allowed, setAllowed] = useState(false);
  const [offer, setOffer] = useState<InternshipOffer | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"ALL" | Status>("ALL");

  /* ROUTE ADMIN : connexion + rôle admin obligatoires */
  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      goToAuth(router, pathname, "login");
      return;
    }
    if (!isAdmin(user)) {
      router.replace("/stages");
      return;
    }
    setAllowed(true);
  }, [router, pathname]);

  useEffect(() => {
    if (!allowed || !id) return;

    (async () => {
      try {
        const [offerRes, appsRes] = await Promise.all([
          apiRequest(`/internship-offers/${id}`),
          apiRequest(`/internship-offers/${id}/applications`),
        ]);
        setOffer(offerRes.data ?? offerRes);
        setApplications(
          Array.isArray(appsRes) ? appsRes : appsRes.data ?? []
        );
      } catch (e: any) {
        if (e?.status === 401) {
          goToAuth(router, pathname, "login");
          return;
        }
        if (e?.status === 403) {
          router.replace("/stages");
          return;
        }
        setError(e?.message || "Impossible de charger les candidatures.");
      } finally {
        setLoading(false);
      }
    })();
  }, [allowed, id, router, pathname]);

  /** Ouvre le dossier joint (requête authentifiée -> blob) */
  const openFile = async (applicationId: number, fileId?: number) => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${getApiUrl()}/internship-offers/applications/${applicationId}/file${fileId ? `?fileId=${fileId}` : ""}`,
        {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (!response.ok) throw new Error("Impossible d'ouvrir le dossier.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      setError(e?.message || "Impossible d'ouvrir le dossier.");
    }
  };

  const changeStatus = async (applicationId: number, status: Status) => {
    setBusyId(applicationId);
    try {
      await apiRequest(`/internship-offers/applications/${applicationId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setApplications((list) =>
        list.map((a) => (a.id === applicationId ? { ...a, status } : a))
      );
    } catch (e: any) {
      setError(e?.message || "Impossible de modifier le statut.");
    } finally {
      setBusyId(null);
    }
  };

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Vérification de vos accès...
      </main>
    );
  }

  const shown =
    filter === "ALL"
      ? applications
      : applications.filter((a) => a.status === filter);

  const count = (s: Status) =>
    applications.filter((a) => a.status === s).length;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/stages"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#1F5FA0]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux stages
        </Link>

        <div className="mt-6 rounded-2xl bg-gradient-to-r from-[#1F5FA0] to-[#1B8FAE] p-6 text-white shadow">
          <p className="text-sm text-white/80">Candidatures pour</p>
          <h1 className="mt-1 text-2xl font-bold">
            {offer?.title || "Stage"}
          </h1>
          <p className="mt-2 text-sm text-white/90">
            {applications.length} candidature
            {applications.length > 1 ? "s" : ""} · {count("PENDING")} en
            attente · {count("ACCEPTED")} acceptée(s) · {count("REJECTED")}{" "}
            refusée(s)
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {(["ALL", "PENDING", "ACCEPTED", "REJECTED"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                filter === f
                  ? "bg-[#1F5FA0] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 dark:text-slate-100"
              }`}
            >
              {f === "ALL" ? "Toutes" : statusStyle[f].label}
            </button>
          ))}
        </div>

        {loading && (
          <p className="mt-10 text-center text-sm text-gray-500">
            Chargement...
          </p>
        )}

        {error && (
          <p className="mt-6 rounded-xl bg-[#D01C7F]/10 px-4 py-3 text-sm text-[#D01C7F]">
            {error}
          </p>
        )}

        {!loading && shown.length === 0 && !error && (
          <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            Aucune candidature à afficher.
          </div>
        )}

        <div className="mt-6 space-y-4">
          {shown.map((app) => {
            const name =
              app.applicantName?.trim() ||
              [app.user?.firstName, app.user?.lastName]
                .filter(Boolean)
                .join(" ") ||
              "Candidat";
            const contactEmail = app.applicantEmail || app.user?.email;
            const style = statusStyle[app.status];

            return (
              <article
                key={app.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{name}</h2>
                    <p className="text-xs text-gray-500 dark:text-slate-200">
                      Reçue le {formatDate(app.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}
                  >
                    {style.label}
                  </span>
                </div>

                <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-slate-100">
                  {contactEmail && (
                    <li className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#1B8FAE]" />
                      <a
                        href={`mailto:${contactEmail}`}
                        className="underline-offset-2 hover:text-[#1B8FAE] hover:underline"
                      >
                        {contactEmail}
                      </a>
                    </li>
                  )}
                  {app.phone && (
                    <li className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-[#1B8FAE]" />
                      <a
                        href={`tel:${app.phone.replace(/[^\d+]/g, "")}`}
                        className="underline-offset-2 hover:text-[#1B8FAE] hover:underline"
                      >
                        {app.phone}
                      </a>
                    </li>
                  )}
                  {(app.school || app.level) && (
                    <li className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-[#1B8FAE]" />
                      {[app.school, app.level].filter(Boolean).join(" · ")}
                    </li>
                  )}
                </ul>

                <p className="mt-4 whitespace-pre-line rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700 dark:text-white">
                  {app.motivation}
                </p>

                {(app.dossierNumber || app.fileName || (app.files && app.files.length > 0)) && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-slate-100">
                    {app.dossierNumber && (
                      <span>
                        N° dossier :{" "}
                        <span className="select-all font-mono font-semibold text-[#1F5FA0] dark:text-sky-300">
                          {app.dossierNumber}
                        </span>
                      </span>
                    )}
                    {app.files && app.files.length > 0
                      ? app.files.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => openFile(app.id, f.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 dark:text-white"
                          >
                            <FileText className="h-4 w-4 text-[#1B8FAE]" />
                            {f.fileName}
                          </button>
                        ))
                      : null}
                    {(!app.files || app.files.length === 0) && app.fileName && (
                      <button
                        type="button"
                        onClick={() => openFile(app.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 dark:text-white"
                      >
                        <FileText className="h-4 w-4 text-[#1B8FAE]" />
                        {app.fileName}
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busyId === app.id || app.status === "ACCEPTED"}
                    onClick={() => changeStatus(app.id, "ACCEPTED")}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1B8FAE] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#167892] disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Accepter
                  </button>
                  <button
                    type="button"
                    disabled={busyId === app.id || app.status === "REJECTED"}
                    onClick={() => changeStatus(app.id, "REJECTED")}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#D01C7F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#b3176c] disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Refuser
                  </button>
                  {app.status !== "PENDING" && (
                    <button
                      type="button"
                      disabled={busyId === app.id}
                      onClick={() => changeStatus(app.id, "PENDING")}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Remettre en attente
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}