"use client";

import { Check, Minus } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { ALL_ROLES, canAccessPath } from "@/lib/access";
import { ROLE_LABELS } from "@/lib/roles";

const ROUTES: Array<{ label: string; path: string; group: string }> = [
  { group: "Pilotage", label: "Tableau de bord", path: "/dashboard" },
  { group: "Pilotage", label: "Suivi terrain en direct", path: "/tracking" },
  { group: "Pilotage", label: "Ma mission (GPS)", path: "/mission" },
  { group: "Pilotage", label: "Rapports", path: "/reports" },
  { group: "Pilotage", label: "Export JSON", path: "/exports" },
  { group: "Pilotage", label: "Suivi & Évaluation", path: "/suivi-evaluation" },
  { group: "Pilotage", label: "Analyses IA", path: "/ai" },
  { group: "Programmes", label: "Projets (lecture)", path: "/projects" },
  { group: "Programmes", label: "Projets (création / édition)", path: "/projects/create" },
  { group: "Programmes", label: "Activités", path: "/activities" },
  { group: "Programmes", label: "Jalons", path: "/milestones" },
  { group: "Programmes", label: "Bénéficiaires", path: "/beneficiaries" },
  { group: "Programmes", label: "Parcours", path: "/parcours" },
  { group: "Programmes", label: "Présences", path: "/presences" },
  { group: "Programmes", label: "Consentements", path: "/consentements" },
  { group: "Programmes", label: "Suivi post-programme", path: "/follow-ups" },
  { group: "Programmes", label: "Évaluations", path: "/evaluations" },
  { group: "Programmes", label: "Grilles & campagnes", path: "/evaluations/grids" },
  { group: "Programmes", label: "Évaluation finale", path: "/evaluation-finale" },
  { group: "Programmes", label: "Ordre de mérite", path: "/merit" },
  { group: "Programmes", label: "Stages", path: "/internships" },
  { group: "Programmes", label: "Documents de stage", path: "/internships/documents" },
  { group: "Organisation", label: "Membres", path: "/members" },
  { group: "Organisation", label: "Objectifs", path: "/objectifs" },
  { group: "Organisation", label: "Utilisateurs (lecture)", path: "/users" },
  { group: "Organisation", label: "Utilisateurs (création)", path: "/users/create" },
  { group: "Organisation", label: "Coordinateurs", path: "/coordinateurs" },
  { group: "Organisation", label: "Départements", path: "/departements" },
  { group: "Organisation", label: "Zones d'intervention", path: "/zones" },
  { group: "Organisation", label: "Certificats", path: "/certificates" },
  { group: "Système", label: "Notifications", path: "/notifications" },
  { group: "Système", label: "Rôles & accès", path: "/administration/permissions" },
  { group: "Système", label: "Journal d'audit", path: "/security" },
  { group: "Système", label: "Conservation des données", path: "/administration/retention" },
  { group: "Système", label: "Paramètres", path: "/settings" },
];

const SHORT: Record<string, string> = {
  ADMIN: "ADMIN", DIRECTION: "DIR.", DSI: "DSI", DAF: "DAF", RH: "RH", COMMUNICATION: "COM.",
  COORDINATOR: "COORD.", TUTEUR_L3: "TUT. L3", TUTEUR_M2: "TUT. M2", STAGIAIRE_L3: "STAG. L3", STAGIAIRE_M2: "STAG. M2",
  STAGIAIRE_L1: "STAG. L1", STAGIAIRE_L2: "STAG. L2", STAGIAIRE_M1: "STAG. M1",
};

export default function PermissionsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rôles &amp; accès</h1>
          <p className="text-sm text-gray-500">
            Matrice réelle appliquée par la plateforme (frontend et API). Un seul compte ADMIN existe ; les tuteurs et
            stagiaires ne voient que leurs propres stages et évaluations.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="w-[26%] px-3 py-3 text-left font-semibold">Module</th>
                {ALL_ROLES.map((role) => (
                  <th key={role} className="px-0.5 py-3 text-center text-[9px] font-semibold leading-tight" title={ROLE_LABELS[role]}>{SHORT[role]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ROUTES.map((route, index) => (
                <tr key={route.path} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    {(index === 0 || ROUTES[index - 1].group !== route.group) && (
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">{route.group}</p>
                    )}
                    <span className="font-medium text-gray-800">{route.label}</span>
                  </td>
                  {ALL_ROLES.map((role) => (
                    <td key={role} className="px-2 py-2.5 text-center">
                      {canAccessPath(role, route.path) ? (
                        <Check className="mx-auto h-4 w-4 text-green-600" />
                      ) : (
                        <Minus className="mx-auto h-4 w-4 text-gray-300" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
