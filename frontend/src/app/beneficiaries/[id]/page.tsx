"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  ShieldAlert,
  User,
  MapPin,
  Calendar,
  Activity,
  ClipboardCheck,
  Target,
  Briefcase,
  Clock,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Beneficiary,
  calculateAttendanceRate,
  formatDate,
  getBeneficiaryById,
  isMinor,
} from "@/lib/beneficiaries";

export default function BeneficiaryDetailPage() {
  const params = useParams();

  const id = String(params.id);

  const [beneficiary, setBeneficiary] =
    useState<Beneficiary | null>(null);

  useEffect(() => {
    const data =
      getBeneficiaryById(id);

    if (data) {
      setBeneficiary(data);
    }
  }, [id]);

  if (!beneficiary) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl rounded-xl border bg-white p-10 text-center">
          <h1 className="text-xl font-bold">
            Bénéficiaire introuvable
          </h1>

          <p className="mt-2 text-gray-500">
            La fiche demandée n'existe pas.
          </p>

          <Link
            href="/beneficiaries"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            <ArrowLeft size={18} />
            Retour aux bénéficiaires
          </Link>
        </div>
      </main>
    );
  }

  const attendance =
    calculateAttendanceRate(
      beneficiary
    );

  const minor =
    isMinor(
      beneficiary.dateNaissance
    );

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div className="flex items-center gap-3">

            <Link
              href="/beneficiaries"
              className="rounded-lg border bg-white p-2 hover:bg-gray-50"
            >
              <ArrowLeft size={20} />
            </Link>

            <div>
              <div className="text-sm text-gray-500">
                {beneficiary.code}
              </div>

              <h1 className="text-2xl font-bold text-gray-900">
                {beneficiary.anonymise
                  ? "Bénéficiaire anonymisé"
                  : `${beneficiary.prenom} ${beneficiary.nom}`}
              </h1>
            </div>

          </div>

          <Link
            href={`/beneficiaries/${beneficiary.id}/edit`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700"
          >
            <Pencil size={18} />
            Modifier
          </Link>

        </div>

        {/* Confidentialité */}
        {(minor ||
          beneficiary.categorieVulnerabilite !==
            "Aucune") && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex gap-3">
              <ShieldAlert
                className="text-red-600"
                size={22}
              />

              <div>
                <h2 className="font-semibold text-red-800">
                  Protection renforcée
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  Cette fiche contient des données
                  nécessitant une attention particulière.
                  {minor &&
                    " Le bénéficiaire est mineur."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <Stat
            label="Progression"
            value={`${beneficiary.progression}%`}
            icon={<Activity size={20} />}
          />

          <Stat
            label="Présence"
            value={`${attendance}%`}
            icon={<Calendar size={20} />}
          />

          <Stat
            label="Jalons"
            value={`${beneficiary.jalonsFranchis}/${beneficiary.jalonsTotal}`}
            icon={<Target size={20} />}
          />

          <Stat
            label="Évaluation"
            value={
              beneficiary.scoreEvaluation !== null
                ? `${beneficiary.scoreEvaluation}/100`
                : "Non évalué"
            }
            icon={<ClipboardCheck size={20} />}
          />

        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Informations */}
          <section className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-2">

            <h2 className="mb-5 text-lg font-semibold">
              Informations du bénéficiaire
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <Info
                label="Nom complet"
                value={
                  beneficiary.anonymise
                    ? "Anonymisé"
                    : `${beneficiary.prenom} ${beneficiary.nom}`
                }
                icon={<User size={17} />}
              />

              <Info
                label="Genre"
                value={beneficiary.genre}
              />

              <Info
                label="Date de naissance"
                value={
                  formatDate(
                    beneficiary.dateNaissance
                  )
                }
                icon={<Calendar size={17} />}
              />

              <Info
                label="Catégorie"
                value={beneficiary.categorie}
              />

              <Info
                label="Vulnérabilité"
                value={
                  beneficiary.categorieVulnerabilite
                }
              />

              <Info
                label="Situation socio-économique"
                value={
                  beneficiary.situationSocioEconomique
                }
              />

              <Info
                label="Niveau d'étude"
                value={
                  beneficiary.niveauEtude ||
                  "Non renseigné"
                }
              />

              <Info
                label="Profession"
                value={
                  beneficiary.profession ||
                  "Non renseignée"
                }
                icon={
                  <Briefcase size={17} />
                }
              />

              <Info
                label="Commune"
                value={
                  beneficiary.commune ||
                  "Non renseignée"
                }
                icon={<MapPin size={17} />}
              />

              <Info
                label="Région"
                value={
                  beneficiary.region ||
                  "Non renseignée"
                }
              />

            </div>
          </section>

          {/* Programme */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-5 text-lg font-semibold">
              Programme
            </h2>

            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-xs font-medium uppercase text-blue-600">
                Programme principal
              </p>

              <p className="mt-1 text-lg font-bold text-blue-900">
                {beneficiary.programmePrincipal}
              </p>
            </div>

            <div className="mt-5 space-y-4">

              <Info
                label="Date d'inscription"
                value={formatDate(
                  beneficiary.dateInscription
                )}
              />

              <Info
                label="Statut"
                value={
                  beneficiary.statutParcours
                }
              />

              <Info
                label="Étape actuelle"
                value={
                  beneficiary.etapeParcours
                }
              />

            </div>

          </section>

          {/* Parcours */}
          <section className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-3">

            <h2 className="mb-5 text-lg font-semibold">
              Suivi du parcours
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

              <ProgressCard
                title="Progression"
                value={
                  beneficiary.progression
                }
                suffix="%"
              />

              <ProgressCard
                title="Présence"
                value={attendance}
                suffix="%"
              />

              <ProgressCard
                title="Jalons franchis"
                value={
                  beneficiary.jalonsTotal > 0
                    ? Math.round(
                        (beneficiary.jalonsFranchis /
                          beneficiary.jalonsTotal) *
                          100
                      )
                    : 0
                }
                suffix="%"
              />

            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">

              <MiniStat
                label="Sessions prévues"
                value={
                  beneficiary.sessionsPrevues
                }
              />

              <MiniStat
                label="Sessions présentes"
                value={
                  beneficiary.sessionsPresentes
                }
              />

              <MiniStat
                label="Jalons franchis"
                value={
                  beneficiary.jalonsFranchis
                }
              />

              <MiniStat
                label="Jalons total"
                value={
                  beneficiary.jalonsTotal
                }
              />

            </div>

          </section>

          {/* Evaluation */}
          <section className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-2">

            <h2 className="mb-5 text-lg font-semibold">
              Évaluation
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              <MiniStat
                label="Dernière évaluation"
                value={
                  beneficiary.derniereEvaluation
                    ? formatDate(
                        beneficiary.derniereEvaluation
                      )
                    : "Non évalué"
                }
              />

              <MiniStat
                label="Score"
                value={
                  beneficiary.scoreEvaluation !==
                  null
                    ? `${beneficiary.scoreEvaluation}/100`
                    : "—"
                }
              />

              <MiniStat
                label="Satisfaction"
                value={
                  beneficiary.satisfaction !==
                  null
                    ? `${beneficiary.satisfaction}%`
                    : "—"
                }
              />

            </div>

          </section>

          {/* Impact */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-5 text-lg font-semibold">
              Impact
            </h2>

            <div className="space-y-4">

              <Info
                label="Insertion professionnelle"
                value={
                  beneficiary.insertionProfessionnelle ===
                  null
                    ? "Non renseigné"
                    : beneficiary.insertionProfessionnelle
                    ? "Oui"
                    : "Non"
                }
              />

              <Info
                label="Création d'activité"
                value={
                  beneficiary.creationActivite ===
                  null
                    ? "Non renseigné"
                    : beneficiary.creationActivite
                    ? "Oui"
                    : "Non"
                }
              />

              <Info
                label="Évolution des revenus"
                value={
                  beneficiary.evolutionRevenus ||
                  "Non renseignée"
                }
              />

            </div>

          </section>

          {/* Suivi post programme */}
          <section className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-3">

            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold">
              <Clock size={20} />
              Suivi post-programme
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              <FollowUp
                period="3 mois"
                status={
                  beneficiary.suivi3Mois
                }
              />

              <FollowUp
                period="6 mois"
                status={
                  beneficiary.suivi6Mois
                }
              />

              <FollowUp
                period="12 mois"
                status={
                  beneficiary.suivi12Mois
                }
              />

            </div>

          </section>

          {/* Commentaires */}
          {beneficiary.commentaires && (
            <section className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-3">

              <h2 className="mb-3 text-lg font-semibold">
                Observations
              </h2>

              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">
                {beneficiary.commentaires}
              </p>

            </section>
          )}

        </div>

      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {label}
        </p>

        <div className="text-blue-600">
          {icon}
        </div>
      </div>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-gray-400">
        {label}
      </p>

      <div className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-800">
        {icon}
        {value}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold">
        {value}
      </p>
    </div>
  );
}

function ProgressCard({
  title,
  value,
  suffix,
}: {
  title: string;
  value: number;
  suffix: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex justify-between">
        <p className="text-sm text-gray-600">
          {title}
        </p>

        <p className="font-bold">
          {value}
          {suffix}
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-600"
          style={{
            width: `${value}%`,
          }}
        />
      </div>
    </div>
  );
}

function FollowUp({
  period,
  status,
}: {
  period: string;
  status: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm font-semibold">
        Suivi à {period}
      </p>

      <p className="mt-2 text-sm text-gray-600">
        {status}
      </p>
    </div>
  );
}