
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "save":
      return (
        <svg {...common}>
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
          <path d="M17 21v-8H7v8" />
          <path d="M7 3v5h8" />
        </svg>
      );

    case "x":
      return (
        <svg {...common}>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      );

    default:
      return null;
  }
}

export default function CreateDepartementPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    responsable: "",
    email: "",
    telephone: "",
    status: "Actif",
  });

  const [error, setError] = useState("");

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!form.code.trim()) {
      setError("Le code du département est obligatoire.");
      return;
    }

    if (!form.name.trim()) {
      setError("Le nom du département est obligatoire.");
      return;
    }

    if (!form.responsable.trim()) {
      setError("Le responsable est obligatoire.");
      return;
    }

    if (!form.email.trim()) {
      setError("L'adresse email est obligatoire.");
      return;
    }

    /*
      TODO BACKEND

      Ici, plus tard :

      await fetch("http://localhost:5000/api/departements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

    */

    alert("Département créé avec succès.");

    router.push("/departements");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/departements" className="hover:text-green-700">
              Départements
            </Link>

            <Icon name="arrow" size={15} />

            <span>Nouveau département</span>
          </div>

          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            Créer un département
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Enregistrez un nouveau département de l'organisation.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  <Icon name="building" size={22} />
                </div>

                <div>
                  <h2 className="font-bold text-gray-900">
                    Informations générales
                  </h2>

                  <p className="text-sm text-gray-500">
                    Informations principales du département.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="code"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Code du département *
                </label>

                <input
                  id="code"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="Ex. DSI"
                  maxLength={10}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm uppercase outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />

                <p className="mt-1 text-xs text-gray-400">
                  Code court et unique.
                </p>
              </div>

              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Nom du département *
                </label>

                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Ex. Direction des Systèmes d'Information"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Décrivez les missions et responsabilités du département..."
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-6">
              <h2 className="font-bold text-gray-900">
                Responsable et contact
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Coordonnées de la personne responsable.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="responsable"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Responsable *
                </label>

                <input
                  id="responsable"
                  name="responsable"
                  value={form.responsable}
                  onChange={handleChange}
                  placeholder="Nom du responsable"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Adresse email *
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="departement@ndaohifanosika.org"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div>
                <label
                  htmlFor="telephone"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Téléphone
                </label>

                <input
                  id="telephone"
                  name="telephone"
                  type="tel"
                  value={form.telephone}
                  onChange={handleChange}
                  placeholder="+261 XX XX XXX XX"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Statut
                </label>

                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/departements"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Icon name="x" size={17} />
              Annuler
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800"
            >
              <Icon name="save" size={17} />
              Créer le département
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

