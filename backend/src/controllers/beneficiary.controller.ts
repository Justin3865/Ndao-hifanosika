import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";

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

    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des bénéficiaires",
    });
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

    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du bénéficiaire",
    });
  }
}

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
    } = req.body;

    if (!projectId || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        message: "projectId, firstName et lastName sont obligatoires",
      });
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
        firstName,
        lastName,
        gender,
        age: age !== undefined && age !== null ? Number(age) : undefined,
        phone,
        email,
        vulnerable: vulnerable ?? false,
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

    res.status(500).json({
      success: false,
      message: "Erreur lors de la création du bénéficiaire",
    });
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

    const beneficiary = await prisma.beneficiary.update({
      where: { id },
      data: {
        projectId:
          projectId !== undefined ? Number(projectId) : undefined,
        firstName,
        lastName,
        gender,
        age: age !== undefined ? Number(age) : undefined,
        phone,
        email,
        vulnerable,
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

    res.status(500).json({
      success: false,
      message: "Erreur lors de la modification du bénéficiaire",
    });
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

    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression du bénéficiaire",
    });
  }
}