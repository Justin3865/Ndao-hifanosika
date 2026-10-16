"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import api from "@/lib/axios";
import AppLayout from "@/components/layout/AppLayout";
import { useToast } from "@/components/ui/ToastProvider";
import { errorMessage } from "@/lib/crud";

interface Zone { id: number; name: string; region: string | null; latitude: number; longitude: number; altitude: number | null; active: boolean; _count?: { beneficiaries: number } }
const empty = { name: "", region: "", latitude: "", longitude: "", altitude: "" };

function ZonesContent() {
  const toast = useToast();
  const [zones, setZones] = useState<Zone[]>([]);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get("/zones").then((r) => setZones(r.data?.data ?? [])).catch((e) => toast.error(errorMessage(e, "Chargement impossible.")));
  }, [toast]);
  useEffect(load, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post("/zones", form);
      toast.success(res.data?.message ?? "Zone créée.");
      setForm(empty);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Création impossible."));
    } finally { setBusy(false); }
  }

  async function remove(z: Zone) {
    if (!window.confirm(`Supprimer la zone « ${z.name} » ?`)) return;
    try { await api.delete(`/zones/${z.id}`); toast.success("Zone supprimée."); load(); }
    catch (err) { toast.error(errorMessage(err, "Suppression impossible.")); }
  }

  const field = (key: keyof typeof empty, label: string, type = "text", required = false) => (
    <label className="block text-sm font-medium text-gray-700">{label}
      <input type={type} step="any" required={required} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-blue-500" />
    </label>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Zones d&apos;intervention</h1>
      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-5">
        {field("name", "Nom (ex. Tamatave)", "text", true)}
        {field("region", "Région")}
        {field("latitude", "Latitude", "number", true)}
        {field("longitude", "Longitude", "number", true)}
        {field("altitude", "Altitude (m)", "number")}
        <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60 md:col-span-5 md:w-fit">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ajouter la zone
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600"><tr>
            {["Zone", "Région", "Latitude", "Longitude", "Altitude", "Bénéficiaires", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium">{z.name}</td><td className="px-4 py-3">{z.region ?? "—"}</td>
                <td className="px-4 py-3">{z.latitude}</td><td className="px-4 py-3">{z.longitude}</td>
                <td className="px-4 py-3">{z.altitude != null ? `${z.altitude} m` : "—"}</td>
                <td className="px-4 py-3">{z._count?.beneficiaries ?? 0}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => remove(z)} aria-label="Supprimer" className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
            {zones.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Aucune zone enregistrée.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ZonesPage() {
  return <AppLayout><ZonesContent /></AppLayout>;
}
