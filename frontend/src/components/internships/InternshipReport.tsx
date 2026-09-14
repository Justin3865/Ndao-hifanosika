"use client";

interface InternshipReportProps {
  title: string;
  submittedAt?: string;
  status: "draft" | "submitted" | "validated" | "rejected";
  comment?: string;
}

export default function InternshipReport({
  title,
  submittedAt,
  status,
  comment,
}: InternshipReportProps) {
  const statusConfig = {
    draft: "Brouillon",
    submitted: "Soumis",
    validated: "Validé",
    rejected: "Rejeté",
  };

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">
            {title}
          </h3>

          {submittedAt && (
            <p className="mt-1 text-sm text-gray-500">
              Soumis le {submittedAt}
            </p>
          )}
        </div>

        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs">
          {statusConfig[status]}
        </span>
      </div>

      {comment && (
        <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          {comment}
        </div>
      )}

      <div className="mt-4">
        <button className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
          Consulter le rapport
        </button>
      </div>
    </div>
  );
}