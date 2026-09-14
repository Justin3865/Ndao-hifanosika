
// src/app/users/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  Building2,
  Shield,
  CalendarDays,
  Clock3,
  User,
  CheckCircle2,
  Activity,
} from "lucide-react";

const users = [
  {
    id: "1",
    name: "Jean Rakoto",
    firstName: "Jean",
    lastName: "Rakoto",
    email: "jean.rakoto@ndao-hifanosika.org",
    phone: "+261 34 00 000 01",
    role: "Administrateur",
    department: "Direction",
    status: "Actif",
    createdAt: "15 janvier 2026",
    lastLogin: "02 septembre 2026 à 08:45",
    initials: "JR",
  },
  {
    id: "2",
    name: "Marie Andria",
    firstName: "Marie",
    lastName: "Andria",
    email: "marie.andria@ndao-hifanosika.org",
    phone: "+261 34 00 000 02",
    role: "Responsable S&E",
    department: "DSI",
    status: "Actif",
    createdAt: "20 janvier 2026",
    lastLogin: "02 septembre 2026 à 09:10",
    initials: "MA",
  },
  {
    id: "3",
    name: "Paul Rabe",
    firstName: "Paul",
    lastName: "Rabe",
    email: "paul.rabe@ndao-hifanosika.org",
    phone: "+261 34 00 000 03",
    role: "Chef de projet",
    department: "Communication",
    status: "Actif",
    createdAt: "25 janvier 2026",
    lastLogin: "01 septembre 2026 à 15:20",
    initials: "PR",
  },
];

export default function UserDetailsPage() {
  const params = useParams();
  const id = String(params.id);

  const user =
    users.find((item) => item.id === id) || users[0];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-6 lg:px-8 py-4">
          <Link
            href="/users"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-purple-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux utilisateurs
          </Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* BREADCRUMB */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link
            href="/dashboard"
            className="hover:text-purple-600"
          >
            Tableau de bord
          </Link>

          <span>/</span>

          <Link
            href="/users"
            className="hover:text-purple-600"
          >
            Utilisateurs
          </Link>

          <span>/</span>

          <span>{user.name}</span>
        </div>

        {/* PROFILE HEADER */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-purple-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-700">
                  {user.initials}
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {user.name}
                  </h1>

                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    {user.status}
                  </span>
                </div>

                <p className="text-gray-500 mt-1">
                  {user.role}
                </p>

                <p className="text-sm text-gray-400 mt-1">
                  ID utilisateur : #{user.id}
                </p>
              </div>
            </div>

            <Link
              href={`/users/${user.id}/edit`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
            >
              <Pencil className="w-5 h-5" />
              Modifier
            </Link>
          </div>
        </div>

        {/* INFORMATIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* INFORMATIONS PERSONNELLES */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Informations personnelles
              </h2>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Nom complet
                  </p>

                  <p className="font-medium text-gray-800 mt-1">
                    {user.firstName} {user.lastName}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Adresse e-mail
                  </p>

                  <p className="font-medium text-gray-800 mt-1 break-all">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Téléphone
                  </p>

                  <p className="font-medium text-gray-800 mt-1">
                    {user.phone}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-orange-600" />
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Département
                  </p>

                  <p className="font-medium text-gray-800 mt-1">
                    {user.department}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-indigo-600" />
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Rôle
                  </p>

                  <p className="font-medium text-gray-800 mt-1">
                    {user.role}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-gray-600" />
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Date de création
                  </p>

                  <p className="font-medium text-gray-800 mt-1">
                    {user.createdAt}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVITÉ */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Activité du compte
              </h2>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex gap-3">
                <Clock3 className="w-5 h-5 text-gray-400 shrink-0" />

                <div>
                  <p className="text-xs text-gray-500">
                    Dernière connexion
                  </p>

                  <p className="text-sm font-medium text-gray-800 mt-1">
                    {user.lastLogin}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />

                <div>
                  <p className="text-xs text-gray-500">
                    État du compte
                  </p>

                  <p className="text-sm font-medium text-green-700 mt-1">
                    Compte actif
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Activity className="w-5 h-5 text-purple-500 shrink-0" />

                <div>
                  <p className="text-xs text-gray-500">
                    Activité récente
                  </p>

                  <p className="text-sm font-medium text-gray-800 mt-1">
                    Utilisation régulière
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PERMISSIONS */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm mt-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Permissions principales
            </h2>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              "Gestion des utilisateurs",
              "Gestion des projets",
              "Suivi des bénéficiaires",
              "Évaluations et rapports",
            ].map((permission) => (
              <div
                key={permission}
                className="flex items-center gap-3 p-4 rounded-xl bg-gray-50"
              >
                <CheckCircle2 className="w-5 h-5 text-green-600" />

                <span className="text-sm text-gray-700">
                  {permission}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

