
// src/app/users/create/page.tsx
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  UserPlus,
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Lock,
  Loader2,
} from "lucide-react";

export default function CreateUserPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    role: "",
    password: "",
    confirmPassword: "",
    status: "Actif",
  });

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      !form.role ||
      !form.password
    ) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);

    try {
      /*
       * Plus tard :
       *
       * POST /api/users
       *
       * avec les données du formulaire.
       */

      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );

      router.push("/users");
    } catch {
      setError(
        "Impossible de créer l'utilisateur."
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
            href="/users"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-purple-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux utilisateurs
          </Link>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 py-8 md:py-10">
        {/* TITRE */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-purple-600" />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Ajouter un utilisateur
              </h1>

              <p className="text-sm text-gray-500">
                Créer un nouveau compte utilisateur.
              </p>
            </div>
          </div>
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
            {/* INFORMATIONS PERSONNELLES */}
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
                      placeholder="Jean"
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
                    placeholder="Rakoto"
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
                      placeholder="jean@ndao-hifanosika.org"
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
                      placeholder="+261 34 00 000 00"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ORGANISATION */}
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
                      <option value="">
                        Sélectionner un département
                      </option>
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
                      <option value="">
                        Sélectionner un rôle
                      </option>
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

            {/* SECURITE */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">
                Sécurité
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de passe *
                  </label>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        handleChange(
                          "password",
                          e.target.value
                        )
                      }
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmer le mot de passe *
                  </label>

                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      handleChange(
                        "confirmPassword",
                        e.target.value
                      )
                    }
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-6 md:px-8 py-5 bg-gray-50 border-t border-gray-200">
            <Link
              href="/users"
              className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-white transition"
            >
              Annuler
            </Link>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Créer l'utilisateur
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
