import { APIRequestContext, expect } from "@playwright/test";

export const API = process.env.E2E_API_URL ?? "http://localhost:4000/api";

/** Comptes créés par `npm run prisma:seed` (backend). Mot de passe des comptes hors ADMIN : « password ». */
const PASSWORD = process.env.E2E_PASSWORD ?? "password";
export const ACCOUNTS = {
  ADMIN: { email: "admin@ndao-hifanosika.org", password: process.env.E2E_ADMIN_PASSWORD ?? "admin" },
  DIRECTION: { email: "jean.rakoto@ndao-hifanosika.org", password: PASSWORD },
  RH: { email: "claire.andriamihaja@ndao-hifanosika.org", password: PASSWORD },
  DAF: { email: "paul.randria@ndao-hifanosika.org", password: PASSWORD },
  COMMUNICATION: { email: "nathalie.rabe@ndao-hifanosika.org", password: PASSWORD },
  COORDINATOR: { email: "hery.rakotomalala@ndao-hifanosika.org", password: PASSWORD },
} as const;

export type RoleName = keyof typeof ACCOUNTS;

/** Connexion par l'API : renvoie l'en-tête Authorization prêt à l'emploi. */
export async function login(request: APIRequestContext, role: RoleName): Promise<Record<string, string>> {
  const { email, password } = ACCOUNTS[role];
  const res = await request.post(`${API}/auth/login`, { data: { email, password } });
  expect(res.ok(), `connexion ${role} (${email}) : statut ${res.status()}`).toBeTruthy();
  const body = await res.json();
  return { Authorization: `Bearer ${body.data.accessToken}` };
}

/** Extrait une liste d'une réponse { data: [...] } ou { data: { items|rows|data: [...] } }. */
export function rows<T = Record<string, unknown>>(body: unknown): T[] {
  const data = (body as { data?: unknown })?.data ?? body;
  if (Array.isArray(data)) return data as T[];
  const inner = data as Record<string, unknown> | undefined;
  for (const key of ["items", "rows", "data", "beneficiaries"]) {
    if (Array.isArray(inner?.[key])) return inner[key] as T[];
  }
  return [];
}
