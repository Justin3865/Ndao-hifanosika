"use client";

import { RotateCcw, Search } from "lucide-react";

import type { NotificationStatus } from "./NotificationItem";
import type { NotificationPriorityValue } from "./NotificationPriority";
import type { NotificationTypeValue } from "./NotificationType";

interface NotificationFiltersProps {
  search: string;
  type: NotificationTypeValue | "";
  priority: NotificationPriorityValue | "";
  status: NotificationStatus | "";
  onSearchChange: (value: string) => void;
  onTypeChange: (value: NotificationTypeValue | "") => void;
  onPriorityChange: (
    value: NotificationPriorityValue | ""
  ) => void;
  onStatusChange: (value: NotificationStatus | "") => void;
  onReset?: () => void;
}

export default function NotificationFilters({
  search,
  type,
  priority,
  status,
  onSearchChange,
  onTypeChange,
  onPriorityChange,
  onStatusChange,
  onReset,
}: NotificationFiltersProps) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une notification..."
            className="w-full rounded-lg border px-3 py-2.5 pl-9 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={type}
          onChange={(e) =>
            onTypeChange(
              e.target.value as NotificationTypeValue | ""
            )
          }
          className="rounded-lg border bg-white px-3 py-2.5 text-sm"
        >
          <option value="">Tous les types</option>
          <option value="system">Système</option>
          <option value="project">Projet</option>
          <option value="activity">Activité</option>
          <option value="evaluation">Évaluation</option>
          <option value="report">Rapport</option>
          <option value="internship">Stage</option>
          <option value="beneficiary">Bénéficiaire</option>
          <option value="user">Utilisateur</option>
          <option value="reminder">Rappel</option>
          <option value="ai">IA</option>
        </select>

        <select
          value={priority}
          onChange={(e) =>
            onPriorityChange(
              e.target.value as NotificationPriorityValue | ""
            )
          }
          className="rounded-lg border bg-white px-3 py-2.5 text-sm"
        >
          <option value="">Toutes les priorités</option>
          <option value="low">Faible</option>
          <option value="normal">Normale</option>
          <option value="high">Haute</option>
          <option value="urgent">Urgente</option>
        </select>

        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) =>
              onStatusChange(
                e.target.value as NotificationStatus | ""
              )
            }
            className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2.5 text-sm"
          >
            <option value="">Tous les statuts</option>
            <option value="unread">Non lu</option>
            <option value="read">Lu</option>
            <option value="archived">Archivé</option>
          </select>

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title="Réinitialiser"
              className="rounded-lg border p-2.5 hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}