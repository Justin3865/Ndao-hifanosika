import { prisma } from "../config/database";

const BOOLS = [
  "emailNotifications", "pushNotifications", "evaluationReminders",
  "projectReminders", "reportReminders", "compactMode",
] as const;
export type BoolKey = (typeof BOOLS)[number];

export type UserSettingsData = Record<BoolKey, boolean> & {
  sessionTimeout: "15" | "30" | "60" | "120";
  theme: "Clair" | "Sombre" | "Système";
};

export const DEFAULT_USER_SETTINGS: UserSettingsData = {
  emailNotifications: true,
  pushNotifications: true,
  evaluationReminders: true,
  projectReminders: true,
  reportReminders: true,
  compactMode: false,
  sessionTimeout: "30",
  theme: "Système",
};

const TIMEOUTS = ["15", "30", "60", "120"];
const THEMES = ["Clair", "Sombre", "Système"];

/** Ne garde que les clés connues et valides. La 2FA n'est JAMAIS modifiable ici. */
export function sanitizeSettings(input: any): Partial<UserSettingsData> {
  const out: any = {};
  if (!input || typeof input !== "object") return out;
  for (const k of BOOLS) if (typeof input[k] === "boolean") out[k] = input[k];
  if (TIMEOUTS.includes(String(input.sessionTimeout))) out.sessionTimeout = String(input.sessionTimeout);
  if (THEMES.includes(input.theme)) out.theme = input.theme;
  return out;
}

function merge(row: { settings?: unknown; notifyEmail?: boolean } | null): UserSettingsData {
  const stored = row?.settings && typeof row.settings === "object" ? sanitizeSettings(row.settings) : {};
  return {
    ...DEFAULT_USER_SETTINGS,
    ...stored,
    // User.notifyEmail est la source de vérité (déjà utilisée par notify.ts)
    emailNotifications: row ? Boolean(row.notifyEmail) : DEFAULT_USER_SETTINGS.emailNotifications,
  };
}

export async function getUserSettings(userId: number): Promise<UserSettingsData> {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { settings: true, notifyEmail: true } });
  return merge(row);
}

export async function saveUserSettings(userId: number, input: unknown): Promise<UserSettingsData> {
  const merged = { ...(await getUserSettings(userId)), ...sanitizeSettings(input) };
  const { emailNotifications, ...rest } = merged;
  await prisma.user.update({
    where: { id: userId },
    data: { settings: rest as never, notifyEmail: emailNotifications },
  });
  return merged;
}

export async function resetUserSettings(userId: number): Promise<UserSettingsData> {
  const { emailNotifications, ...rest } = DEFAULT_USER_SETTINGS;
  await prisma.user.update({
    where: { id: userId },
    data: { settings: rest as never, notifyEmail: emailNotifications },
  });
  return { ...DEFAULT_USER_SETTINGS };
}

/** Le compte est actif ET l'utilisateur a laissé ce réglage activé. */
export async function userAllows(userId: number, key: BoolKey): Promise<boolean> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, settings: true, notifyEmail: true },
  });
  if (!row || row.status !== "ACTIVE") return false;
  return merge(row)[key];
}
