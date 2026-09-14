"use client";

interface InternshipPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function InternshipPagination({
  currentPage,
  totalPages,
  onPageChange,
}: InternshipPaginationProps) {
  return (
    <div className="flex items-center justify-between border-t bg-white px-5 py-4">
      <button
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
      >
        ← Précédent
      </button>

      <span className="text-sm text-gray-600">
        Page {currentPage} sur {totalPages}
      </span>

      <button
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
      >
        Suivant →
      </button>
    </div>
  );
}