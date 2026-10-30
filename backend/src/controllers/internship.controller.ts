import { Request, Response } from "express";
import { prisma } from "../config/database";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { logger } from "../config/logger";
import { sendEmail } from "../utils/mailer";
import { parseIdentity, toText } from "../utils/identity";
import {
  canSeeInternship,
  getReqUser,
  internshipScope,
} from "../utils/dataScope";

import { sendError } from "../middlewares/error.middleware";
/** Identité du stagiaire saisie dans le formulaire du stage (téléphone, naissance, CIN) */
function readStudentIdentity(body: Record<string, unknown> | undefined): { data: Record<string, unknown>; error?: string } {
  const raw = body?.identity;

  if (!raw || typeof raw !== "object") return { data: {} };

  const source = raw as Record<string, unknown>;
  const parsed = parseIdentity(source);

  if (parsed.error) return parsed;

  const data = { ...parsed.data };

  if (source.phone !== undefined) {
    const phone = toText(source.phone);

    if (phone && phone.length > 30) return { data, error: "Numéro de téléphone invalide." };

    if (phone) data.phone = phone;
  }

  return { data };
}

/**
 * Nouveau stagiaire saisi dans le formulaire du stage : crée (ou retrouve par e-mail) le compte stagiaire.
 * Réservé à l'ADMIN et au RH. Aucun mot de passe n'est envoyé : la personne utilise « Mot de passe oublié ».
 */
async function createStudentFromBody(
  body: Record<string, any> | undefined,
  requesterRole: string | undefined,
): Promise<{ id?: number; error?: string; status?: number }> {
  const person = body?.newStudent;

  if (body?.studentId || !person || typeof person !== "object") return {};

  if (!requesterRole || !["ADMIN", "RH"].includes(requesterRole)) {
    return { error: "Seuls l'administrateur et le RH peuvent créer un compte stagiaire.", status: 403 };
  }

  // Le prénom est facultatif : certaines personnes n'en ont pas (colonne conservée vide)
  const firstName = toText(person.firstName) ?? "";
  const lastName = toText(person.lastName);
  const email = toText(person.email)?.toLowerCase();

  if (!lastName || !email) {
    return { error: "Le nom et l'e-mail du nouveau stagiaire sont obligatoires." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Adresse e-mail du stagiaire invalide." };

  if (!body?.title || !body?.startDate) return { error: "Le titre et la date de début du stage sont obligatoires." };

  const identity = readStudentIdentity(body);

  if (identity.error) return { error: identity.error };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });

  if (existing) {
    if (["STAGIAIRE_L3", "STAGIAIRE_M2"].includes(String(existing.role))) return { id: existing.id };

    return { error: "Un compte non stagiaire utilise déjà cet e-mail." };
  }

  const role = person.role === "STAGIAIRE_M2" ? "STAGIAIRE_M2" : "STAGIAIRE_L3";
  const password = `${randomBytes(9).toString("base64url")}aA1!`;

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: await bcrypt.hash(password, 12),
      role: role as never,
      status: "ACTIVE" as never,
    },
    select: { id: true },
  });

  try {
    const base = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

    await sendEmail(
      email,
      "Votre compte — Ndao Hifanosika",
      `Bonjour ${firstName || lastName},\n\nUn compte stagiaire a été créé pour votre stage « ${String(body.title)} ».\nPour définir votre mot de passe : ${base}/login puis « Mot de passe oublié » avec cette adresse e-mail.\n\n— Ndao Hifanosika`,
    );
  } catch (error) {
    logger.error("E-mail de bienvenue du stagiaire non envoyé", error);
  }

  return { id: user.id };
}

async function saveStudentIdentity(studentId: number, data: Record<string, unknown>): Promise<void> {
  if (Object.keys(data).length === 0) return;

  await prisma.user.update({ where: { id: studentId }, data: data as never });
}

export async function getInternships(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const studentId = req.query.studentId
      ? Number(req.query.studentId)
      : undefined;

    const supervisorId = req.query.supervisorId
      ? Number(req.query.supervisorId)
      : undefined;

    const projectId = req.query.projectId
      ? Number(req.query.projectId)
      : undefined;

    const scope = internshipScope(getReqUser(req));

    const internships = await prisma.internship.findMany({
      where: {
        AND: [
          {
            ...(studentId ? { studentId } : {}),
            ...(supervisorId ? { supervisorId } : {}),
            ...(projectId ? { projectId } : {}),
          },
          scope,
        ],
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      data: internships,
    });
  } catch (error) {
    logger.error("Erreur récupération stages", error);

    sendError(res, error, "Erreur lors de la récupération des stages");
  }
}

export async function getInternshipById(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Identifiant stage invalide",
      });
      return;
    }

    const internship = await prisma.internship.findUnique({
      where: { id },
      include: {
        project: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    if (!internship) {
      res.status(404).json({
        success: false,
        message: "Stage introuvable",
      });
      return;
    }

    // Un stagiaire / tuteur ne voit que ses propres stages
    if (!canSeeInternship(getReqUser(req), internship)) {
      res.status(404).json({
        success: false,
        message: "Stage introuvable",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: internship,
    });
  } catch (error) {
    logger.error("Erreur récupération stage", error);

    sendError(res, error, "Erreur lors de la récupération du stage");
  }
}

export async function createInternship(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    // Nouveau stagiaire saisi dans le formulaire : le compte est créé avant le stage
    const created = await createStudentFromBody(req.body, getReqUser(req)?.role);

    if (created.error) {
      res.status(created.status ?? 400).json({ success: false, message: created.error });
      return;
    }

    if (created.id) req.body.studentId = created.id;

    const {
      projectId,
      studentId,
      supervisorId,
      title,
      institution,
      startDate,
      endDate,
      status,
      description,
    } = req.body;

    if (!studentId || !title || !startDate) {
      res.status(400).json({
        success: false,
        message: "studentId, title et startDate sont obligatoires",
      });
      return;
    }

    if (endDate && new Date(endDate).getTime() < new Date(startDate).getTime()) {
      res.status(400).json({
        success: false,
        message: "La date de fin doit être postérieure à la date de début.",
      });
      return;
    }

    const student = await prisma.user.findUnique({
      where: {
        id: Number(studentId),
      },
    });

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Étudiant introuvable",
      });
      return;
    }

    if (supervisorId) {
      const supervisor = await prisma.user.findUnique({
        where: {
          id: Number(supervisorId),
        },
      });

      if (!supervisor) {
        res.status(404).json({
          success: false,
          message: "Tuteur introuvable",
        });
        return;
      }
    }

    if (projectId) {
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

    const identity = readStudentIdentity(req.body);

    if (identity.error) {
      res.status(400).json({ success: false, message: identity.error });
      return;
    }

    const internship = await prisma.internship.create({
      data: {
        projectId: projectId ? Number(projectId) : undefined,
        studentId: Number(studentId),
        supervisorId: supervisorId
          ? Number(supervisorId)
          : undefined,
        title,
        institution,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        status: status ?? "PENDING",
        description,
      },
      include: {
        project: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    await saveStudentIdentity(Number(studentId), identity.data);

    res.status(201).json({
      success: true,
      message: "Stage créé avec succès",
      data: internship,
    });
  } catch (error) {
    logger.error("Erreur création stage", error);

    sendError(res, error, "Erreur lors de la création du stage");
  }
}

export async function updateInternship(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Identifiant stage invalide",
      });
      return;
    }

    const existing = await prisma.internship.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Stage introuvable",
      });
      return;
    }

    const {
      projectId,
      studentId,
      supervisorId,
      title,
      institution,
      startDate,
      endDate,
      status,
      description,
    } = req.body;

    {
      const effectiveStart = startDate ? new Date(startDate) : existing.startDate;
      const effectiveEnd =
        endDate !== undefined ? (endDate ? new Date(endDate) : null) : existing.endDate;

      if (effectiveEnd && effectiveStart && effectiveEnd.getTime() < effectiveStart.getTime()) {
        res.status(400).json({
          success: false,
          message: "La date de fin doit être postérieure à la date de début.",
        });
        return;
      }
    }

    const identity = readStudentIdentity(req.body);

    if (identity.error) {
      res.status(400).json({ success: false, message: identity.error });
      return;
    }

    const internship = await prisma.internship.update({
      where: { id },
      data: {
        projectId:
          projectId !== undefined
            ? projectId
              ? Number(projectId)
              : null
            : undefined,
        studentId:
          studentId !== undefined ? Number(studentId) : undefined,
        supervisorId:
          supervisorId !== undefined
            ? supervisorId
              ? Number(supervisorId)
              : null
            : undefined,
        title,
        institution,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate:
          endDate !== undefined
            ? endDate
              ? new Date(endDate)
              : null
            : undefined,
        status,
        description,
      },
    });

    await saveStudentIdentity(internship.studentId, identity.data);

    res.status(200).json({
      success: true,
      message: "Stage modifié avec succès",
      data: internship,
    });
  } catch (error) {
    logger.error("Erreur modification stage", error);

    sendError(res, error, "Erreur lors de la modification du stage");
  }
}

export async function deleteInternship(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Identifiant stage invalide",
      });
      return;
    }

    const existing = await prisma.internship.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Stage introuvable",
      });
      return;
    }

    await prisma.internship.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Stage supprimé avec succès",
    });
  } catch (error) {
    logger.error("Erreur suppression stage", error);

    sendError(res, error, "Erreur lors de la suppression du stage");
  }
}