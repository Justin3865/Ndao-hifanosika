import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { answerQuestion } from "../ml/chatbot";
import { haversineKm } from "../ml/geo";
import { listModels, scoreHouseholds, trainVulnerabilityModels } from "../ml/vulnerability";

import { sendError } from "../middlewares/error.middleware";
import { trainExternalMl } from "../services/pyservices.service";
export async function trainModels(_req: Request, res: Response) {
  try {
    const report = await trainVulnerabilityModels();
    const mlService = await trainExternalMl();

    res.json({ success: true, data: report, ...(mlService ? { mlService } : {}) });
  } catch (error) {
    logger.error("Erreur entraînement", error);
    sendError(res, error, "Erreur lors de l'entraînement");
  }
}

export async function getModels(_req: Request, res: Response) {
  try {
    res.json({ success: true, data: await listModels() });
  } catch (error) {
    logger.error("Erreur modèles", error);
    sendError(res, error, "Erreur serveur");
  }
}

/** Ménages notés + agent le plus proche (carte). */
export async function getHouseholds(_req: Request, res: Response) {
  try {
    const [households, staffRows] = await Promise.all([
      scoreHouseholds(),
      prisma.user.findMany({
        where: { sharingLocation: true, latitude: { not: null }, longitude: { not: null } },
        select: { id: true, firstName: true, lastName: true, latitude: true, longitude: true, altitude: true, locationUpdatedAt: true },
      }),
    ]);

    const limit = Date.now() - 6 * 3600 * 1000;
    const staff = staffRows.filter((s) => s.locationUpdatedAt && s.locationUpdatedAt.getTime() > limit);

    const data = households
      .map((h) => {
        let nearest: { id: number; name: string; distanceKm: number } | null = null;

        if (h.latitude !== null && h.longitude !== null) {
          for (const s of staff) {
            const km = haversineKm(h.latitude, h.longitude, s.latitude as number, s.longitude as number);
            if (!nearest || km < nearest.distanceKm) {
              nearest = { id: s.id, name: `${s.firstName} ${s.lastName}`, distanceKm: Math.round(km * 10) / 10 };
            }
          }
        }

        const { raw, ...rest } = h;
        void raw;
        return { ...rest, nearestStaff: nearest };
      })
      .sort((a, b) => b.score - a.score);

    res.json({ success: true, data });
  } catch (error) {
    logger.error("Erreur ménages", error);
    sendError(res, error, "Erreur serveur");
  }
}

export async function chat(req: Request, res: Response) {
  try {
    const message = String(req.body?.message ?? "").trim();

    if (!message || message.length > 500) {
      return res.status(400).json({ success: false, message: "Message vide ou trop long" });
    }

    res.json({ success: true, data: await answerQuestion(message) });
  } catch (error) {
    logger.error("Erreur chatbot", error);
    sendError(res, error, "Erreur du chatbot");
  }
}
