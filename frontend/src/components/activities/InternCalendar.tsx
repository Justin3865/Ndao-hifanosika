"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { TrendingUp } from "lucide-react";

import type { Item } from "@/lib/crud";
import { buildAgenda, localToday, presentDaySet } from "@/lib/internAgenda";
import { useMyInternship } from "@/hooks/useMyInternship";
import { InternAgenda } from "@/components/monitoring/InternAgenda";

/**
 * Calendrier des activités VERSION STAGIAIRE : les activités déjà affichées (mêmes filtres, mêmes liens)
 * + ses tâches du stage, ses objectifs, ses évaluations et ce qu'il a déclaré chaque jour.
 * Si son stage ou ses données sont indisponibles, on retombe sur le calendrier habituel (`fallback`).
 */
export function InternCalendar({ items, fallback }: { items: Item[]; fallback: ReactNode }) {
  const { internship, journal, objectives, loading, reload } = useMyInternship();
  const today = useMemo(() => localToday(), []);

  const agenda = useMemo(
    () => buildAgenda({ internship, journal, objectives, activities: items, today }),
    [internship, journal, objectives, items, today],
  );
  const present = useMemo(() => presentDaySet(internship, journal), [internship, journal]);

  if (loading && !internship) return <>{fallback}</>;
  if (!internship) return <>{fallback}</>;

  return (
    <div className="space-y-3">
      <InternAgenda
        items={agenda}
        internship={internship}
        journal={journal}
        presentDays={present}
        today={today}
        onChanged={reload}
        subtitle="Les activités du projet, mes tâches, mes objectifs et ce que j’ai déclaré chaque jour — cliquez sur un jour pour le détail."
      />
      <p className="text-right text-xs">
        <Link href="/mon-stage" className="inline-flex items-center gap-1 font-semibold text-blue-700 underline">
          <TrendingUp className="h-3.5 w-3.5" /> Voir ma frise de stage et mon avancement
        </Link>
      </p>
    </div>
  );
}
