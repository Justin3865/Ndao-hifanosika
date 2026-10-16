"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { errorMessage, fmtDateTime } from "@/lib/crud";
import { roleLabel, statusLabel } from "@/lib/roles";

interface Profile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  avatarUrl?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
  department?: { id: number; name: string } | null;
}

/** Recadre au carré et réduit à 256 px (JPEG) avant l'envoi. */
async function resizeImage(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.getContext("2d")?.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", 0.82);
}

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

export default function ProfilePage() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState("");

  const sync = (data: Profile) => {
    setProfile(data);
    setForm({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? "",
    });

    // Met à jour la session locale + l'en-tête
    try {
      const stored = JSON.parse(localStorage.getItem("user") ?? "{}");
      localStorage.setItem(
        "user",
        JSON.stringify({ ...stored, firstName: data.firstName, lastName: data.lastName })
      );
    } catch {
      /* ignore */
    }

    window.dispatchEvent(new Event("profile:updated"));
  };

  useEffect(() => {
    api
      .get("/profile")
      .then((res) => {
        const data = res.data?.data as Profile;
        setProfile(data);
        setForm({ firstName: data.firstName, lastName: data.lastName, phone: data.phone ?? "" });
      })
      .catch((err) => setMessage({ type: "err", text: errorMessage(err, "Profil introuvable.") }))
      .finally(() => setLoading(false));
  }, []);

  const flash = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 5000);
  };

  const saveInfo = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("info");

    try {
      const res = await api.put("/profile", form);
      sync(res.data.data);
      flash("ok", "Informations enregistrées.");
    } catch (err) {
      flash("err", errorMessage(err, "Enregistrement impossible."));
    } finally {
      setBusy("");
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();

    if (pwd.newPassword !== pwd.confirm) {
      flash("err", "Les mots de passe ne correspondent pas.");
      return;
    }

    setBusy("pwd");

    try {
      await api.put("/profile/password", {
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      setPwd({ currentPassword: "", newPassword: "", confirm: "" });
      flash("ok", "Mot de passe modifié.");
    } catch (err) {
      flash("err", errorMessage(err, "Modification impossible."));
    } finally {
      setBusy("");
    }
  };

  const pickAvatar = async (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      flash("err", "Veuillez choisir une image.");
      return;
    }

    setBusy("avatar");

    try {
      const avatar = await resizeImage(file);
      const res = await api.put("/profile/avatar", { avatar });
      sync(res.data.data);
      flash("ok", "Photo de profil mise à jour.");
    } catch (err) {
      flash("err", errorMessage(err, "Photo non enregistrée."));
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAvatar = async () => {
    setBusy("avatar");

    try {
      await api.delete("/profile/avatar");
      if (profile) sync({ ...profile, avatarUrl: null });
      flash("ok", "Photo supprimée.");
    } catch (err) {
      flash("err", errorMessage(err, "Suppression impossible."));
    } finally {
      setBusy("");
    }
  };

  const initials = profile
    ? `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase()
    : "?";

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
          <p className="text-sm text-gray-500">Gérez vos informations personnelles et votre sécurité.</p>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
              message.type === "ok"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.type === "ok" && <CheckCircle2 className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        {loading && <p className="text-gray-500">Chargement...</p>}

        {profile && (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* ---- Carte identité ---- */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="h-24 bg-gradient-to-r from-blue-900 to-blue-600" />

              <div className="-mt-14 px-6 pb-6 text-center">
                <div className="relative mx-auto h-28 w-28">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatarUrl}
                      alt="Photo de profil"
                      className="h-28 w-28 rounded-full object-cover ring-4 ring-white"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-900 text-3xl font-bold text-white ring-4 ring-white">
                      {initials}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy === "avatar"}
                    className="absolute bottom-0 right-0 rounded-full bg-amber-400 p-2.5 text-blue-950 shadow-lg transition hover:bg-amber-300"
                    aria-label="Changer la photo"
                  >
                    {busy === "avatar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </button>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => pickAvatar(e.target.files?.[0])}
                  />
                </div>

                <h2 className="mt-4 text-xl font-bold text-gray-900">
                  {profile.firstName} {profile.lastName}
                </h2>
                <p className="text-sm text-gray-500">{profile.email}</p>

                <span className="mt-3 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                  {roleLabel(profile.role)}
                </span>

                {profile.avatarUrl && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="mx-auto mt-4 flex items-center gap-2 text-sm text-red-600 hover:underline"
                  >
                    <Trash2 className="h-4 w-4" /> Supprimer la photo
                  </button>
                )}

                <dl className="mt-6 space-y-3 border-t border-gray-100 pt-5 text-left text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Département</dt>
                    <dd className="font-medium text-gray-900">{profile.department?.name ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Statut</dt>
                    <dd className="font-medium text-gray-900">{statusLabel(profile.status)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Dernière connexion</dt>
                    <dd className="font-medium text-gray-900">{fmtDateTime(profile.lastLoginAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Membre depuis</dt>
                    <dd className="font-medium text-gray-900">{fmtDateTime(profile.createdAt)}</dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* ---- Formulaires ---- */}
            <div className="space-y-6">
              <form onSubmit={saveInfo} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">Informations personnelles</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium text-gray-700">
                    Prénom
                    <input className={inputClass} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-gray-700">
                    Nom
                    <input className={inputClass} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-gray-700">
                    Email
                    <input className={`${inputClass} bg-gray-50 text-gray-500`} value={profile.email} disabled />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-gray-700">
                    Téléphone
                    <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={busy === "info"}
                    className="rounded-xl bg-blue-700 px-6 py-3 font-medium text-white transition hover:bg-blue-800 disabled:opacity-60"
                  >
                    {busy === "info" ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </form>

              <form onSubmit={savePassword} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">Changer le mot de passe</h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-1 text-sm font-medium text-gray-700">
                    Mot de passe actuel
                    <input type="password" className={inputClass} value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-gray-700">
                    Nouveau (8 car. min.)
                    <input type="password" className={inputClass} value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-gray-700">
                    Confirmation
                    <input type="password" className={inputClass} value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={busy === "pwd"}
                    className="rounded-xl bg-blue-700 px-6 py-3 font-medium text-white transition hover:bg-blue-800 disabled:opacity-60"
                  >
                    {busy === "pwd" ? "Modification..." : "Modifier le mot de passe"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
