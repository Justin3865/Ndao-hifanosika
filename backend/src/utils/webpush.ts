import { logger } from "../config/logger";
import { db } from "./db";

/**
 * Web Push (notifications système PC / téléphone, même application fermée).
 *
 * Activation (facultative — sans elle, rien ne casse) :
 *   1. npm i web-push
 *   2. npx web-push generate-vapid-keys
 *   3. VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY et VAPID_SUBJECT (ex. mailto:contact@exemple.mg) dans le .env
 */

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lib: any = null;
let initialised = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function init(): any {
  if (initialised) return lib;
  initialised = true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    lib = require("web-push");
    lib.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@localhost", publicKey, privateKey);
  } catch (error) {
    lib = null;
    logger.warn("Web Push désactivé : installez le paquet « web-push » (npm i web-push).", error);
  }

  return lib;
}

export function getPushPublicKey(): string | null {
  return init() ? (process.env.VAPID_PUBLIC_KEY ?? null) : null;
}

/** Envoie la notification système à tous les appareils abonnés de l'utilisateur (n'échoue jamais). */
export async function pushToUser(userId: number, payload: PushPayload): Promise<void> {
  try {
    const wp = init();
    if (!wp) return;

    const subscriptions = (await db.pushSubscription.findMany({
      where: { userId },
      select: { endpoint: true, p256dh: true, auth: true },
    })) as Array<{ endpoint: string; p256dh: string; auth: string }>;

    const body = JSON.stringify({
      ...payload,
      body: payload.body.slice(0, 160),
    });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await wp.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
            { TTL: 24 * 60 * 60, urgency: "high" },
          );
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;

          // Abonnement expiré / désinstallé : on le supprime
          if (status === 404 || status === 410) {
            await db.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } }).catch(() => undefined);
          } else {
            logger.error("Erreur envoi Web Push", error);
          }
        }
      }),
    );
  } catch (error) {
    logger.error("Erreur Web Push", error);
  }
}
