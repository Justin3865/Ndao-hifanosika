"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bell, CheckCheck, Plus, Trash2 } from "lucide-react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { getStoredRole } from "@/lib/access";
import {
  LookupItem,
  errorMessage,
  fetchLookup,
  fmtDateTime,
} from "@/lib/crud";

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  INFO: "bg-blue-100 text-blue-700",
  SUCCESS: "bg-green-100 text-green-700",
  WARNING: "bg-yellow-100 text-yellow-700",
  ERROR: "bg-red-100 text-red-700",
};

const SENDERS = ["ADMIN", "DIRECTION", "DSI", "RH"];
const DELETERS = ["ADMIN", "DSI", "RH"];

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState<LookupItem[]>([]);
  const [form, setForm] = useState({ userId: "", title: "", message: "", type: "INFO" });
  const [formError, setFormError] = useState("");

  const load = () =>
    api
      .get("/notifications")
      .then((res) => setItems(res.data?.data ?? []))
      .catch((err) => setError(errorMessage(err, "Impossible de charger les notifications.")))
      .finally(() => setLoading(false));

  useEffect(() => {
    const current = getStoredRole();
    setRole(current);
    load();

    if (SENDERS.includes(current)) {
      fetchLookup("users").then(setUsers).catch(() => setUsers([]));
    }
  }, []);

  const unread = items.filter((item) => !item.read).length;

  const markRead = async (item: NotificationItem) => {
    if (item.read) return;

    try {
      await api.patch(`/notifications/${item.id}/read`);
      setItems((cur) => cur.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    } catch (err) {
      setError(errorMessage(err, "Action impossible."));
    }
  };

  const markAll = async () => {
    try {
      await api.patch("/notifications/read-all");
      setItems((cur) => cur.map((n) => ({ ...n, read: true })));
    } catch (err) {
      setError(errorMessage(err, "Action impossible."));
    }
  };

  const remove = async (item: NotificationItem) => {
    if (!window.confirm("Supprimer cette notification ?")) return;

    try {
      await api.delete(`/notifications/${item.id}`);
      setItems((cur) => cur.filter((n) => n.id !== item.id));
    } catch (err) {
      setError(errorMessage(err, "Suppression impossible."));
    }
  };

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!form.userId || !form.title.trim() || !form.message.trim()) {
      setFormError("Destinataire, titre et message sont obligatoires.");
      return;
    }

    try {
      await api.post("/notifications", { ...form, userId: Number(form.userId) });
      setForm({ userId: "", title: "", message: "", type: "INFO" });
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(errorMessage(err, "Envoi impossible."));
    }
  };

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500";

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">{unread} non lue(s)</p>
          </div>

          <div className="flex gap-2">
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
              </button>
            )}

            {SENDERS.includes(role) && (
              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> Envoyer
              </button>
            )}
          </div>
        </div>

        {showForm && (
          <form onSubmit={send} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="grid gap-3 md:grid-cols-2">
              <select className={inputClass} value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                <option value="">Destinataire</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.label}</option>
                ))}
              </select>

              <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {["INFO", "SUCCESS", "WARNING", "ERROR"].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <input className={inputClass} placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className={inputClass} rows={3} placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />

            <div className="flex justify-end">
              <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                Envoyer la notification
              </button>
            </div>
          </form>
        )}

        {loading && <p className="text-gray-500">Chargement...</p>}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {!loading && items.length === 0 && !error && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            <Bell className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            Aucune notification.
          </div>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => markRead(item)}
              className={`flex cursor-pointer items-start justify-between gap-4 rounded-2xl border p-4 shadow-sm transition ${
                item.read ? "border-gray-200 bg-white" : "border-blue-200 bg-blue-50"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[item.type] ?? "bg-gray-100 text-gray-700"}`}>
                    {item.type}
                  </span>
                  <h2 className="font-semibold text-gray-900">{item.title}</h2>
                  {!item.read && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                </div>
                <p className="text-sm text-gray-600">{item.message}</p>
                <p className="text-xs text-gray-400">{fmtDateTime(item.createdAt)}</p>
              </div>

              {DELETERS.includes(role) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(item);
                  }}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
