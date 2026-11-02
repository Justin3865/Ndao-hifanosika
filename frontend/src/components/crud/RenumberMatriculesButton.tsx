"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { getStoredRole } from "@/lib/access";
import { confirmDialog, toast } from "@/lib/toast";

/** Remet tous les matricules en ordre (NH-2026-STG-0001, 0002, … sans trou) — ADMIN et RH. */
export function RenumberMatriculesButton() {
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setRole((getStoredRole() ?? "").toUpperCase()), []);

  if (!["ADMIN", "RH"].includes(role)) return null;

  const run = async () => {
    const ok = await confirmDialog(
      "Remettre les matricules en ordre (0001, 0002…) ? Les N° de certificats de stage suivront."
    );

    if (!ok) return;

    setBusy(true);

    try {
      const res = await api.post("/internships/matricules/renumber");
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
