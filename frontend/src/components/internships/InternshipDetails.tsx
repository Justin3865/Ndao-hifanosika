"use client";

import type { Internship } from "./InternshipTable";
import InternshipStatus from "./InternshipStatus";

interface InternshipDetailsProps {
  internship: Internship;
}

export default function InternshipDetails({
  internship,
}: InternshipDetailsProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-blue-600">
              {internship.reference}
            </p>

            <h2 className="mt-1 text-xl font-bold">
              {internship.internName}
            </h2>

            <p className="text-sm text-gray-500">
              {internship.institution}
            </p>
          </div>

          <InternshipStatus status={internship.status} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">
            Informations du stage
          </h3>

          <div className="space-y-3 text-sm">
            <Info
              label="Projet"
              value={internship.project}
            />

            <Info
              label="Département"
              value={internship.department}
            />

            <Info
              label="Encadrant"
              value={internship.supervisor}
            />

            <Info
              label="Début"
              value={internship.startDate}
            />

            <Info
              label="Fin"
              value={internship.endDate}
            />
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">
            Suivi
          </h3>

          <div className="space-y-4">
            <Progress label="Présence" value={92} />
            <Progress label="Évaluation" value={75} />
            <Progress label="Rapport" value={60} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-right">
        {value}
      </span>
    </div>
  );
}

function Progress({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span>{value}%</span>
      </div>

      <div className="h-2 rounded-full bg-gray-100">
        <div
          className="h-2 rounded-full bg-blue-600"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}