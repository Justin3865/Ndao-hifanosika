"use client";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface NotificationPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function NotificationPagination({
  page,
  totalPages,
  onPageChange,
}: NotificationPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">
      <p className="text-sm text-gray-500">
        Page {page} sur {totalPages}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border p-2 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border p-2 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}