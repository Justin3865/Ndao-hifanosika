"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { errorMessage } from "@/lib/crud";
import { toast } from "@/lib/toast";

interface InternshipOption {
  id: number;
  title: string;
  status: string;
  student?: { firstName: string; lastName: string };
}

const TYPES = [
  { value: "INTERNSHIP", label: "Stage terminé (données lues dans le stage)" },
  { value: "VOLUNTEER", label: "Bénévolat" },
  { value: "STAFF", label: "Mission / emploi à l'ONG" },
  { value: "TRAINING", label: "Formation suivie" },
];

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

export default function CreateCertificatePage() {
  const router = useRouter();
  const [type, setType] = useState("INTERNSHIP");
  const [internships, setInternships] = useState<InternshipOption[]>([]);
  const [internshipId, setInternshipId] = useState("");
  const [form, setForm] = useState({ holderName: "", holderEmail: "", title: "", description: "", startDate: "", endDate: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get("/internships")
      .then((res) =>
        setInternships((res.data?.data ?? []).filter((i: InternshipOption) => i.status === "COMPLETED"))
      )
      .catch(() => setInternships([]));

    const preset = new URLSearchParams(window.location.search).get("internshipId");
    if (preset) setInternshipId(preset);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const payload =
        type === "INTERNSHIP"
          ? { type, internshipId: Number(internshipId), title: form.title || undefined, description: form.description || undefined }
          : { type, ...form };

      const res = await api.post("/certificates", payload);
      toast.success("Certificat délivré. Le titulaire a été prévenu.");
      router.push(`/certificates/${res.data.data.id}`);
    } catch (err) {
      setError(errorMessage(err, "Délivrance impossible."));
    } finally {
      setBusy(false);
    }
  };

  const set = (key: string, value: string) => setForm((cur) => ({ ...cur, [key]: value }));

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Délivrer un certificat</h1>

        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <label className="block space-y-1 text-sm font-medium text-gray-700">
            Type de certificat
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>

          {type === "INTERNSHIP" ? (
            <label className="block space-y-1 text-sm font-medium text-gray-700">
              Stage terminé
              <select className={inputClass} value={internshipId} onChange={(e) => setInternshipId(e.target.value)} required>
                <option value="">Sélectionner un stage</option>
                {internships.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.student ? `${i.student.firstName} ${i.student.lastName} — ` : ""}{i.title}
                  </option>
                ))}
              </select>
              {internships.length === 0 && <span className="text-xs text-amber-700">Aucun stage « Terminé » disponible.</span>}
            </label>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-gray-700">
                Nom complet du titulaire *
                <input className={inputClass} value={form.holderName} onChange={(e) => set("holderName", e.target.value)} required />
              </label>
              <label className="space-y-1 text-sm font-medium text-gray-700">
                Email du titulaire (pour l&apos;envoi)
                <input type="email" className={inputClass} value={form.holderEmail} onChange={(e) => set("holderEmail", e.target.value)} />
              </label>
              <label className="space-y-1 text-sm font-medium text-gray-700 md:col-span-2">
                Intitulé *
                <input className={inputClass} placeholder="Ex. Bénévole animateur — Maison Digitale" value={form.title} onChange={(e) => set("title", e.target.value)} required />
              </label>
              <label className="space-y-1 text-sm font-medium text-gray-700">
                Début
                <input type="date" className={inputClass} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </label>
              <label className="space-y-1 text-sm font-medium text-gray-700">
                Fin
                <input type="date" className={inputClass} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
              </label>
            </div>
          )}

          <label className="block space-y-1 text-sm font-medium text-gray-700">
            Mention complémentaire (optionnel)
            <textarea rows={3} className={inputClass} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </label>

          <div className="flex justify-end">
            <button type="submit" disabled={busy} className="rounded-xl bg-blue-800 px-6 py-3 font-medium text-white hover:bg-blue-900 disabled:opacity-60">
              {busy ? "Délivrance..." : "Délivrer le certificat"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
