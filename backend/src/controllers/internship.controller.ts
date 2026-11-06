import { Request, Response } from "express";
import { prisma } from "../config/database";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { logger } from "../config/logger";
import { sendEmail } from "../utils/mailer";
import { cinOwnerName, parseIdentity, toText } from "../utils/identity";
import {
  findOverlap,
  validateDates,
  validateParticipants,
  validateStatusAgainstDates,
} from "../utils/internshipRules";
import {
  canSeeInternship,
  getReqUser,
  internshipScope,
} from "../utils/dataScope";

import { sendError } from "../middlewares/error.middleware";
import { MatriculeError, changeMatricule, findSiblingMatricule, getOrAssignMatricule, renumberMatricules, suggestNextMatricule } from "../utils/matricule";
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

  {
    const owner = await cinOwnerName(identity.data.cinNumber as string | null | undefined);
    if (owner) return { error: `Ce numéro de CIN est déjà enregistré pour ${owner}.`, status: 409 };
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });

  if (existing) {
    if (["STAGIAIRE_L3", "STAGIAIRE_M2", "STAGIAIRE_L1", "STAGIAIRE_L2", "STAGIAIRE_M1"].includes(String(existing.role))) return { id: existing.id };

    return { error: "Un compte non stagiaire utilise déjà cet e-mail." };
  }

  // Niveau : L3, M2, ou « Autre » (niveau libre précisé par l'utilisateur, compte créé avec les droits d'un stagiaire L3)
  // L1 / L2 / M1 sont des niveaux « Autres » : même fonctionnement que l'option « Autre » (niveau libre)
  const OTHER_LEVELS: Record<string, string> = { STAGIAIRE_L1: "L1", STAGIAIRE_L2: "L2", STAGIAIRE_M1: "M1" };
  const fixedOther = OTHER_LEVELS[String(person.role)] ?? null;
  const isOtherLevel = person.role === "AUTRE" || fixedOther !== null;
  const otherLevel = fixedOther ?? (isOtherLevel ? toText(person.otherLevel) : null);

  if (isOtherLevel && !otherLevel) return { error: "Précisez le niveau du stagiaire (option « Autre »)." };

  const role = person.role === "STAGIAIRE_M2" ? "STAGIAIRE_M2" : "STAGIAIRE_L3";
  const password = `${randomBytes(9).toString("base64url")}aA1!`;

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: await bcrypt.hash(password, 12),
      role: role as never,
      ...(otherLevel ? { studentLevel: otherLevel } : {}),
      status: "ACTIVE" as never,
    } as never,
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

/** Texte libre nettoyé (null s'il est vide). */
function cleanFreeText(value: unknown): string | null {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 120) : null;
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
            ...(projectId ? { OR: [{ projectId }, { projectLinks: { some: { projectId } } }] } : {}),
          },
          scope,
        ],
      },
      include: {
        ...projectLinksInclude,
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
            matricule: true,
            studentLevel: true,
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

    // Stagiaires déjà inscrits mais sans matricule : il leur est attribué (une seule fois, dans l'ordre d'inscription)
    const missing = Array.from(
      new Map(
        internships
          .filter((i) => i.student && !(i.student as { matricule?: string | null }).matricule)
          .map((i) => [i.student.id, i.student.id] as const),
      ).keys(),
    ).sort((x, y) => x - y);

    for (const studentId of missing) {
      try {
        const { matricule } = await getOrAssignMatricule(studentId);

        for (const i of internships) {
          if (i.student?.id === studentId) (i.student as { matricule?: string | null }).matricule = matricule;
        }
      } catch (error) {
        logger.error("Attribution du matricule impossible", error);
      }
    }

    // Nouveaux matricules attribués : on remet tout en ordre (0001, 0002, … sans trou) pour ne pas laisser de saut (ex. 0009 puis 0013)
    if (missing.length > 0) {
      try {
        await renumberMatricules();
      } catch (error) {
        logger.error("Renumérotation des matricules impossible", error);
      }
    }

    // Les matricules ont pu changer : on relit ceux des stagiaires de la liste (le compte secondaire d'une même personne reprend celui du compte principal)
    {
      const ids = Array.from(new Set(internships.map((i) => i.student?.id).filter((v): v is number => typeof v === "number")));
      const rows = ids.length
        ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, matricule: true } })
        : [];
      const fresh = new Map<number, string | null>(rows.map((u) => [u.id, (u as { matricule?: string | null }).matricule ?? null]));

      for (const id of ids) {
        if (!fresh.get(id)) {
          try {
            fresh.set(id, await findSiblingMatricule(id));
          } catch (error) {
            logger.error("Lecture du matricule impossible", error);
          }
        }
      }

      for (const i of internships) {
        if (i.student) (i.student as { matricule?: string | null }).matricule = fresh.get(i.student.id) ?? null;
      }
    }

    // Clé de regroupement d'une personne : son CIN (12 chiffres) s'il est connu, sinon son compte.
    // CIN différents = personnes différentes (jamais regroupées). Le CIN n'est pas envoyé au navigateur.
    {
      const ids = Array.from(new Set(internships.map((i) => i.student?.id).filter((v): v is number => typeof v === "number")));
      const rows = ids.length
        ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, cinNumber: true } })
        : [];
      const cinOf = new Map(rows.map((u) => [u.id, String(u.cinNumber ?? "").replace(/\D/g, "")]));

      for (const i of internships) {
        if (!i.student) continue;
        const cin = cinOf.get(i.student.id) ?? "";
        (i.student as { personKey?: string }).personKey = cin.length === 12 ? `cin:${cin}` : `id:${i.student.id}`;
      }
    }

    // Tri par matricule (0001, 0002, ...) en gardant ensemble les stages d'une même personne ; stage le plus récent d'abord
    const matriculeOf = (i: { student?: unknown }) =>
      String((i.student as { matricule?: string | null } | undefined)?.matricule ?? "");

    const keyOf = (i: { student?: unknown }) =>
      String((i.student as { personKey?: string } | undefined)?.personKey ?? "");

    // Matricule le plus petit de chaque personne : les stages d'une même personne restent groupés
    const groupMin = new Map<string, string>();

    for (const i of internships) {
      const k = keyOf(i);
      const m = matriculeOf(i);
      const cur = groupMin.get(k);

      if (m && (!cur || m.localeCompare(cur, "fr", { numeric: true }) < 0)) groupMin.set(k, m);
      else if (!groupMin.has(k)) groupMin.set(k, "");
    }

    internships.sort((x, y) => {
      const gx = groupMin.get(keyOf(x)) ?? "";
      const gy = groupMin.get(keyOf(y)) ?? "";

      if (gx !== gy) {
        if (!gx) return 1;
        if (!gy) return -1;
        return gx.localeCompare(gy, "fr", { numeric: true });
      }

      if (keyOf(x) !== keyOf(y)) return keyOf(x).localeCompare(keyOf(y));

      const mx = matriculeOf(x);
      const my = matriculeOf(y);

      if (mx !== my) return mx.localeCompare(my, "fr", { numeric: true });

      return y.createdAt.getTime() - x.createdAt.getTime();
    });

    res.status(200).json({
      success: true,
      data: internships.map(withProjects),
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
        ...projectLinksInclude,
        project: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            matricule: true,
            studentLevel: true,
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
      data: withProjects(internship),
    });
  } catch (error) {
    logger.error("Erreur récupération stage", error);

    sendError(res, error, "Erreur lors de la récupération du stage");
  }
}

/** Thème du stage (imprimé sur le certificat) : texte nettoyé, null pour l'effacer, undefined = inchangé. */
function cleanTheme(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return String(value).trim().slice(0, 300) || null;
}

/** Projets sélectionnés (cases cochées) : liste d'identifiants uniques et valides. */
function readProjectIds(body: Record<string, unknown>): number[] | undefined {
  const raw = body.projectIds;
  if (raw === undefined) return undefined;
  const list = Array.isArray(raw) ? raw : String(raw ?? "").split(",");

  return Array.from(
    new Set(list.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0)),
  );
}

const projectLinksInclude = {
  projectLinks: {
    include: { project: { select: { id: true, name: true, code: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

/** Ajoute `projects` et `projectIds` (tous les projets rattachés) à la réponse. */
function withProjects<T extends { projectLinks?: Array<{ projectId: number; project: unknown }> }>(item: T) {
  const links = item.projectLinks ?? [];

  return {
    ...item,
    projects: links.map((l) => l.project),
    projectIds: links.map((l) => l.projectId),
  };
}

async function missingProjectIds(ids: number[]): Promise<number[]> {
  if (ids.length === 0) return [];
  const found = await prisma.project.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const ok = new Set(found.map((p) => p.id));
  return ids.filter((id) => !ok.has(id));
}

/**
 * GET /api/internships/matricule?studentId=
 * Matricule du stagiaire choisi (déjà attribué), sinon le prochain matricule libre proposé.
 */
export async function getStudentMatricule(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const studentId = Number(req.query.studentId);

    if (Number.isInteger(studentId) && studentId > 0) {
      const user = await prisma.user.findUnique({
        where: { id: studentId },
        select: { matricule: true },
      });

      if (user?.matricule) {
        res.json({ success: true, data: { matricule: user.matricule, assigned: true } });
        return;
      }

      const sibling = user ? await findSiblingMatricule(studentId) : null;

      if (sibling) {
        res.json({ success: true, data: { matricule: sibling, assigned: true } });
        return;
      }
    }

    res.json({ success: true, data: { matricule: await suggestNextMatricule(), assigned: false } });
  } catch (error) {
    logger.error("Erreur lecture matricule", error);

    sendError(res, error, "Erreur lors de la lecture du matricule");
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

    const projectIdsInput = readProjectIds(req.body);

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
      theme,
    } = req.body;

    if (!studentId || !title || !startDate) {
      res.status(400).json({
        success: false,
        message: "studentId, title et startDate sont obligatoires",
      });
      return;
    }

    if (!cleanTheme(theme)) {
      res.status(400).json({ success: false, message: "Le thème du stage est obligatoire" });
      return;
    }

    {
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : null;
      const problem =
        validateDates(start, end) ??
        validateStatusAgainstDates(status, start, end) ??
        (await validateParticipants(Number(studentId), supervisorId ? Number(supervisorId) : null)) ??
        (end ? await findOverlap(Number(studentId), start, end) : null);

      if (problem) {
        res.status(400).json({ success: false, message: problem });
        return;
      }
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

    // Projets rattachés : `projectIds` (cases cochées) ; `projectId` seul reste accepté (ancien format)
    const projectIds =
      projectIdsInput ?? (projectId ? [Number(projectId)] : []);

    if ((await missingProjectIds(projectIds)).length > 0) {
      res.status(404).json({
        success: false,
        message: "Projet introuvable",
      });
      return;
    }

    const identity = readStudentIdentity(req.body);

    if (identity.error) {
      res.status(400).json({ success: false, message: identity.error });
      return;
    }

    {
      const owner = await cinOwnerName(identity.data.cinNumber as string | null | undefined, Number(studentId));

      if (owner) {
        res.status(409).json({ success: false, message: `Ce numéro de CIN est déjà enregistré pour ${owner}.` });
        return;
      }
    }

    // Matricule du stagiaire (N° d'inscription) : attribué une seule fois, jamais modifié ensuite
    try {
      await getOrAssignMatricule(Number(studentId), typeof req.body.matricule === "string" ? req.body.matricule : null);
      if (typeof req.body.matricule === "string") await changeMatricule(Number(studentId), req.body.matricule);
    } catch (error) {
      if (error instanceof MatriculeError) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      throw error;
    }

    const internship = await prisma.internship.create({
      data: {
        // projet principal = premier projet coché
        projectId: projectIds[0],
        projectLinks: {
          create: projectIds.map((id) => ({ projectId: id })),
        },
        studentId: Number(studentId),
        supervisorId: supervisorId
          ? Number(supervisorId)
          : undefined,
        // « Autre » : tuteur saisi librement (sans compte)
        supervisorName: supervisorId ? null : cleanFreeText(req.body.supervisorName),
        title,
        institution,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        status: status ?? "PENDING",
        description,
        theme: cleanTheme(theme),
      },
      include: {
        ...projectLinksInclude,
        project: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            matricule: true,
            studentLevel: true,
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
      data: withProjects(internship),
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

    const projectIdsInput = readProjectIds(req.body);

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
      theme,
    } = req.body;

    // undefined = projets inchangés ; sinon liste complète des projets rattachés
    const projectIds: number[] | undefined =
      projectIdsInput ??
      (projectId !== undefined ? (projectId ? [Number(projectId)] : []) : undefined);

    if (projectIds && (await missingProjectIds(projectIds)).length > 0) {
      res.status(404).json({ success: false, message: "Projet introuvable" });
      return;
    }

    {
      const effectiveStart = startDate ? new Date(startDate) : existing.startDate;
      const effectiveEnd =
        endDate !== undefined ? (endDate ? new Date(endDate) : null) : existing.endDate;

      const effectiveStatus = status ?? existing.status;
      const effectiveStudent = studentId ? Number(studentId) : existing.studentId;
      const problem =
        validateDates(effectiveStart, effectiveEnd) ??
        validateStatusAgainstDates(effectiveStatus, effectiveStart, effectiveEnd) ??
        (await validateParticipants(effectiveStudent, supervisorId ? Number(supervisorId) : existing.supervisorId)) ??
        (effectiveEnd && effectiveStatus !== "CANCELLED"
          ? await findOverlap(effectiveStudent, effectiveStart, effectiveEnd, id)
          : null);

      if (problem) {
        res.status(400).json({ success: false, message: problem });
        return;
      }
    }

    if (theme !== undefined && !cleanTheme(theme)) {
      res.status(400).json({ success: false, message: "Le thème du stage est obligatoire" });
      return;
    }

    const identity = readStudentIdentity(req.body);

    if (identity.error) {
      res.status(400).json({ success: false, message: identity.error });
      return;
    }

    {
      const owner = await cinOwnerName(
        identity.data.cinNumber as string | null | undefined,
        studentId ? Number(studentId) : existing.studentId,
      );

      if (owner) {
        res.status(409).json({ success: false, message: `Ce numéro de CIN est déjà enregistré pour ${owner}.` });
        return;
      }
    }

    // Matricule modifié à la main dans le formulaire (contrôlé : format + unicité)
    if (typeof req.body.matricule === "string" && req.body.matricule.trim()) {
      try {
        await changeMatricule(studentId ? Number(studentId) : existing.studentId, req.body.matricule);
      } catch (error) {
        if (error instanceof MatriculeError) {
          res.status(error.status).json({ success: false, message: error.message });
          return;
        }
        throw error;
      }
    }

    const internship = await prisma.internship.update({
      where: { id },
      data: {
        projectId: projectIds ? (projectIds[0] ?? null) : undefined,
        ...(projectIds
          ? {
              projectLinks: {
                deleteMany: {},
                create: projectIds.map((id) => ({ projectId: id })),
              },
            }
          : {}),
        studentId:
          studentId !== undefined ? Number(studentId) : undefined,
        supervisorId:
          supervisorId !== undefined
            ? supervisorId
              ? Number(supervisorId)
              : null
            : undefined,
        // « Autre » : tuteur saisi librement ; effacé dès qu'un tuteur de la liste est choisi
        supervisorName:
          supervisorId
            ? null
            : req.body.supervisorName !== undefined
              ? cleanFreeText(req.body.supervisorName)
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
        theme: cleanTheme(theme),
      },
      include: projectLinksInclude,
    });

    await saveStudentIdentity(internship.studentId, identity.data);

    res.status(200).json({
      success: true,
      message: "Stage modifié avec succès",
      data: withProjects(internship),
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

    // Plus aucun stage suivi pour ce stagiaire : les matricules sont remis en ordre (sans trou)
    try {
      await renumberMatricules();
    } catch (error) {
      logger.error("Renumérotation des matricules impossible", error);
    }

    res.status(200).json({
      success: true,
      message: "Stage supprimé avec succès",
    });
  } catch (error) {
    logger.error("Erreur suppression stage", error);

    sendError(res, error, "Erreur lors de la suppression du stage");
  }
}

/**
 * POST /api/internships/tutors
 * Ajout d'un tuteur depuis le formulaire d'un stage : crée (ou retrouve par e-mail) le compte tuteur.
 * Aucun mot de passe n'est envoyé : la personne utilise « Mot de passe oublié ».
 */
export async function createTutor(req: Request, res: Response): Promise<void> {
  try {
    const firstName = toText(req.body?.firstName) ?? "";
    const lastName = toText(req.body?.lastName);
    const email = toText(req.body?.email)?.toLowerCase();

    if (!lastName || !email) {
      res.status(400).json({ success: false, message: "Le nom et l'e-mail du tuteur sont obligatoires." });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ success: false, message: "Adresse e-mail du tuteur invalide." });
      return;
    }

    const label = (u: { firstName: string | null; lastName: string | null }) => `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, firstName: true, lastName: true },
    });

    if (existing) {
      if (["TUTEUR_L3", "TUTEUR_M2"].includes(String(existing.role))) {
        res.status(200).json({ success: true, data: { id: existing.id, label: label(existing) } });
        return;
      }

      res.status(409).json({ success: false, message: "Un compte non tuteur utilise déjà cet e-mail." });
      return;
    }

    // Niveau : L3, M2 ou « Autre » (texte libre, rattaché au rôle tuteur L3)
    const role = req.body?.role === "TUTEUR_M2" ? "TUTEUR_M2" : "TUTEUR_L3";
    const otherLevel = req.body?.role === "OTHER" ? toText(req.body?.otherLevel) : null;

    if (req.body?.role === "OTHER" && !otherLevel) {
      res.status(400).json({ success: false, message: "Précisez le niveau du tuteur (Autre)." });
      return;
    }

    if (otherLevel && otherLevel.length > 80) {
      res.status(400).json({ success: false, message: "Niveau du tuteur trop long (80 caractères maximum)." });
      return;
    }
    const password = `${randomBytes(9).toString("base64url")}aA1!`;

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: await bcrypt.hash(password, 12),
        role: role as never,
        status: "ACTIVE" as never,
        ...(otherLevel ? { tutorLevel: otherLevel } : {}),
      } as never,
      select: { id: true, firstName: true, lastName: true },
    });

    try {
      const base = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

      await sendEmail(
        email,
        "Votre compte — Ndao Hifanosika",
        `Bonjour ${firstName || lastName},\n\nUn compte tuteur a été créé pour vous.\nPour définir votre mot de passe : ${base}/login puis « Mot de passe oublié » avec cette adresse e-mail.\n\n— Ndao Hifanosika`,
      );
    } catch (error) {
      logger.error("E-mail de bienvenue du tuteur non envoyé", error);
    }

    res.status(201).json({ success: true, data: { id: user.id, label: label(user) } });
  } catch (error) {
    logger.error("Erreur création tuteur", error);

    sendError(res, error, "Erreur lors de l'ajout du tuteur");
  }
}


/**
 * POST /api/internships/matricules/renumber
 * Remet tous les matricules en ordre (0001, 0002, … sans trou) : une personne = un matricule.
 */
export async function renumberInternshipMatricules(_req: Request, res: Response): Promise<void> {
  try {
    const { changed } = await renumberMatricules();

    res.status(200).json({ success: true, message: `${changed} matricule(s) remis en ordre.`, data: { changed } });
  } catch (error) {
    logger.error("Renumérotation des matricules impossible", error);

    sendError(res, error, "Erreur lors de la remise en ordre des matricules");
  }
}
