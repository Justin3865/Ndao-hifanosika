import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { parseIdentity } from "../utils/identity";

import { sendError } from "../middlewares/error.middleware";
export async function getBeneficiaries(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const projectId = req.query.projectId
      ? Number(req.query.projectId)
      : undefined;

    const beneficiaries = await prisma.beneficiary.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      data: beneficiaries,
    });
  } catch (error) {
    logger.error("Erreur récupération bénéficiaires", error);

    sendError(res, error, "Erreur lors de la récupération des bénéficiaires");
  }
}

export async function getBeneficiaryById(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Identifiant bénéficiaire invalide",
      });
      return;
    }

    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
      },
    });

    if (!beneficiary) {
      res.status(404).json({
        success: false,
        message: "Bénéficiaire introuvable",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: beneficiary,
    });
  } catch (error) {
    logger.error("Erreur récupération bénéficiaire", error);

    sendError(res, error, "Erreur lors de la récupération du bénéficiaire");
  }
}

type ParsedBody =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; message: string };

/**
 * Valide et normalise les champs numériques / ménage d'un bénéficiaire.
 * Valeur vide ("" ou null) = effacer le champ ; absente = inchangé.
 */
function parseBeneficiaryBody(body: Record<string, unknown>): ParsedBody {
  const specs: Array<[string, string, number, number, boolean]> = [
    ["age", "L'âge", 0, 130, true],
    ["altitude", "L'altitude", -500, 9000, false],
    ["latitude", "La latitude", -90, 90, false],
    ["longitude", "La longitude", -180, 180, false],
    ["homeLatitude", "La latitude du domicile", -90, 90, false],
    ["homeLongitude", "La longitude du domicile", -180, 180, false],
    ["homeAltitude", "L'altitude du domicile", -500, 9000, false],
    ["householdSize", "La taille du ménage", 1, 40, true],
    ["monthlyIncome", "Le revenu mensuel", 0, 1_000_000_000_000, false],
    ["childrenUnder5", "Le nombre d'enfants de moins de 5 ans", 0, 20, true],
    ["zoneId", "La zone", 1, 2_147_483_647, true],
  ];

  const data: Record<string, unknown> = {};

  for (const [key, label, min, max, integer] of specs) {
    const raw = body[key];

    if (raw === undefined) continue;

    if (raw === null || raw === "") {
      data[key] = null;
      continue;
    }

    const value = Number(raw);

    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      return { ok: false, message: `${label} est invalide.` };
    }

    data[key] = value;
  }

  if (body.locality !== undefined) {
    data.locality = body.locality ? String(body.locality).trim() || null : null;
  }

  if (body.hasDisability !== undefined) {
    data.hasDisability = body.hasDisability === true || body.hasDisability === "true";
  }

  // Naissance + CIN (validés : 12 chiffres, dates passées)
  const identity = parseIdentity(body);

  if (identity.error) return { ok: false, message: identity.error };

  Object.assign(data, identity.data);

  return { ok: true, data };
}

async function zoneExists(zoneId: unknown): Promise<boolean> {
  if (typeof zoneId !== "number") return true;

  return (await prisma.zone.findUnique({ where: { id: zoneId }, select: { id: true } })) !== null;
}

const numOrUndef = (v: unknown) =>
  v === undefined || v === null || v === "" ? undefined : Number(v);

export async function createBeneficiary(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const {
      projectId,
      firstName,
      lastName,
      gender,
      age,
      phone,
      email,
      vulnerable,
      altitude,
      zoneId,
      latitude,
      longitude,
    } = req.body;

    // Le prénom est facultatif (certaines personnes n'en ont pas)
    if (!projectId || !lastName) {
      res.status(400).json({
        success: false,
        message: "projectId et lastName sont obligatoires",
      });
      return;
    }

    const parsed = parseBeneficiaryBody(req.body);

    if (!parsed.ok) {
      res.status(400).json({ success: false, message: parsed.message });
      return;
    }

    if (!(await zoneExists(parsed.data.zoneId))) {
      res.status(400).json({ success: false, message: "Zone introuvable." });
      return;
    }

    const project = await prisma.project.findUnique({
      where: {
        id: Number(projectId),
      },
    });

    if (!project) {
      res.status(404).json({
        success: false,
        message: "Projet introuvable",
      });
      return;
    }

    const beneficiary = await prisma.beneficiary.create({
      data: {
        projectId: Number(projectId),
        firstName: firstName ?? "",
        lastName,
        gender,
        phone,
        email,
        vulnerable: vulnerable ?? false,
        ...parsed.data,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    logger.info(`Bénéficiaire créé : ${beneficiary.id}`);

    res.status(201).json({
      success: true,
      message: "Bénéficiaire créé avec succès",
      data: beneficiary,
    });
  } catch (error) {
    logger.error("Erreur création bénéficiaire", error);

    sendError(res, error, "Erreur lors de la création du bénéficiaire");
  }
}

export async function updateBeneficiary(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Identifiant bénéficiaire invalide",
      });
      return;
    }

    const existing = await prisma.beneficiary.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Bénéficiaire introuvable",
      });
      return;
    }

    const {
      projectId,
      firstName,
      lastName,
      gender,
      age,
      phone,
      email,
      vulnerable,
      altitude,
      zoneId,
      latitude,
      longitude,
    } = req.body;

    if (projectId !== undefined) {
      const project = await prisma.project.findUnique({
        where: {
          id: Number(projectId),
        },
      });

      if (!project) {
        res.status(404).json({
          success: false,
          message: "Projet introuvable",
        });
        return;
      }
    }

    const parsed = parseBeneficiaryBody(req.body);

    if (!parsed.ok) {
      res.status(400).json({ success: false, message: parsed.message });
      return;
    }

    if (!(await zoneExists(parsed.data.zoneId))) {
      res.status(400).json({ success: false, message: "Zone introuvable." });
      return;
    }

    const beneficiary = await prisma.beneficiary.update({
      where: { id },
      data: {
        projectId:
          projectId !== undefined ? Number(projectId) : undefined,
        firstName: firstName === null ? "" : firstName,
        lastName,
        gender,
        phone,
        email,
        vulnerable,
        ...parsed.data,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Bénéficiaire modifié avec succès",
      data: beneficiary,
    });
  } catch (error) {
    logger.error("Erreur modification bénéficiaire", error);

    sendError(res, error, "Erreur lors de la modification du bénéficiaire");
  }
}

export async function deleteBeneficiary(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Identifiant bénéficiaire invalide",
      });
      return;
    }

    const existing = await prisma.beneficiary.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Bénéficiaire introuvable",
      });
      return;
    }

    await prisma.beneficiary.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Bénéficiaire supprimé avec succès",
    });
  } catch (error) {
    logger.error("Erreur suppression bénéficiaire", error);

    sendError(res, error, "Erreur lors de la suppression du bénéficiaire");
  }
}