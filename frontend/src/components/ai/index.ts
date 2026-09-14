import {
  AIStatCard,
  DropoutRiskCard,
  PerformanceCard,
  SummaryResult,
  AnomalyCard,
} from "@/components/ai";

export default function AIPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Intelligence Artificielle
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Analyse intelligente des données de suivi et évaluation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AIStatCard
          title="Bénéficiaires analysés"
          value={245}
          description="Ce mois"
          icon="users"
          type="info"
        />

        <AIStatCard
          title="Risque d'abandon"
          value="18%"
          description="Risque moyen"
          icon="alert"
          type="warning"
        />

        <AIStatCard
          title="Performance moyenne"
          value="78%"
          description="+5% ce mois"
          icon="trend"
          type="success"
        />

        <AIStatCard
          title="Anomalies"
          value={7}
          description="À vérifier"
          icon="activity"
          type="danger"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DropoutRiskCard
          beneficiaryName="Jean Dupont"
          riskScore={78}
          reason="Baisse de participation et absences répétées."
        />

        <PerformanceCard
          name="Programme Kids Preneur"
          score={82}
          previousScore={76}
          label="Performance du programme"
        />
      </div>

      <SummaryResult
        summary="L'analyse des données montre une amélioration globale des performances. Certains bénéficiaires présentent cependant un risque élevé d'abandon et nécessitent un suivi rapproché."
        generatedAt="07/09/2026"
      />

      <AnomalyCard
        title="Baisse inhabituelle de participation"
        description="Une diminution importante de la participation a été détectée dans le programme Maison Digitale."
        severity="high"
        detectedAt="07/09/2026"
      />
    </div>
  );
}