"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import api from "@/lib/axios";
import { disableDevicePush, enableDevicePush } from "@/lib/devicePush";
import { SessionGuard } from "./SessionGuard";
import { TwoFactorLoginGuard } from "./TwoFactorLoginGuard";

export type Theme = "Clair" | "Sombre" | "Système";

export type SettingsData = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  evaluationReminders: boolean;
  projectReminders: boolean;
  reportReminders: boolean;
  /** Lecture seule : l'état réel vient du serveur (voir TwoFactorPanel). */
  twoFactorAuth: boolean;
  sessionTimeout: "15" | "30" | "60" | "120";
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
const SAVE_DELAY = 800;
const TIMEOUTS = ["15", "30", "60", "120"];
const THEMES = ["Clair", "Sombre", "Système"];

type SettingsContextType = {
  settings: SettingsData;
  updateSetting: <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => void;
  saveSettings: () => void;
  resetSettings: () => void;
  saved: boolean;
  hydrated: boolean;
  isDark: boolean;
  /** Enregistrement sur le serveur en cours. */
  syncing: boolean;
  /** Message si l'enregistrement sur le serveur a échoué. */
  syncError: string;
  /** Retour de l'activation des notifications système de cet appareil. */
  pushHint: string;
  /** Appelé par le panneau 2FA après activation / désactivation. */
  setTwoFactorEnabled: (enabled: boolean) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/** Données du serveur (ou du cache local) -> réglages valides. */
function normalize(raw: Partial<Record<keyof SettingsData, unknown>> | null | undefined): SettingsData {
  const data = raw ?? {};
  const flag = (key: keyof SettingsData) => (typeof data[key] === "boolean" ? (data[key] as boolean) : DEFAULT_SETTINGS[key]);

  return {
    emailNotifications: flag("emailNotifications") as boolean,
    pushNotifications: flag("pushNotifications") as boolean,
    evaluationReminders: flag("evaluationReminders") as boolean,
    projectReminders: flag("projectReminders") as boolean,
    reportReminders: flag("reportReminders") as boolean,
    twoFactorAuth: flag("twoFactorAuth") as boolean,
    compactMode: flag("compactMode") as boolean,
    sessionTimeout: TIMEOUTS.includes(String(data.sessionTimeout)) ? (String(data.sessionTimeout) as SettingsData["sessionTimeout"]) : DEFAULT_SETTINGS.sessionTimeout,
    theme: THEMES.includes(String(data.theme)) ? (data.theme as Theme) : DEFAULT_SETTINGS.theme,
  };
}

/** Ce que le serveur enregistre (la 2FA a ses propres routes). */
function toServer(settings: SettingsData) {
  const { twoFactorAuth: _ignored, ...rest } = settings;
  void _ignored;
  return { ...rest, sessionTimeout: Number(rest.sessionTimeout) };
}

const signedIn = () => typeof window !== "undefined" && !!window.localStorage.getItem("accessToken");

function currentUserKey(): string | null {
  try {
    const user = JSON.parse(window.localStorage.getItem("user") || "null") as { id?: number } | null;
    return user?.id ? String(user.id) : null;
  } catch {
    return null;
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [systemDark, setSystemDark] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [pushHint, setPushHint] = useState("");

  const pathname = usePathname();
  const settingsRef = useRef<SettingsData>(DEFAULT_SETTINGS);
  const saveTimer = useRef<number | null>(null);
  const savedTimer = useRef<number | null>(null);
  const syncedFor = useRef<string | null>(null);

  /* Applique des réglages : état React + référence + cache du navigateur */
  const apply = useCallback((next: SettingsData) => {
    settingsRef.current = next;
    setSettings(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error("Erreur de sauvegarde locale :", error);
    }
  }, []);

  const flashSaved = useCallback(() => {
    setSaved(true);
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 3000);
  }, []);

  /* Enregistrement sur le serveur (synchronisé sur tous les appareils du compte) */
  const sync = useCallback(async (): Promise<boolean> => {
    if (!signedIn()) return true; // pas connecté : le cache local suffit

    setSyncing(true);

    try {
      await api.put("/settings", toServer(settingsRef.current));
      setSyncError("");
      return true;
    } catch {
      setSyncError("Enregistrement sur le serveur impossible : vos réglages restent sur cet appareil. Réessayez.");
      return false;
    } finally {
      setSyncing(false);
    }
  }, []);

  const scheduleSync = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);

    saveTimer.current = window.setTimeout(() => {
      void sync().then((ok) => ok && flashSaved());
    }, SAVE_DELAY);
  }, [sync, flashSaved]);

  /* 1) Cache local */
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const next = normalize(JSON.parse(stored));
        settingsRef.current = next;
        setSettings(next);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres :", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  /* 2) Réglages du compte : chargés à la connexion, rechargés si on change d'utilisateur */
  useEffect(() => {
    if (!hydrated) return;

    const key = signedIn() ? currentUserKey() : null;

    if (!key) {
      syncedFor.current = null;
      return;
    }

    if (syncedFor.current === key) return;
    syncedFor.current = key;

    api
      .get("/settings")
      .then((res) => {
        if (res.data?.data) apply(normalize(res.data.data));
      })
      .catch(() => {
        syncedFor.current = null; // nouvel essai au prochain changement de page
      });
  }, [hydrated, pathname, apply]);

  /* Thème du système */
  useEffect(() => {
    if (!hydrated) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemDark(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [hydrated]);

  const isDark = useMemo(() => {
    if (settings.theme === "Sombre") return true;
    if (settings.theme === "Clair") return false;
    return systemDark;
  }, [settings.theme, systemDark]);

  /* Apparence appliquée à toute l'application */
  useEffect(() => {
    if (!hydrated) return;

    const html = document.documentElement;

    html.classList.toggle("dark", isDark);
    html.classList.toggle("compact-mode", settings.compactMode);
    html.style.colorScheme = isDark ? "dark" : "light";

    // Mode compact : toute l'interface (textes et espacements en rem) passe à 87,5 %
    html.style.fontSize = settings.compactMode ? "14px" : "";
  }, [hydrated, isDark, settings.compactMode]);

  /* Notifications système de l'appareil (barre des tâches / téléphone) */
  const applyPush = useCallback(
    async (enabled: boolean) => {
      if (!enabled) {
        await disableDevicePush();
        setPushHint("Notifications système désactivées sur cet appareil.");
        return;
      }

      const result = await enableDevicePush();

      if (!result.ok) {
        // Refusé par le navigateur : le réglage revient à « désactivé »
        apply({ ...settingsRef.current, pushNotifications: false });
        scheduleSync();
        setPushHint(result.message ?? "Impossible d'activer les notifications sur cet appareil.");
        return;
      }

      setPushHint(
        result.pushActive
          ? "Activées sur cet appareil, même application fermée."
          : "Activées sur cet appareil tant que l'application reste ouverte.",
      );
    },
    [apply, scheduleSync],
  );

  const updateSetting = useCallback(
    <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
      if (key === "twoFactorAuth") return; // état réel géré par le panneau 2FA

      apply({ ...settingsRef.current, [key]: value });
      setSaved(false);
      scheduleSync();

      if (key === "pushNotifications") void applyPush(Boolean(value));
    },
    [apply, scheduleSync, applyPush],
  );

  const saveSettings = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);

    void sync().then((ok) => ok && flashSaved());
  }, [sync, flashSaved]);

  const resetSettings = useCallback(() => {
    const confirmed = window.confirm("Voulez-vous vraiment réinitialiser tous les paramètres ?");
    if (!confirmed) return;

    if (saveTimer.current) window.clearTimeout(saveTimer.current);

    apply({ ...DEFAULT_SETTINGS, twoFactorAuth: settingsRef.current.twoFactorAuth });
    setPushHint("");

    void sync().then((ok) => ok && flashSaved());
  }, [apply, sync, flashSaved]);

  const setTwoFactorEnabled = useCallback(
    (enabled: boolean) => apply({ ...settingsRef.current, twoFactorAuth: enabled }),
    [apply],
  );

  const contextValue: SettingsContextType = {
    settings,
    updateSetting,
    saveSettings,
    resetSettings,
    saved,
    hydrated,
    isDark,
    syncing,
    syncError,
    pushHint,
    setTwoFactorEnabled,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
      <TwoFactorLoginGuard />
      <SessionGuard minutes={Number(settings.sessionTimeout)} />
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error("useSettings doit être utilisé à l'intérieur de SettingsProvider.");
  }

  return context;
}
