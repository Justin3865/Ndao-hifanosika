import { prisma } from "../config/database";
import { loadInternshipsMonitoring } from "./internshipMonitoring.service";
import { mentionFromScore20, type Mention } from "../utils/mention";

/**
 * Données proposées automatiquement pour le certificat d'un stagiaire :
 *  - lieu de stage : activités du projet, sinon position GPS, sinon département
 *  - note finale /20 : calculée par le suivi & évaluation (tâches, rapports,
 *    évaluations du tuteur, présence / GPS)
 *  - mention : déduite de la note finale
 */

export type LocationSource = "ACTIVITES" | "GPS" | "DEPARTEMENT";

export interface CertificateSuggestion {
  theme: string;
  missionLocation: string | null;
  locationSource: LocationSource | null;
  finalScoreOn20: number | null;
  mention: Mention | null;
  breakdown: {
    tasks: number | null;
    reports: number | null;
    evaluations: number | null;
    presence: number | null;
    evaluationAverageOn20: number | null;
    progress: number | null;
    gpsCheckins: number;
  };
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function getInternshipCertificateSuggestion(internshipId: number): Promise<CertificateSuggestion | null> {
  const rows = await loadInternshipsMonitoring({}, { id: internshipId });
  const row = rows[0];
  if (!row) return null;

  const { internship, metrics } = row;

  // --- note finale /20 ---
  // Angona tena izy : tâches, rapports ou évaluations ; présence : raha misy check-in (> 0 %) fotsiny
  const hasScoreData =
    metrics.components.tasks !== null ||
    metrics.components.reports !== null ||
    metrics.components.evaluations !== null ||
    (metrics.components.presence !== null && metrics.components.presence > 0);
  const finalScoreOn20 =
    metrics.actualProgress === null || !hasScoreData ? null : round1(Math.min(20, Math.max(0, (metrics.actualProgress / 100) * 20)));

  // --- lieu de stage ---
  let missionLocation: string | null = null;
  let locationSource: LocationSource | null = null;

  // 1) lieu le plus fréquent parmi les activités du projet
  if (internship.projectId) {
    const activities = await prisma.activity.findMany({
      where: { projectId: internship.projectId },
      select: { location: true },
    });
    const counts = new Map<string, number>();
    activities.forEach((a) => {
      const name = a.location?.trim();
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) {
      missionLocation = best[0];
      locationSource = "ACTIVITES";
    }
  }

  // 2) zone d'intervention la plus proche de la position GPS moyenne du stagiaire
  if (!missionLocation) {
    const points = await prisma.missionPoint.findMany({
      where: { mission: { agentId: internship.studentId } },
      select: { latitude: true, longitude: true },
      take: 2000,
    });

    if (points.length > 0) {
      const lat = points.reduce((a, p) => a + p.latitude, 0) / points.length;
      const lng = points.reduce((a, p) => a + p.longitude, 0) / points.length;
      const zones = await prisma.zone.findMany({ where: { isActive: true }, select: { name: true, region: true, latitude: true, longitude: true } });

      let bestLabel: string | null = null;
      let bestKm = Infinity;
      for (const z of zones) {
        const km = distanceKm(lat, lng, z.latitude, z.longitude);
        if (km <= 50 && km < bestKm) {
          bestKm = km;
          bestLabel = z.region ? `${z.name} — ${z.region}` : z.name;
        }
      }

      if (bestLabel) {
        missionLocation = bestLabel;
        locationSource = "GPS";
      }
    }
  }

  // 3) à défaut : département du projet
  if (!missionLocation && internship.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: internship.projectId },
      select: { department: { select: { name: true } } },
    });
    if (project?.department?.name) {
      missionLocation = project.department.name;
      locationSource = "DEPARTEMENT";
    }
  }

  return {
    theme: internship.title,
    missionLocation,
    locationSource,
    finalScoreOn20,
    mention: mentionFromScore20(finalScoreOn20),
    breakdown: {
      tasks: metrics.components.tasks,
      reports: metrics.components.reports,
      evaluations: metrics.components.evaluations,
      presence: metrics.components.presence,
      evaluationAverageOn20: metrics.evaluations.averageOn20,
      progress: metrics.actualProgress,
      gpsCheckins: metrics.presence.gpsCheckins,
    },
  };
}
