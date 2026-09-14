
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const departements = [
  {
    id: "1",
    code: "DIR",
    name: "Direction",
    description:
      "Assure la coordination générale, la gouvernance et le pilotage stratégique de l'organisation.",
    responsable: "Direction Générale",
    email: "direction@ndaohifanosika.org",
    telephone: "+261 34 00 000 01",
    status: "Actif",
    members: 5,
    projects: 4,
    createdAt: "18 Août 2026",
  },
  {
    id: "2",
    code: "DSI",
    name: "DSI",
    description:
      "Assure la gestion des systèmes d'information, des outils numériques et de la plateforme S&E.",
    responsable: "Responsable DSI",
    email: "dsi@ndaohifanosika.org",
    telephone: "+261 34 00 000 02",
    status: "Actif",
    members: 6,
    projects: 4,
    createdAt: "18 Août 2026",
  },
  {
    id: "3",
    code: "DAF",
    name: "DAF",
    description:
      "Gère les ressources financières, administratives et le suivi budgétaire des projets.",
    responsable: "Responsable DAF",
    email: "daf@ndaohifanosika.org",
    telephone: "+261 34 00 000 03",
    status: "Actif",
    members: 7,
    projects: 4,
    createdAt: "18 Août 2026",
  },
  {
    id: "4",
    code: "COM",
    name: "Communication",
    description:
      "Assure la communication institutionnelle, la visibilité et la valorisation des activités.",
    responsable: "Responsable Communication",
    email: "communication@ndaohifanosika.org",
    telephone: "+261 34 00 000 04",
    status: "Actif",
    members: 5,
    projects: 3,
    createdAt: "18 Août 2026",
  },
  {
    id: "5",
    code: "RH",
    name: "Ressources Humaines",
    description:
      "Assure la gestion des équipes, des membres, des stages et du développement des compétences.",
    responsable: "Responsable RH",
    email: "rh@ndaohifanosika.org",
    telephone: "+261 34 00 000 05",
    status: "Actif",
    members: 5,
    projects: 2,
    createdAt: "18 Août 2026",
  },
];

function Icon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "building":
      return (
        <svg {...common}>
          <path d="M3 21h18" />
          <path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" />
          <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
        </svg>
      );

    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case "project":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M8 4V2h8v2" />
          <path d="M3 10h18" />
        </svg>
      );

    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );

    case "phone":
      return (
        <svg {...common}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />
        </svg>
      );

    case "edit":
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "trash":
      return (
        <svg {...common}>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 15H6L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      );

    default:
      return null;
  }
}

export default function DepartementDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const departement = departements.find(
    (item) => item.id === id
  );

  if (!departement) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Département introuvable
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Le département demandé n'existe pas.
          </p>

          <Link
            href="/departements"
            className="mt-6 inline-flex rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800"
          >
            Retour aux départements
          </Link>
        </div>
      </main>
    );
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Voulez-vous supprimer "${departement.name}" ?`
    );

    if (!confirmed) return;

    alert("Département supprimé.");
    router.push("/departements");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link
                  href="/departements"
                  className="hover:text-green-700"
                >
                  Départements
                </Link>

                <Icon name="arrow" size={15} />

                <span>{departement.name}</span>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-lg font-bold text-green-700">
                  {departement.code}
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {departement.name}
                  </h1>

                  <span className="mt-1 inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                    {departement.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/departements/${departement.id}/edit`}
                className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
              >
                <Icon name="edit" size={17} />
                Modifier
              </Link>

              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <Icon name="trash" size={17} />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Icon name="users" />
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Membres
                </p>

                <p className="text-2xl font-bold text-gray-900">
                  {departement.members}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                <Icon name="project" />
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Projets
                </p>

                <p className="text-2xl font-bold text-gray-900">
                  {departement.projects}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
                <Icon name="building" />
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Statut
                </p>

                <p className="text-2xl font-bold text-green-700">
                  {departement.status}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* INFORMATIONS */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-bold text-gray-900">
              Informations du département
            </h2>

            <div className="mt-6">
              <p className="text-sm font-semibold text-gray-500">
                Description
              </p>

              <p className="mt-2 text-sm leading-7 text-gray-700">
                {departement.description}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Code
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {departement.code}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Date de création
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {departement.createdAt}
                </p>
              </div>
            </div>
          </section>

          {/* CONTACT */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              Responsable
            </h2>

            <div className="mt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-700">
                {departement.responsable.charAt(0)}
              </div>

              <p className="mt-4 font-semibold text-gray-900">
                {departement.responsable}
              </p>

              <div className="mt-5 space-y-4">
                <div className="flex gap-3">
                  <Icon name="mail" size={18} />

                  <div>
                    <p className="text-xs text-gray-400">
                      Email
                    </p>

                    <p className="mt-1 break-all text-sm text-gray-700">
                      {departement.email}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Icon name="phone" size={18} />

                  <div>
                    <p className="text-xs text-gray-400">
                      Téléphone
                    </p>

                    <p className="mt-1 text-sm text-gray-700">
                      {departement.telephone}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* RELATIONS */}
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">
            Relations S&E
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Éléments liés à ce département dans la plateforme.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Link
              href="/members"
              className="group rounded-xl border border-gray-200 p-5 transition hover:border-green-300 hover:bg-green-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Icon name="users" size={19} />
                </div>

                <Icon
                  name="arrow"
                  size={18}
                />
              </div>

              <p className="mt-4 font-semibold text-gray-900">
                Membres du département
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {departement.members} membre(s) rattaché(s).
              </p>
            </Link>

            <Link
              href="/projects"
              className="group rounded-xl border border-gray-200 p-5 transition hover:border-green-300 hover:bg-green-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                  <Icon name="project" size={19} />
                </div>

                <Icon name="arrow" size={18} />
              </div>

              <p className="mt-4 font-semibold text-gray-900">
                Projets associés
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {departement.projects} projet(s) associé(s).
              </p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

