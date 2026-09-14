// src/app/settings/page.tsx

"use client";

import Link from "next/link";

import {
  Settings,
  Bell,
  Shield,
  Palette,
  Database,
  Save,
  CheckCircle,
  ArrowLeft,
  Lock,
  Mail,
  Smartphone,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";

import {
  useSettings,
  type SettingsData,
} from "@/components/providers/settings-provider";

export default function SettingsPage() {
  const {
    settings,
    updateSetting,
    saveSettings,
    resetSettings,
    saved,
  } = useSettings();

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="border-b border-slate-200 bg-white">

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            {/* TITRE */}

            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>

              <div>

                <h1 className="text-2xl font-bold text-slate-900">
                  Paramètres
                </h1>

                <p className="text-sm text-slate-500">
                  Configuration générale de la plateforme
                  Ndao Hifanosika
                </p>

              </div>

            </div>

            {/* RETOUR */}

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />

              Retour au tableau de bord
            </Link>

          </div>

        </div>

      </div>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        <div className="grid gap-6 lg:grid-cols-3">

          {/* ==================================================
              MENU
          ================================================== */}

          <aside className="lg:col-span-1">

            <div className="sticky top-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Configuration
              </h2>

              <nav className="space-y-1">

                <a
                  href="#general"
                  className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-3 text-sm font-medium text-blue-700"
                >
                  <Settings className="h-5 w-5" />
                  Général
                </a>

                <a
                  href="#notifications"
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Bell className="h-5 w-5" />
                  Notifications
                </a>

                <a
                  href="#security"
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Shield className="h-5 w-5" />
                  Sécurité
                </a>

                <a
                  href="#appearance"
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Palette className="h-5 w-5" />
                  Apparence
                </a>

              </nav>

            </div>

          </aside>

          {/* ==================================================
              PARAMÈTRES
          ================================================== */}

          <section className="space-y-6 lg:col-span-2">

            {/* ==================================================
                GENERAL
            ================================================== */}

            <div
              id="general"
              className="rounded-xl border border-slate-200 bg-white shadow-sm"
            >

              <div className="border-b border-slate-200 p-6">

                <div className="flex items-center gap-3">

                  <Settings className="h-5 w-5 text-blue-600" />

                  <div>

                    <h2 className="font-semibold text-slate-900">
                      Paramètres généraux
                    </h2>

                    <p className="text-sm text-slate-500">
                      Configuration générale de la plateforme.
                    </p>

                  </div>

                </div>

              </div>

              <div className="space-y-5 p-6">

                <div className="rounded-lg bg-slate-50 p-4">

                  <div className="flex items-center gap-3">

                    <Database className="h-5 w-5 text-slate-500" />

                    <div>

                      <p className="text-sm font-medium text-slate-800">
                        Stockage des préférences
                      </p>

                      <p className="text-xs text-slate-500">
                        Les paramètres sont enregistrés
                        automatiquement dans votre navigateur.
                      </p>

                    </div>

                  </div>

                </div>

              </div>

            </div>

            {/* ==================================================
                NOTIFICATIONS
            ================================================== */}

            <div
              id="notifications"
              className="rounded-xl border border-slate-200 bg-white shadow-sm"
            >

              <div className="border-b border-slate-200 p-6">

                <div className="flex items-center gap-3">

                  <Bell className="h-5 w-5 text-orange-500" />

                  <div>

                    <h2 className="font-semibold text-slate-900">
                      Notifications
                    </h2>

                    <p className="text-sm text-slate-500">
                      Configurez les notifications de suivi et
                      d'évaluation.
                    </p>

                  </div>

                </div>

              </div>

              <div className="divide-y divide-slate-100">

                <SettingToggle
                  icon={<Mail className="h-5 w-5" />}
                  title="Notifications par e-mail"
                  description="Recevoir les notifications importantes par e-mail."
                  checked={
                    settings.emailNotifications
                  }
                  onChange={(value) =>
                    updateSetting(
                      "emailNotifications",
                      value,
                    )
                  }
                />

                <SettingToggle
                  icon={
                    <Smartphone className="h-5 w-5" />
                  }
                  title="Notifications push"
                  description="Recevoir les alertes directement sur l'appareil."
                  checked={
                    settings.pushNotifications
                  }
                  onChange={(value) =>
                    updateSetting(
                      "pushNotifications",
                      value,
                    )
                  }
                />

                <SettingToggle
                  icon={
                    <CheckCircle className="h-5 w-5" />
                  }
                  title="Rappels d'évaluation"
                  description="Recevoir un rappel avant les échéances d'évaluation."
                  checked={
                    settings.evaluationReminders
                  }
                  onChange={(value) =>
                    updateSetting(
                      "evaluationReminders",
                      value,
                    )
                  }
                />

                <SettingToggle
                  icon={
                    <Settings className="h-5 w-5" />
                  }
                  title="Rappels de projets"
                  description="Recevoir des alertes concernant les projets."
                  checked={
                    settings.projectReminders
                  }
                  onChange={(value) =>
                    updateSetting(
                      "projectReminders",
                      value,
                    )
                  }
                />

                <SettingToggle
                  icon={
                    <Database className="h-5 w-5" />
                  }
                  title="Rappels de rapports"
                  description="Recevoir les rappels concernant les rapports."
                  checked={
                    settings.reportReminders
                  }
                  onChange={(value) =>
                    updateSetting(
                      "reportReminders",
                      value,
                    )
                  }
                />

              </div>

            </div>

            {/* ==================================================
                SECURITE
            ================================================== */}

            <div
              id="security"
              className="rounded-xl border border-slate-200 bg-white shadow-sm"
            >

              <div className="border-b border-slate-200 p-6">

                <div className="flex items-center gap-3">

                  <Shield className="h-5 w-5 text-red-500" />

                  <div>

                    <h2 className="font-semibold text-slate-900">
                      Sécurité
                    </h2>

                    <p className="text-sm text-slate-500">
                      Configurez les options de sécurité du compte.
                    </p>

                  </div>

                </div>

              </div>

              <div className="space-y-5 p-6">

                <SettingToggle
                  icon={
                    <Lock className="h-5 w-5" />
                  }
                  title="Authentification à deux facteurs"
                  description="Renforcer la sécurité avec une deuxième étape d'authentification."
                  checked={
                    settings.twoFactorAuth
                  }
                  onChange={(value) =>
                    updateSetting(
                      "twoFactorAuth",
                      value,
                    )
                  }
                />

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Expiration de session
                  </label>

                  <select
                    value={
                      settings.sessionTimeout
                    }
                    onChange={(event) =>
                      updateSetting(
                        "sessionTimeout",
                        event.target.value as SettingsData["sessionTimeout"],
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >

                    <option value="15">
                      15 minutes
                    </option>

                    <option value="30">
                      30 minutes
                    </option>

                    <option value="60">
                      1 heure
                    </option>

                    <option value="120">
                      2 heures
                    </option>

                  </select>

                </div>

              </div>

            </div>

            {/* ==================================================
                APPARENCE
            ================================================== */}

            <div
              id="appearance"
              className="rounded-xl border border-slate-200 bg-white shadow-sm"
            >

              <div className="border-b border-slate-200 p-6">

                <div className="flex items-center gap-3">

                  <Palette className="h-5 w-5 text-purple-500" />

                  <div>

                    <h2 className="font-semibold text-slate-900">
                      Apparence
                    </h2>

                    <p className="text-sm text-slate-500">
                      Personnalisez l'affichage de la plateforme.
                    </p>

                  </div>

                </div>

              </div>

              <div className="space-y-5 p-6">

                {/* THEME */}

                <div>

                  <label className="mb-3 block text-sm font-medium text-slate-700">
                    Thème
                  </label>

                  <div className="grid grid-cols-3 gap-3">

                    {/* CLAIR */}

                    <ThemeButton
                      icon={
                        <Sun className="h-5 w-5" />
                      }
                      label="Clair"
                      active={
                        settings.theme ===
                        "Clair"
                      }
                      onClick={() =>
                        updateSetting(
                          "theme",
                          "Clair",
                        )
                      }
                    />

                    {/* SOMBRE */}

                    <ThemeButton
                      icon={
                        <Moon className="h-5 w-5" />
                      }
                      label="Sombre"
                      active={
                        settings.theme ===
                        "Sombre"
                      }
                      onClick={() =>
                        updateSetting(
                          "theme",
                          "Sombre",
                        )
                      }
                    />

                    {/* SYSTEME */}

                    <ThemeButton
                      icon={
                        <Monitor className="h-5 w-5" />
                      }
                      label="Système"
                      active={
                        settings.theme ===
                        "Système"
                      }
                      onClick={() =>
                        updateSetting(
                          "theme",
                          "Système",
                        )
                      }
                    />

                  </div>

                </div>

                {/* MODE COMPACT */}

                <SettingToggle
                  icon={
                    <Settings className="h-5 w-5" />
                  }
                  title="Mode compact"
                  description="Réduire l'espacement des éléments dans les tableaux."
                  checked={
                    settings.compactMode
                  }
                  onChange={(value) =>
                    updateSetting(
                      "compactMode",
                      value,
                    )
                  }
                />

              </div>

            </div>

            {/* ==================================================
                ACTIONS
            ================================================== */}

            <div className="sticky bottom-4 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <button
                  type="button"
                  onClick={resetSettings}
                  className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Réinitialiser
                </button>

                <div className="flex items-center gap-3">

                  {saved && (
                    <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                      <CheckCircle className="h-4 w-4" />

                      Paramètres enregistrés
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={saveSettings}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4" />

                    Enregistrer
                  </button>

                </div>

              </div>

            </div>

          </section>

        </div>

      </div>

    </main>
  );
}

/* ============================================================
   TOGGLE
============================================================ */

function SettingToggle({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (
    value: boolean,
  ) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-6">

      <div className="flex items-start gap-3">

        <div className="mt-0.5 text-slate-500">
          {icon}
        </div>

        <div>

          <p className="text-sm font-medium text-slate-800">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>

        </div>

      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() =>
          onChange(!checked)
        }
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked
            ? "bg-blue-600"
            : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
            checked
              ? "left-6"
              : "left-1"
          }`}
        />
      </button>

    </div>
  );
}

/* ============================================================
   THEME BUTTON
============================================================ */

function ThemeButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border px-3 py-4 text-sm font-medium transition ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}

      <span>
        {label}
      </span>

      {active && (
        <span className="text-xs font-normal">
          Actif
        </span>
      )}
    </button>
  );
}