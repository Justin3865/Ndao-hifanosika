import { Building2, Target, Users } from "lucide-react";

interface ReportProjectProps {
  name: string;
  description?: string;
  manager?: string;
  beneficiaries?: number;
}

export default function ReportProject({
  name,
  description,
  manager,
  beneficiaries,
}: ReportProjectProps) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex gap-4">
        <div className="rounded-xl bg-indigo-50 p-3">
          <Building2 className="h-6 w-6 text-indigo-600" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold">{name}</h3>

          {description && (
            <p className="mt-1 text-sm text-gray-500">
              {description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
            {manager && (
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Responsable : {manager}
              </span>
            )}

            {beneficiaries !== undefined && (
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {beneficiaries} bénéficiaires
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}