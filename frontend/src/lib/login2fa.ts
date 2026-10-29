import type { AxiosResponse } from "axios";
import api from "@/lib/axios";

/**
 * Remplace `api.post("/auth/login", { email, password })`.
 * - compte sans 2FA : renvoie la réponse du login, comme avant ;
 * - compte avec 2FA : demande le code (getCode), le vérifie, puis finalise le login.
 */
export async function postLogin(
  email: string,
  password: string,
  getCode: (errorMessage?: string) => Promise<string>,
  url = "/auth/login",
): Promise<AxiosResponse> {
  const first = await api.post(url, { email, password });
  const step = first.data?.data;
  if (!step?.requires2FA) return first;

  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = await getCode(lastError || undefined);
    let proof: string | null = null;
    try {
      const res = await api.post("/auth/2fa/verify", { tempToken: step.tempToken, code });
      proof = res.data?.data?.twoFactorProof ?? null;
    } catch (e: any) {
      lastError = e?.response?.data?.message || "Code invalide.";
      if (e?.response?.status === 429 || /expir/i.test(lastError)) throw e;
    }
    if (proof) return api.post(url, { email, password, twoFactorProof: proof });
  }
  throw new Error("Trop de codes invalides. Reconnectez-vous.");
}
