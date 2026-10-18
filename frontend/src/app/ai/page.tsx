"use client";

import Link from "next/link";
import { AlertTriangle, BarChart3, BrainCircuit, FileText, Lightbulb, MapPinned, MessageSquare, ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { METHOD_NOTE, State, useInsight } from "@/components/insights/parts";

interface Summary {
  headline: string;
  highlights: string[];
  recommendations: string[];
  counters: {
    projects: number;
    activeProjects: number;
    anomalies: number;
    criticalAnomalies: number;
    highRiskBeneficiaries: number;
  };
}

const CARDS = [
  { href: "/ai/summary", title: "Synthèse intelligente", text: "Résumé et recommandations prêts à présenter.", icon: FileText, tone: "from-blue-600 to-blue-800" },
  { href: "/ai/performance", title: "Performance des projets", text: "Score par projet : jalons, activités, évaluations.", icon: BarChart3, tone: "from-emerald-500 to-teal-700" },
  { href: "/ai/anomaly", title: "Détection d'anomalies", text: "Retards, budgets dépassés, scores atypiques.", icon: AlertTriangle, tone: "from-amber-400 to-orange-600" },
  { href: "/ai/dropout-risk", title: "Risque d'abandon", text: "Bénéficiaires à accompagner en priorité.", icon: ShieldAlert, tone: "from-rose-500 to-red-700" },
  { href: "/ai/chat", title: "Assistant (chatbot)", text: "Comparer des zones, trouver les ménages vulnérables et l'agent le plus proche.", icon: MessageSquare, tone: "from-indigo-500 to-blue-800" },
  { href: "/ai/vulnerability", title: "Carte de vulnérabilité", text: "Ménages notés par SGD + réseau de neurones, avec altitude et GPS.", icon: MapPinned, tone: "from-fuchsia-500 to-purple-800" },
  { href: "/ai/models", title: "Modèles d'apprentissage", text: "Entraînement, validation croisée et fiabilité.", icon: BrainCircuit, tone: "from-slate-500 to-slate-800" },
];

export default function AiHubPage() {
  const { data, loading, error } = useInsight<Summary>("/ai/summary");

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analyses IA</h1>
          <p className="text-sm text-gray-500">Aide à la décision calculée sur les données réelles de l&apos;ONG.</p>
        </div>

        <State loading={loading} error={error}>
          {data && (
            <section className="rounded-3xl bg-gradient-to-br from-blue-950 to-blue-700 p-8 text-white shadow-xl">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-white/15 p-3"><Lightbulb className="h-6 w-6 text-amber-300" /></div>
                <div>
                  <h2 className="text-xl font-bold">{data.headline}</h2>
                  <ul className="mt-3 space-y-1 text-sm text-blue-100">
                    {data.highlights.map((line) => <li key={line}>• {line}</li>)}
                  </ul>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ["Projets actifs", data.counters.activeProjects],
                  ["Anomalies", data.counters.anomalies],
                  ["Critiques", data.counters.criticalAnomalies],
                  ["Bénéf. à risque", data.counters.highRiskBeneficiaries],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-blue-200">{label}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </State>

        <div className="grid gap-5 md:grid-cols-2">
          {CARDS.map((card) => (
            <Link key={card.href} href={card.href} className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className={`rounded-xl bg-gradient-to-br p-3 text-white shadow-md ${card.tone}`}><card.icon className="h-6 w-6" /></div>
              <div>
                <h3 className="font-semibold text-gray-900">{card.title}</h3>
                <p className="text-sm text-gray-500">{card.text}</p>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-xs text-gray-400">{METHOD_NOTE}</p>
      </div>
    </AppLayout>
  );
}
