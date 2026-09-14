"use client";

interface ReportTemplateProps {
  value: string;
  onChange: (value: string) => void;
}

const templates = [
  {
    id: "standard",
    name: "Rapport standard S&E",
    description: "Rapport général de suivi et évaluation.",
  },
  {
    id: "donor",
    name: "Rapport bailleur",
    description: "Format destiné aux partenaires financiers.",
  },
  {
    id: "monthly",
    name: "Rapport mensuel",
    description: "Suivi mensuel des activités et indicateurs.",
  },
  {
    id: "annual",
    name: "Rapport annuel",
    description: "Synthèse annuelle du projet.",
  },
];

export default function ReportTemplate({
  value,
  onChange,
}: ReportTemplateProps) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <h3 className="mb-4 text-lg font-semibold">
        Modèle de rapport
      </h3>

      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onChange(template.id)}
            className={`rounded-xl border p-4 text-left transition ${
              value === template.id
                ? "border-blue-500 bg-blue-50"
                : "hover:bg-gray-50"
            }`}
          >
            <p className="font-semibold">{template.name}</p>
            <p className="mt-1 text-sm text-gray-500">
              {template.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}