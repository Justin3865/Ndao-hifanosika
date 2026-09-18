
import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";

export async function getUsers(
  _req: Request,
  res: Response,
): Promise<Response> {
  try {
    const users = await prisma.user.findMany({
      include: {
        department: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    logger.error("Erreur lors de la récupération des utilisateurs.", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les utilisateurs.",
    });
  }
}

export async function getUserById(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Identifiant utilisateur invalide.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        projectsCreated: true,
        internships: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    logger.error("Erreur lors de la récupération de l'utilisateur.", error);

    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
}

export async function createUser(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      gender,
      role,
      status,
      departmentId,
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Les champs obligatoires sont manquants.",
      });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Cette adresse e-mail est déjà utilisée.",
      });
    }

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password,
        phone: phone || null,
        gender: gender || null,
        role: role || "STAGIAIRE_L3",
        status: status || "PENDING",
        departmentId: departmentId
          ? Number(departmentId)
          : null,
      },
      include: {
        department: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Utilisateur créé avec succès.",
      user,
    });
  } catch (error) {
    logger.error("Erreur lors de la création de l'utilisateur.", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de créer l'utilisateur.",
    });
  }
}

export async function updateUser(
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
      status,
      departmentId,
    } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        gender,
        role,
        status,
        departmentId:
          departmentId === null
            ? null
            : departmentId !== undefined
              ? Number(departmentId)
              : undefined,
      },
      include: {
        department: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Utilisateur mis à jour avec succès.",
      user,
    });
  } catch (error) {
    logger.error("Erreur lors de la modification de l'utilisateur.", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de modifier l'utilisateur.",
    });
  }
}

export async function deleteUser(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    await prisma.user.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Utilisateur supprimé avec succès.",
    });
  } catch (error) {
    logger.error("Erreur lors de la suppression de l'utilisateur.", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de supprimer l'utilisateur.",
    });
  }
}

