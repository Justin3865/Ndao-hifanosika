
// src/app/users/[id]/edit/page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Loader2,
} from "lucide-react";

const demoUsers = [
  {
    id: "1",
    firstName: "Jean",
    lastName: "Rakoto",
    email: "jean.rakoto@ndao-hifanosika.org",
    phone: "+261 34 00 000 01",
    department: "Direction",
    role: "Administrateur",
    status: "Actif",
  },
  {
    id: "2",
    firstName: "Marie",
    lastName: "Andria",
    email: "marie.andria@ndao-hifanosika.org",
    phone: "+261 34 00 000 02",
    department: "DSI",
    role: "Responsable S&E",
    status: "Actif",
  },
  {
    id: "3",
    firstName: "Paul",
    lastName: "Rabe",
    email: "paul.rabe@ndao-hifanosika.org",
    phone: "+261 34 00 000 03",
    department: "Communication",
    role: "Chef de projet",
    status: "Actif",
  },
];

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const existingUser =
    demoUsers.find((user) => user.id === id) ||
    demoUsers[0];

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    role: "",
    status: "Actif",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      email: existingUser.email,
      phone: existingUser.phone,
      department: existingUser.department,
      role: existingUser.role,
      status: existingUser.status,
    });
  }, [
    existingUser.firstName,
    existingUser.lastName,
    existingUser.email,
    existingUser.phone,
    existingUser.department,
    existingUser.role,
    existingUser.status,
  ]);

  const handleChange = (
    field: string,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (
      !form.firstName ||
      !form.lastName ||
      !form.email ||
      !form.department ||
      !form.role
    ) {
      setError(
        "Veuillez remplir tous les champs obligatoires."
      );
      return;
    }

    setIsLoading(true);

    try {
      /*
       * Plus tard :
       *
       * PUT /api/users/:id
       *
       * avec les données du formulaire.
       */

      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );

      router.push(`/users/${id}`);
    } catch {
      setError(
        "Impossible de modifier l'utilisateur."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-6 lg:px-8 py-4">
          <Link
            href={`/users/${id}`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-purple-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au profil
          </Link>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 py-8 md:py-10">
        {/* TITRE */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Modifier l'utilisateur
          </h1>

          <p className="text-gray-500 mt-1">
            Modifiez les informations et les accès du compte.
          </p>
        </div>

        {/* ERREUR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* FORMULAIRE */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm"
        >
          <div className="p-6 md:p-8 space-y-8">
            {/* IDENTITÉ */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-5">
                Informations personnelles
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom *
                  </label>

                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                    <input
                      value={form.firstName}
                      onChange={(e) =>
                        handleChange(
                          "firstName",
                          e.target.value
                        )
                      }
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom *
                  </label>

                  <input
                    value={form.lastName}
                    onChange={(e) =>
                      handleChange(
                        "lastName",
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse e-mail *
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        handleChange(
                          "email",
                          e.target.value
                        )
                      }
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>

                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                    <input
                      value={form.phone}
                      onChange={(e) =>
                        handleChange(
                          "phone",
                          e.target.value
                        )
                      }
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ACCÈS */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">
                Organisation et accès
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Département *
                  </label>

                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                    <select
                      value={form.department}
                      onChange={(e) =>
                        handleChange(
                          "department",
                          e.target.value
                        )
                      }
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    >
                      <option value="Direction">
                        Direction
                      </option>
                      <option value="DSI">DSI</option>
                      <option value="DAF">DAF</option>
                      <option value="Communication">
                        Communication
                      </option>
                      <option value="RH">RH</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rôle *
                  </label>

                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                    <select
                      value={form.role}
                      onChange={(e) =>
                        handleChange(
                          "role",
                          e.target.value
                        )
                      }
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    >
                      <option value="Administrateur">
                        Administrateur
                      </option>
                      <option value="Responsable S&E">
                        Responsable S&E
                      </option>
                      <option value="Chef de projet">
                        Chef de projet
                      </option>
                      <option value="Évaluateur">
                        Évaluateur
                      </option>
                      <option value="Coordinateur">
                        Coordinateur
                      </option>
                      <option value="Assistant">
                        Assistant
                      </option>
                      <option value="Agent terrain">
                        Agent terrain
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut
                  </label>

                  <select
                    value={form.status}
                    onChange={(e) =>
                      handleChange(
                        "status",
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-purple-500"
                  >
                    <option value="Actif">
                      Actif
                    </option>
                    <option value="Inactif">
                      Inactif
                    </option>
                    <option value="Suspendu">
                      Suspendu
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-6 md:px-8 py-5 bg-gray-50 border-t border-gray-200">
            <Link
              href={`/users/${id}`}
              className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-white"
            >
              Annuler
            </Link>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Enregistrer les modifications
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
