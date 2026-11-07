"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { getStoredRole } from "@/lib/access";
import { confirmDialog, toast } from "@/lib/toast";

/** Remet les matricules des projets ou des bénéficiaires en ordre (0001, 0002, …) — ADMIN. */
export function RenumberEntityButton({ endpoint }: { endpoint: "/projects" | "/beneficiaries" | "/tracking/missions" }) {
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setRole((getStoredRole() ?? "").toUpperCase()), []);

  if (role !== "ADMIN") return null;

  const run = async () => {
    const ok = await confirmDialog("Remettre tous les matricules en ordre (0001, 0002…) selon la date de création ?");

    if (!ok) return;

    setBusy(true);

    try {
      const res = await api.post(`${endpoint}/renumber`);
      toast.success(res.data?.message ?? "Matricules remis en ordre.");
      window.location.reload();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Action impossible.");
      setBusy(false);
    }
  };

  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        {busy ? "Réordonnancement..." : "Remettre les matricules en ordre"}
      </button>
    </div>
  );
}
