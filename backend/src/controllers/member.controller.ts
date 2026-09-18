
import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";

export async function getMembers(
  _req: Request,
  res: Response,
): Promise<Response> {
  try {
    const members = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        gender: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        department: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: members.length,
      members,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération des membres.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les membres.",
    });
  }
}

export async function getMemberById(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    const member = await prisma.user.findFirst({
      where: {
        id,
        status: "ACTIVE",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        gender: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        department: true,
        projectsCreated: true,
        internships: true,
      },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Membre introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      member,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération du membre.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
}

export async function updateMember(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    const {
      firstName,
      lastName,
      email,
      phone,
      gender,
      role,
      departmentId,
    } = req.body;

    const member = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        gender,
        role,
        departmentId:
          departmentId === null
            ? null
            : departmentId !== undefined
              ? Number(departmentId)
              : undefined,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        gender: true,
        role: true,
        status: true,
        department: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Membre modifié avec succès.",
      member,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la modification du membre.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de modifier le membre.",
    });
  }
}

export async function deactivateMember(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    const member = await prisma.user.update({
      where: { id },
      data: {
        status: "INACTIVE",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Membre désactivé avec succès.",
      member,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la désactivation du membre.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de désactiver le membre.",
    });
  }
}

