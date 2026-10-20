import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { Server, Socket } from "socket.io";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { prisma } from "../config/database";

/**
 * Temps réel (WebSocket) :
 *  - namespace "/"      : personnel connecté (JWT). Salle "user:<id>" pour les
 *                         notifications, salle "tracking" pour la carte terrain.
 *  - namespace "/field" : bénéficiaire qui partage sa position avec son lien
 *                         personnel (jeton) APRÈS consentement.
 */

const TRACKING_ROLES = ["ADMIN", "DIRECTION", "COORDINATOR"];

let io: Server | null = null;

export function getIO(): Server | null {
  return io;
}

export function emitToUser(userId: number, event: string, payload: unknown) {
  io?.of("/").to(`user:${userId}`).emit(event, payload);
}

export function emitToTracking(event: string, payload: unknown) {
  io?.of("/").to("tracking").emit(event, payload);
}

// Anti-spam : une position max toutes les 2,5 s par bénéficiaire
const lastPing = new Map<string, number>();

export async function recordLocation(
  token: string,
  latitude: number,
  longitude: number,
  accuracy?: number,
): Promise<{ ok: boolean; reason?: string }> {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return { ok: false, reason: "coordonnees_invalides" };
  }

  const target = await prisma.beneficiary.findFirst({
    where: { trackingToken: token, trackingEnabled: true },
    select: { id: true, consentAt: true },
  });

  if (!target || !target.consentAt) {
    return { ok: false, reason: "suivi_non_autorise" };
  }

  // Limitation de fréquence : uniquement pour un lien valide et consenti
  const now = Date.now();
  if (now - (lastPing.get(token) ?? 0) < 2500) {
    return { ok: false, reason: "trop_frequent" };
  }
  lastPing.set(token, now);

  if (lastPing.size > 5000) {
    for (const [key, at] of lastPing) {
      if (now - at > 60_000) lastPing.delete(key);
    }
  }

  const updated = await prisma.beneficiary.update({
    where: { id: target.id },
    data: {
      latitude,
      longitude,
      locationAccuracy: accuracy ?? null,
      lastSeenAt: new Date(),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      vulnerable: true,
      age: true,
      latitude: true,
      longitude: true,
      locationAccuracy: true,
      lastSeenAt: true,
      project: { select: { id: true, name: true } },
    },
  });

  emitToTracking("target:location", updated);
  return { ok: true };
}

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  // ---- Personnel connecté ----
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("unauthorized"));

      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        userId: number;
        role: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true, status: true },
      });

      if (!user || user.status !== "ACTIVE") {
        return next(new Error("unauthorized"));
      }

      socket.data.userId = user.id;
      socket.data.role = user.role;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);

    if (TRACKING_ROLES.includes(socket.data.role)) {
      socket.join("tracking");
    }

    // ---- Mission : l'agent partage SA position avec son accord ----
    if (!String(socket.data.role).startsWith("STAGIAIRE_")) {
      const userId: number = socket.data.userId;
      let lastStaffPing = 0;

      socket.on("mission:start", async (ack?: (r: { ok: boolean }) => void) => {
        await prisma.user.update({ where: { id: userId }, data: { sharingLocation: true } });
        ack?.({ ok: true });
      });

      socket.on(
        "mission:location",
        async (
          p: { latitude: number; longitude: number; altitude?: number | null },
          ack?: (r: { ok: boolean }) => void,
        ) => {
          const latitude = Number(p?.latitude);
          const longitude = Number(p?.longitude);

          if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
            return ack?.({ ok: false });
          }

          if (Date.now() - lastStaffPing < 2000) return ack?.({ ok: false });
          lastStaffPing = Date.now();

          const altitude = p?.altitude !== undefined && p.altitude !== null ? Number(p.altitude) : null;

          const user = await prisma.user.update({
            where: { id: userId },
            data: { latitude, longitude, altitude, locationUpdatedAt: new Date(), sharingLocation: true },
            select: { id: true, firstName: true, lastName: true, role: true },
          });

          emitToTracking("staff:location", {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            latitude,
            longitude,
            altitude,
            updatedAt: new Date().toISOString(),
          });

          ack?.({ ok: true });
        },
      );

      const stop = async () => {
        await prisma.user
          .update({
            where: { id: userId },
            data: { sharingLocation: false, latitude: null, longitude: null, altitude: null },
          })
          .catch(() => undefined);

        emitToTracking("staff:offline", { id: userId });
      };

      socket.on("mission:stop", async (ack?: (r: { ok: boolean }) => void) => {
        await stop();
        ack?.({ ok: true });
      });

      // La position n'est plus partagée dès que l'agent se déconnecte
      socket.on("disconnect", () => {
        void stop();
      });
    }
  });

  // ---- Bénéficiaires (lien personnel) ----
  const field = io.of("/field");

  field.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token || token.length < 20) return next(new Error("unauthorized"));
    socket.data.token = token;
    next();
  });

  field.on("connection", (socket) => {
    socket.on(
      "location",
      async (
        payload: { latitude: number; longitude: number; accuracy?: number },
        ack?: (result: { ok: boolean; reason?: string }) => void,
      ) => {
        try {
          const result = await recordLocation(
            socket.data.token,
            Number(payload?.latitude),
            Number(payload?.longitude),
            payload?.accuracy !== undefined ? Number(payload.accuracy) : undefined,
          );
          ack?.(result);
        } catch (error) {
          logger.error("Erreur socket location", error);
          ack?.({ ok: false, reason: "erreur_serveur" });
        }
      },
    );
  });

  logger.success("WebSocket (socket.io) initialisé");
  return io;
}