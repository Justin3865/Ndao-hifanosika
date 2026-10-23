"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, StopCircle } from "lucide-react";
import { useMission } from "./MissionProvider";

/** Bandeau visible sur TOUTES les pages tant que la mission n'est pas terminée. */
export function MissionBanner() {
  const { active, position, error, busy, finish } = useMission();
  const pathname = usePathname();

  if (!active) return null;

  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 bg-green-600 px-4 py-2 text-sm text-white shadow">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
      </span>

      <span className="font-semibold">Mission en cours</span>

      <span className="hidden text-green-50 sm:inline">
        {error
          ? error
          : position
            ? `Position partagée · précision ≈ ${position.accuracy} m`
            : "En attente du signal GPS…"}
      </span>

      <span className="ml-auto flex items-center gap-2">
        {!pathname.startsWith("/mission") && (
          <Link href="/mission" className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1 font-medium hover:bg-white/25">
            <MapPin className="h-4 w-4" /> Ma mission
          </Link>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => void finish()}
          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 font-semibold hover:bg-red-700 disabled:opacity-60"
        >
          <StopCircle className="h-4 w-4" /> Terminer la mission
        </button>
      </span>
    </div>
  );
}
