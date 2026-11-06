import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { computeAge } from "../utils/cin";
import { checkIdentityRules } from "../utils/identityRules";
import { parseIdentity } from "../utils/identity";
import { cinSexProblem, householdProblem, parseDisabilityTypes } from "../utils/fieldRules";

import { sendError } from "../middlewares/error.middleware";
import { beneficiaryMatricule, sortByMatricule } from "../utils/entityMatricule";
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

    sortByMatricule(beneficiaries, "matricule");

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

const ZONE_LEVELS = ["PROVINCE", "REGION", "DISTRICT", "COMMUNE", "FOKONTANY"];

/**
 * Sélection de zone envoyée par la carte : on ne garde que l'identité de chaque niveau
 * (id, nom, niveau, parents, emprise, centre), JAMAIS la géométrie (trop lourde pour une fiche).
 * Renvoie null (vide), false (invalide) ou le JSON allégé.
 */
function sanitizeZoneUnits(raw: unknown): string | null | false {
  if (raw === null || raw === "") return null;

  try {
    const geo: any = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (geo?.type !== "FeatureCollection" || !Array.isArray(geo.features)) return false;

    const nums = (v: unknown, size: number) =>
      Array.isArray(v) && v.length === size && v.every((n) => Number.isFinite(Number(n))) ? v.map(Number) : [];

    const features = geo.features.slice(0, 10).flatMap((f: any) => {
      const p = f?.properties ?? {};

      if (!p.id || !ZONE_LEVELS.includes(p.level)) return [];

      return [
        {
          type: "Feature",
          properties: {
            id: String(p.id).slice(0, 60),
            name: String(p.name ?? "").slice(0, 120),
            level: p.level,
            parentId: p.parentId ? String(p.parentId).slice(0, 60) : null,
            path: Array.isArray(p.path) ? p.path.slice(0, 5).map((n: unknown) => String(n).slice(0, 120)) : [],
            bbox: nums(p.bbox, 4),
            center: Number.isFinite(Number(p.center?.lat)) && Number.isFinite(Number(p.center?.lng)) ? { lat: Number(p.center.lat), lng: Number(p.center.lng) } : undefined,
          },
          geometry: null,
        },
      ];
    });

    return features.length ? JSON.stringify({ type: "FeatureCollection", features }) : null;
  } catch {
    return false;
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

  // Types de handicap (sélection multiple) : conservés seulement si le ménage compte une personne en situation de handicap
  if (body.disabilityTypes !== undefined || data.hasDisability === false) {
    const types = data.hasDisability === false ? [] : parseDisabilityTypes(body.disabilityTypes);

    if (types === null) return { ok: false, message: "Type de handicap invalide." };

    if (data.hasDisability === true && types.length === 0) {
      return { ok: false, message: "Choisissez au moins un type de handicap." };
    }

    data.disabilityTypes = types.length ? types.join(",") : null;
  }

  // Localisation administrative + adresse exacte (texte libre : lot, hameau / « zanabohitra »)
  const placeSpecs: Array<[string, string, number]> = [
    ["adminProvince", "La province", 120],
    ["adminRegion", "La région", 120],
    ["adminDistrict", "Le district", 120],
    ["adminCommune", "La commune", 120],
    ["adminFokontany", "Le fokontany", 120],
    ["addressDetail", "L'adresse exacte", 300],
  ];

  for (const [key, label, max] of placeSpecs) {
    if (body[key] === undefined) continue;

    const text = body[key] === null ? "" : String(body[key]).trim();

    if (text.length > max) {
      return { ok: false, message: `${label} est trop long(ue) (${max} caractères maximum).` };
    }

    data[key] = text || null;
  }

  if (body.zoneUnits !== undefined) {
    const units = sanitizeZoneUnits(body.zoneUnits);

    if (units === false) return { ok: false, message: "La sélection de zone est invalide." };

    data.zoneUnits = units;
  }

  // Cohérence du ménage : pas plus d'enfants de moins de 5 ans que de personnes dans le ménage
  const household = householdProblem(data.householdSize, data.childrenUnder5);
  if (household) return { ok: false, message: household };

  // Naissance + CIN (validés : 12 chiffres, dates passées)
  const identity = parseIdentity(body);

  if (identity.error) return { ok: false, message: identity.error };

  Object.assign(data, identity.data);

  // Âge calculé automatiquement depuis la date de naissance (non modifiable à la main)
  if (identity.data.birthDate instanceof Date) {
    const age = computeAge(identity.data.birthDate);
    if (age !== null) data.age = age;
  }

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

    {
      const sex = cinSexProblem(parsed.data.cinNumber, gender);

      if (sex) {
        res.status(400).json({ success: false, message: sex });
        return;
      }
    }

    {
      const rule = await checkIdentityRules(parsed.data, { names: { firstName, lastName } });

      if (rule) {
        res.status(400).json({ success: false, message: rule });
        return;
      }
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

    // Matricule : celui saisi (unique), sinon NH-AAAA-BEN-0001 généré automatiquement
    const givenMatricule =
      typeof req.body.matricule === "string" ? req.body.matricule.trim() : "";

    if (givenMatricule) {
      const taken = await prisma.beneficiary.findUnique({
        where: { matricule: givenMatricule },
        select: { id: true },
      });

      if (taken) {
        res.status(409).json({
          success: false,
          message: "Ce matricule de bénéficiaire existe déjà.",
        });
        return;
      }
    }

    const beneficiary = await beneficiaryMatricule.createWith(givenMatricule, (matricule) =>
      prisma.beneficiary.create({
        data: {
          projectId: Number(projectId),
          firstName: firstName ?? "",
          lastName,
          gender,
          phone,
          email,
          vulnerable: vulnerable ?? false,
          ...parsed.data,
          matricule,
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
      }),
    );

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

    {
      const sex = cinSexProblem(
        parsed.data.cinNumber !== undefined ? parsed.data.cinNumber : existing.cinNumber,
        gender !== undefined ? gender : existing.gender,
      );

      // Contrôlé seulement si le CIN ou le genre est modifié (une fiche ancienne reste modifiable sur les autres champs)
      if (sex && (parsed.data.cinNumber !== undefined || gender !== undefined)) {
        res.status(400).json({ success: false, message: sex });
        return;
      }
    }

    {
      const rule = await checkIdentityRules(parsed.data, { beneficiaryId: id });

      if (rule) {
        res.status(400).json({ success: false, message: rule });
        return;
      }
    }

    if (!(await zoneExists(parsed.data.zoneId))) {
      res.status(400).json({ success: false, message: "Zone introuvable." });
      return;
    }

    // Matricule modifiable (unique) ; vide ou inchangé = on ne touche à rien
    let newMatricule: string | undefined;

    if (typeof req.body.matricule === "string" && req.body.matricule.trim()) {
      const wanted = req.body.matricule.trim();

      if (wanted !== existing.matricule) {
        const taken = await prisma.beneficiary.findUnique({
          where: { matricule: wanted },
          select: { id: true },
        });

        if (taken && taken.id !== id) {
          res.status(409).json({
            success: false,
            message: "Ce matricule de bénéficiaire existe déjà.",
          });
          return;
        }

        newMatricule = wanted;
      }
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
        matricule: newMatricule,
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

/**
 * GET /api/beneficiaries/next-code
 * Prochain matricule de bénéficiaire proposé (NH-AAAA-BEN-0001, …).
 */
export async function nextBeneficiaryCode(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      data: { code: await beneficiaryMatricule.next() },
    });
  } catch (error) {
    logger.error("Erreur calcul du prochain matricule bénéficiaire", error);

    sendError(res, error, "Impossible de calculer le prochain matricule");
  }
}

/**
 * POST /api/beneficiaries/renumber  (ADMIN)
 * Remet tous les matricules de bénéficiaires en ordre selon la date de création.
 */
export async function renumberBeneficiaryMatricules(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const count = await beneficiaryMatricule.renumber();

    res.status(200).json({
      success: true,
      message: `${count} matricule(s) de bénéficiaire remis en ordre.`,
      data: { count },
    });
  } catch (error) {
    logger.error("Erreur remise en ordre des matricules bénéficiaires", error);

    sendError(res, error, "Impossible de remettre les matricules en ordre");
  }
}
