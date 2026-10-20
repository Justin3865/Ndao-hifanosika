"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  GraduationCap,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout";
import {
  InternshipOffer,
  StoredUser,
  apiRequest,
  canManageOffers,
  formatDate,
  getStoredUser,
  isClosed,
} from "@/lib/stages";

const emptyForm = {
  title: "",
  domain: "",
  location: "",
  duration: "",
  deadline: "",
  places: "",
  description: "",
};

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1B8FAE] focus:ring-2 focus:ring-[#1B8FAE]/20";

const labelClass =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500";

export default function StagesPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [offers, setOffers] = useState<InternshipOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState<number | string | null>(null);

  /** true pour ADMIN / RH / COORDINATOR : ils peuvent publier et gérer les offres */
  const manager = canManageOffers(user);

  const loadOffers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/internship-offers");
      setOffers(Array.isArray(data) ? data : data.data ?? []);
    } catch (e: any) {
      setError(
        e?.message || "Impossible de charger les offres de stage pour le moment."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
    loadOffers();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (offer: InternshipOffer) => {
    setEditingId(offer.id);
    setForm({
      title: offer.title ?? "",
      domain: offer.domain ?? "",
      location: offer.location ?? "",
      duration: offer.duration ?? "",
      deadline: offer.deadline ? String(offer.deadline).slice(0, 10) : "",
      places: offer.places ? String(offer.places) : "",
      description: offer.description ?? "",
    });
    setFormError("");
    setShowForm(true);
  };

  /* Lien du menu « Nouvelle offre » : /stages?nouvelle=1 ouvre directement le formulaire */
  useEffect(() => {
    if (!mounted || !manager) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("nouvelle") === "1") {
      openNew();
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [mounted, manager]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return offers;
    return offers.filter((o) =>
      [o.title, o.domain, o.location, o.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [offers, search]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!form.title.trim() || !form.description.trim()) {
      setFormError("Le titre et la description sont obligatoires.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest(
        editingId ? `/internship-offers/${editingId}` : "/internship-offers",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify({
            title: form.title.trim(),
            domain: form.domain.trim() || null,
            location: form.location.trim() || null,
            duration: form.duration.trim() || null,
            deadline: form.deadline || null,
            places: form.places ? Number(form.places) : null,
            description: form.description.trim(),
          }),
        }
      );
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadOffers();
    } catch (e: any) {
      setFormError(
        e?.status === 403
          ? "Votre rôle ne permet pas de publier des offres."
          : e?.message || "Impossible d'enregistrer ce stage."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (offer: InternshipOffer) => {
    if (!window.confirm(`Retirer l'offre « ${offer.title} » ?`)) return;
    setBusyId(offer.id);
    try {
      await apiRequest(`/internship-offers/${offer.id}`, { method: "DELETE" });
      setOffers((list) => list.filter((o) => o.id !== offer.id));
    } catch (e: any) {
      setError(e?.message || "Impossible de retirer cette offre.");
    } finally {
      setBusyId(null);
    }
  };

  if (!mounted) return null;

  /* ---------------- Contenu commun (public + espace de gestion) ---------------- */
  const body = (
    <>
      {/* TITRE */}
      <section
        className={`bg-gradient-to-r from-[#1F5FA0] to-[#1B8FAE] ${
          manager ? "rounded-2xl" : ""
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
          <div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              {manager ? "Offres de stage" : "Stages disponibles"}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/90">
              {manager
                ? "Publiez les offres, suivez les candidatures et retirez les offres terminées."
                : "Découvrez les offres de stage proposées par Ndao Hifanosika et postulez en quelques clics."}
            </p>
          </div>

          {manager && (
            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#1F5FA0] shadow-lg transition hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              Nouvelle offre
            </button>
          )}
        </div>
      </section>

      {/* LISTE */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un stage, un domaine, un lieu..."
            className={`${inputClass} pl-10`}
          />
        </div>

        {loading && (
          <p className="mt-10 text-center text-sm text-gray-500">
            Chargement des offres...
          </p>
        )}

        {!loading && error && (
          <div className="mt-10 rounded-2xl border border-[#D01C7F]/30 bg-[#D01C7F]/5 p-6 text-center text-sm text-[#D01C7F]">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <GraduationCap className="mx-auto h-10 w-10 text-[#1B8FAE]" />
            <p className="mt-3 font-semibold">
              Aucun stage disponible pour le moment
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {manager
                ? "Publiez votre première offre avec le bouton « Nouvelle offre »."
                : "Revenez bientôt : de nouvelles offres seront publiées."}
            </p>
            {manager && (
              <button
                type="button"
                onClick={openNew}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1F5FA0] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#194d82]"
              >
                <Plus className="h-4 w-4" />
                Nouvelle offre
              </button>
            )}
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((offer) => {
            const closed = isClosed(offer);

            return (
              <article
                key={offer.id}
                className="flex flex-col rounded-2xl border border-[#1B8FAE]/20 bg-white p-6 shadow-sm transition hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold leading-snug">
                    {offer.title}
                  </h2>
                  {closed && (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
                      Clôturé
                    </span>
                  )}
                </div>

                {offer.domain && (
                  <span className="mt-2 inline-block w-fit rounded-full bg-[#1F5FA0]/10 px-2.5 py-1 text-xs font-semibold text-[#1F5FA0]">
                    {offer.domain}
                  </span>
                )}

                <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-600">
                  {offer.description}
                </p>

                <ul className="mt-4 space-y-2 text-sm text-gray-500">
                  {offer.location && (
                    <li className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#1B8FAE]" />
                      {offer.location}
                    </li>
                  )}
                  {offer.duration && (
                    <li className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#1B8FAE]" />
                      {offer.duration}
                    </li>
                  )}
                  {offer.places ? (
                    <li className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#1B8FAE]" />
                      {offer.places} place{offer.places > 1 ? "s" : ""}
                    </li>
                  ) : null}
                  {offer.deadline && (
                    <li className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#D01C7F]" />
                      Date limite : {formatDate(offer.deadline)}
                    </li>
                  )}
                </ul>

                <div className="mt-6 flex-1" />

                {manager && (
                  <div className="mb-3 grid grid-cols-[1fr_auto_auto] gap-2">
                    <Link
                      href={`/stages/${offer.id}/candidatures`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1F5FA0] px-4 py-2.5 text-sm font-semibold text-[#1F5FA0] transition hover:bg-[#1F5FA0]/5"
                    >
                      <Users className="h-4 w-4" />
                      Candidatures
                    </Link>
                    <button
                      type="button"
                      onClick={() => openEdit(offer)}
                      aria-label="Modifier l'offre"
                      title="Modifier"
                      className="rounded-xl border border-gray-300 px-3 text-gray-600 transition hover:bg-gray-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(offer)}
                      disabled={busyId === offer.id}
                      aria-label="Retirer l'offre"
                      title="Retirer"
                      className="rounded-xl border border-[#D01C7F]/40 px-3 text-[#D01C7F] transition hover:bg-[#D01C7F]/5 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {closed ? (
                  <button
                    type="button"
                    disabled
                    className="w-full cursor-not-allowed rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-400"
                  >
                    Candidatures fermées
                  </button>
                ) : (
                  <Link
                    href={`/stages/${offer.id}/postuler`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D01C7F] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#b3176c]"
                  >
                    Postuler
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* MODAL AJOUT / MODIFICATION (rôles autorisés uniquement) */}
      {showForm && manager && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-6"
        >
          <form
            onSubmit={handleSave}
            className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingId ? "Modifier l'offre" : "Nouvelle offre de stage"}
              </h2>
              <button
                type="button"
                onClick={() => !saving && setShowForm(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className={labelClass}>Titre du stage *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex : Stagiaire en suivi & évaluation"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Domaine</label>
                  <input
                    value={form.domain}
                    onChange={(e) => setForm({ ...form, domain: e.target.value })}
                    placeholder="Ex : Informatique"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Lieu</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Ex : Fianarantsoa"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Durée</label>
                  <input
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    placeholder="Ex : 3 mois"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Nombre de places</label>
                  <input
                    type="number"
                    min={1}
                    value={form.places}
                    onChange={(e) => setForm({ ...form, places: e.target.value })}
                    placeholder="Ex : 2"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Date limite de candidature</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Description courte *</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Missions, profil recherché..."
                  className={inputClass}
                />
              </div>

              {formError && (
                <p className="rounded-xl bg-[#D01C7F]/10 px-4 py-3 text-sm text-[#D01C7F]">
                  {formError}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#1F5FA0] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#194d82] disabled:opacity-60"
              >
                {saving
                  ? "Enregistrement..."
                  : editingId
                  ? "Enregistrer les modifications"
                  : "Publier l'offre"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );

  /* Équipe de gestion : on garde le menu et l'en-tête de l'application */
  if (manager) {
    return <AppLayout>{body}</AppLayout>;
  }

  /* Visiteurs / candidats : page publique */
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logos/ndao-hifanosika.png"
              alt="Ndao Hifanosika"
              width={48}
              height={48}
              priority
              className="h-12 w-auto object-contain"
            />
            <div>
              <p className="text-lg font-bold leading-tight">Ndao Hifanosika</p>
              <p className="text-xs text-gray-500">Offres de stage</p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#1F5FA0]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      {body}
    </main>
  );
}
