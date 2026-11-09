// src/services/securityStartup.service.ts
// Contrôles de sécurité au démarrage (cahier §6 et §10). N'AGIT que si NODE_ENV=production :
// en développement, rien ne change. Par défaut ils avertissent seulement ; SECURITY_STRICT_STARTUP=1
// fait refuser le démarrage tant qu'un point CRITIQUE subsiste.

import bcrypt from "bcrypt";

import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { hasCritical, securityWarnings } from "../utils/securityConfig";

/** Comptes de démonstration du seed (mots de passe connus) à ne jamais garder en production. */
const DEMO_ACCOUNTS: Array<{ email: string; password: string }> = [
  { email: "admin@ndao-hifanosika.org", password: "admin" },
  { email: "jean.rakoto@ndao-hifanosika.org", password: "password" },
  { email: "claire.andriamihaja@ndao-hifanosika.org", password: "password" },
];

async function demoPasswordsStillActive(): Promise<string[]> {
  const found: string[] = [];
  for (const account of DEMO_ACCOUNTS) {
    try {
      const user = await prisma.user.findUnique({ where: { email: account.email }, select: { password: true } });
      if (user && (await bcrypt.compare(account.password, user.password))) found.push(account.email);
    } catch {
      /* contrôle best-effort : ne jamais empêcher le démarrage à cause de lui */
    }
  }
  return found;
}

export function runStartupSecurityChecks(): void {
  if ((process.env.NODE_ENV ?? "development") !== "production") return;

  const warnings = securityWarnings(process.env);
  for (const w of warnings) {
    const line = `[sécurité:${w.code}] ${w.message}`;
    if (w.level === "info") logger.info(line);
    else logger.warn(line);
  }

  if (hasCritical(warnings) && ["1", "true"].includes(String(process.env.SECURITY_STRICT_STARTUP ?? "").toLowerCase())) {
    logger.error("Démarrage refusé : points de sécurité critiques (SECURITY_STRICT_STARTUP=1). Corrigez la configuration ci-dessus.");
    process.exit(1);
  }

  // Asynchrone et sans bloquer le démarrage (bcrypt est volontairement lent).
  void demoPasswordsStillActive().then((emails) => {
    if (emails.length > 0) {
      logger.warn(`[sécurité:SEED_PASSWORDS] Des comptes de démonstration gardent leur mot de passe d'origine : ${emails.join(", ")}. Changez-les ou supprimez ces comptes avant l'ouverture.`);
    }
  });
}
