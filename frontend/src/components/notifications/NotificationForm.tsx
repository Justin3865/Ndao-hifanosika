"use client";

import { FormEvent, useState } from "react";
import { Bell, Save, X } from "lucide-react";

import type { Notification } from "./NotificationItem";
import type { NotificationPriorityValue } from "./NotificationPriority";
import type { NotificationTypeValue } from "./NotificationType";

export interface NotificationFormData {
  title: string;
  message: string;
  type: NotificationTypeValue;
  priority: NotificationPriorityValue;
  userId: string;
  projectId: string;
  actionUrl: string;
  actionLabel: string;
}

interface NotificationFormProps {
  initialData?: Partial<Notification>;
  onSubmit: (
    data: NotificationFormData
  ) => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export default function NotificationForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}: NotificationFormProps) {
  const [title, setTitle] = useState(
    initialData?.title ?? ""
  );

  const [message, setMessage] = useState(
    initialData?.message ?? ""
  );

  const [type, setType] = useState<NotificationTypeValue>(
    initialData?.type ?? "system"
  );

  const [priority, setPriority] =
    useState<NotificationPriorityValue>(
      initialData?.priority ?? "normal"
    );

  const [userId, setUserId] = useState(
    initialData?.userId ?? ""
  );

  const [projectId, setProjectId] = useState(
    initialData?.projectId ?? ""
  );

  const [actionUrl, setActionUrl] = useState(
    initialData?.actionUrl ?? ""
  );

  const [actionLabel, setActionLabel] = useState(
    initialData?.actionLabel ?? ""
  );

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!title.trim()) {
      alert("Le titre est obligatoire.");
      return;
    }

    if (!message.trim()) {
      alert("Le message est obligatoire.");
      return;
    }

    await onSubmit({
      title,
      message,
      type,
      priority,
      userId,
      projectId,
      actionUrl,
      actionLabel,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border bg-white p-6 shadow-sm"
    >
      <div className="flex items-center gap-3 border-b pb-5">
        <div className="rounded-lg bg-blue-50 p-3">
          <Bell className="h-5 w-5 text-blue-600" />
        </div>

        <div>
          <h2 className="text-xl font-bold">
            {initialData?.id
              ? "Modifier la notification"
              : "Créer une notification"}
          </h2>

          <p className="text-sm text-gray-500">
            Envoyer une information, un rappel ou une alerte.
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">
            Titre *
          </label>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Rapport trimestriel à valider"
            className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Type
          </label>

          <select
            value={type}
            onChange={(e) =>
              setType(
                e.target.value as NotificationTypeValue
              )
            }
            className="w-full rounded-lg border bg-white px-3 py-2.5"
          >
            <option value="system">Système</option>
            <option value="project">Projet</option>
            <option value="activity">Activité</option>
            <option value="evaluation">Évaluation</option>
            <option value="report">Rapport</option>
            <option value="internship">Stage</option>
            <option value="beneficiary">
              Bénéficiaire
            </option>
            <option value="user">Utilisateur</option>
            <option value="reminder">Rappel</option>
            <option value="ai">IA</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Priorité
          </label>

          <select
            value={priority}
            onChange={(e) =>
              setPriority(
                e.target.value as NotificationPriorityValue
              )
            }
            className="w-full rounded-lg border bg-white px-3 py-2.5"
          >
            <option value="low">Faible</option>
            <option value="normal">Normale</option>
            <option value="high">Haute</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Destinataire
          </label>

          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="ID utilisateur"
            className="w-full rounded-lg border px-3 py-2.5"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Projet associé
          </label>

          <input
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="ID projet"
            className="w-full rounded-lg border px-3 py-2.5"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">
            Message *
          </label>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Contenu de la notification..."
            className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            URL d'action
          </label>

          <input
            value={actionUrl}
            onChange={(e) => setActionUrl(e.target.value)}
            placeholder="/reports/123"
            className="w-full rounded-lg border px-3 py-2.5"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Libellé du bouton
          </label>

          <input
            value={actionLabel}
            onChange={(e) => setActionLabel(e.target.value)}
            placeholder="Voir le rapport"
            className="w-full rounded-lg border px-3 py-2.5"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            Annuler
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}