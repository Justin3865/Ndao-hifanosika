
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme =
  | "Clair"
  | "Sombre"
  | "Système";

export type SettingsData = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  evaluationReminders: boolean;
  projectReminders: boolean;
  reportReminders: boolean;
  twoFactorAuth: boolean;
  sessionTimeout:
    | "15"
    | "30"
    | "60"
    | "120";
  theme: Theme;
  compactMode: boolean;
};

export const DEFAULT_SETTINGS: SettingsData = {
  emailNotifications: true,
  pushNotifications: true,
  evaluationReminders: true,
  projectReminders: true,
  reportReminders: true,
  twoFactorAuth: false,
  sessionTimeout: "30",
  theme: "Système",
  compactMode: false,
};

const STORAGE_KEY = "ndao-hifanosika-settings";

type SettingsContextType = {
  settings: SettingsData;

  updateSetting: <
    K extends keyof SettingsData
  >(
    key: K,
    value: SettingsData[K]
  ) => void;

  saveSettings: () => void;

  resetSettings: () => void;

  saved: boolean;

  hydrated: boolean;

  isDark: boolean;
};

const SettingsContext =
  createContext<SettingsContextType | undefined>(
    undefined
  );

export function SettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] =
    useState<SettingsData>(DEFAULT_SETTINGS);

  const [hydrated, setHydrated] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [systemDark, setSystemDark] =
    useState(false);

  /*
   * Charger les paramètres depuis localStorage
   */
  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(
          STORAGE_KEY
        );

      if (stored) {
        const parsed = JSON.parse(stored);

        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
        });
      }
    } catch (error) {
      console.error(
        "Erreur lors du chargement des paramètres :",
        error
      );
    } finally {
      setHydrated(true);
    }
  }, []);

  /*
   * Détecter le thème système
   */
  useEffect(() => {
    if (!hydrated) return;

    const mediaQuery =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

    const handleChange = () => {
      setSystemDark(mediaQuery.matches);
    };

    handleChange();

    mediaQuery.addEventListener(
      "change",
      handleChange
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleChange
      );
    };
  }, [hydrated]);

  /*
   * Déterminer si le thème sombre doit être actif
   */
  const isDark = useMemo(() => {
    if (settings.theme === "Sombre") {
      return true;
    }

    if (settings.theme === "Clair") {
      return false;
    }

    return systemDark;
  }, [settings.theme, systemDark]);

  /*
   * Appliquer le thème globalement
   */
  useEffect(() => {
    if (!hydrated) return;

    const html =
      document.documentElement;

    html.classList.toggle(
      "dark",
      isDark
    );

    html.classList.toggle(
      "compact-mode",
      settings.compactMode
    );

    html.style.colorScheme =
      isDark ? "dark" : "light";
  }, [
    hydrated,
    isDark,
    settings.compactMode,
  ]);

  /*
   * Modifier un paramètre
   */
  const updateSetting = <
    K extends keyof SettingsData
  >(
    key: K,
    value: SettingsData[K]
  ) => {
    setSettings((current) => {
      const updated: SettingsData = {
        ...current,
        [key]: value,
      };

      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(updated)
        );
      } catch (error) {
        console.error(
          "Erreur de sauvegarde automatique :",
          error
        );
      }

      return updated;
    });

    setSaved(false);
  };

  /*
   * Sauvegarder
   */
  const saveSettings = () => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(settings)
      );

      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error(
        "Erreur lors de l'enregistrement :",
        error
      );
    }
  };

  /*
   * Réinitialiser
   */
  const resetSettings = () => {
    const confirmed =
      window.confirm(
        "Voulez-vous vraiment réinitialiser tous les paramètres ?"
      );

    if (!confirmed) return;

    setSettings(DEFAULT_SETTINGS);

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(DEFAULT_SETTINGS)
      );
    } catch (error) {
      console.error(
        "Erreur lors de la réinitialisation :",
        error
      );
    }

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 3000);
  };

  const contextValue: SettingsContextType = {
    settings,
    updateSetting,
    saveSettings,
    resetSettings,
    saved,
    hydrated,
    isDark,
  };

  return (
    <SettingsContext.Provider
      value={contextValue}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context =
    useContext(SettingsContext);

  if (!context) {
    throw new Error(
      "useSettings doit être utilisé à l'intérieur de SettingsProvider."
    );
  }

  return context;
}

