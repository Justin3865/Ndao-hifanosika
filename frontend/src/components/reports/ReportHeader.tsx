"use client";

import { FileText, CalendarDays, Building2 } from "lucide-react";

interface ReportHeaderProps {
  title: string;
  organization?: string;
  project?: string;
  period?: string;
  subtitle?: string;
}

export default function ReportHeader({
  title,
  organization = "Ndao Hifanosika",
  project,
  period,
  subtitle,
}: ReportHeaderProps) {
  return (
    <header className="border-b pb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <div className="rounded-xl bg-blue-100 p-3">
            <FileText className="h-7 w-7 text-blue-600" />
          </div>

          <div>
            <p className="text-sm font-semibold text-blue-600">
              {organization}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          {project && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {project}
            </div>
          )}

          {period && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {period}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}