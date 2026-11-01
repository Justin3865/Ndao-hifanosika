"use client";

import { useEffect, useState } from "react";
import { ResourceListPage } from "@/components/crud/ResourceListPage";
import EvaluationResults, { useEvaluationResults } from "@/components/monitoring/EvaluationResults";
import { getStoredRole, normalizeRole } from "@/lib/access";
import { evaluationsConfig } from "@/lib/resources";

/** Rôles qui voient aussi les résultats du suivi & évaluation (mêmes droits que /suivi-evaluation). */
const RESULT_ROLES = ["ADMIN", "DIRECTION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"];

export default function Page() {
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    setShowResults(RESULT_ROLES.includes(normalizeRole(getStoredRole())));
  }, []);

  const results = useEvaluationResults(showResults);

  // Jeux de données ajoutés au menu « Exporter » (projets et stagiaires, séparément ou ensemble)
  const exportExtras =
    showResults && !results.loading
      ? [
          ...(results.projectsError ? [] : [{ label: "Tous les projets", sheet: results.projectSheet }]),
          ...(results.internshipsError ? [] : [{ label: "Tous les stagiaires", sheet: results.internshipSheet }]),
        ]
      : [];

  return (
    <ResourceListPage
      config={evaluationsConfig}
      top={showResults ? <EvaluationResults data={results} /> : undefined}
      exportExtras={exportExtras}
    />
  );
}
