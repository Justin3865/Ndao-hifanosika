import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { getReqUser } from "../utils/dataScope";
import { notifyRoles, notifyUsers } from "../utils/notify";

/**
 * Notifications automatiques : après une écriture réussie (2xx), on déduit
 * l'évènement métier à partir de la route + de la réponse JSON et on prévient
 * les personnes concernées (en base + temps réel).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

async function projectInfo(projectId?: number | null) {
  if (!projectId) return null;
  return prisma.project.findUnique({
    where: { id: Number(projectId) },
    select: { id: true, name: true, createdById: true },
  });
}

async function handleEvent(req: Request, status: number, body: Json) {
  const method = req.method;
  const path = req.originalUrl.split("?")[0].replace(/\/+$/, "");
  const actor = getReqUser(req)?.id;
  const data: Json = body?.data ?? body;

  // --- Inscription : prévenir l'administrateur
  if (method === "POST" && path === "/api/auth/register" && status === 201) {
    const u = data?.user ?? body?.user ?? {};
    await notifyRoles(["ADMIN"], {
      title: "Nouvelle demande d'inscription",
      message: `${u.firstName ?? req.body?.firstName ?? ""} ${u.lastName ?? req.body?.lastName ?? ""} (${u.email ?? req.body?.email ?? "email inconnu"}) attend votre validation.`,
      type: "INFO",
    });
    return;
  }

  // --- Compte activé
  let m = path.match(/^\/api\/users\/(\d+)\/activate$/);
  if (m && method === "PATCH") {
    await notifyUsers([Number(m[1])], {
      title: "Compte activé",
      message: "Votre compte a été validé. Vous pouvez maintenant utiliser la plateforme.",
      type: "SUCCESS",
    });
    return;
  }

  // --- Profil modifié par un administrateur
  m = path.match(/^\/api\/users\/(\d+)$/);
  if (m && method === "PUT" && Number(m[1]) !== actor) {
    await notifyUsers([Number(m[1])], {
      title: "Votre profil a été mis à jour",
      message: "Un administrateur a modifié les informations de votre compte (rôle, statut ou coordonnées).",
      type: "INFO",
    });
    return;
  }

  // --- Projet créé
  if (method === "POST" && path === "/api/projects" && status === 201) {
    const p = body?.project ?? data;
    await notifyRoles(["ADMIN", "DIRECTION"], {
      title: "Nouveau projet",
      message: `Le projet « ${p?.name ?? "sans nom"} » vient d'être créé.`,
      type: "INFO",
    }, actor);
    return;
  }

  // --- Activité créée
  if (method === "POST" && path === "/api/activities" && status === 201) {
    const a = body?.activity ?? data;
    const project = await projectInfo(a?.projectId);
    await notifyUsers([project?.createdById], {
      title: "Nouvelle activité",
      message: `L'activité « ${a?.title ?? ""} » a été ajoutée au projet « ${project?.name ?? ""} ».`,
      type: "INFO",
    }, actor);
    return;
  }

  // --- Jalon terminé
  m = path.match(/^\/api\/milestones\/(\d+)$/);
  if (m && method === "PUT") {
    const ms = body?.milestone ?? data;
    if (ms?.completedAt || Number(ms?.progress) >= 100) {
      const project = await projectInfo(ms?.projectId);
      await notifyUsers([project?.createdById], {
        title: "Jalon atteint",
        message: `Le jalon « ${ms?.title ?? ""} » du projet « ${project?.name ?? ""} » est terminé.`,
        type: "SUCCESS",
      }, actor);
    }
    return;
  }

  // --- Stage créé / modifié
  if (method === "POST" && path === "/api/internships" && status === 201) {
    await notifyUsers([data?.studentId, data?.supervisorId], {
      title: "Nouveau stage",
      message: `Le stage « ${data?.title ?? ""} » vous a été attribué.`,
      type: "INFO",
    }, actor);
    return;
  }

  m = path.match(/^\/api\/internships\/(\d+)$/);
  if (m && method === "PUT") {
    await notifyUsers([data?.studentId, data?.supervisorId], {
      title: "Stage mis à jour",
      message: `Le stage « ${data?.title ?? ""} » est maintenant « ${data?.status ?? ""} ».`,
      type: "INFO",
    }, actor);
    return;
  }

  // --- Évaluation créée / validée
  if (method === "POST" && path === "/api/evaluations" && status === 201) {
    const project = await projectInfo(data?.projectId);
    await notifyUsers([project?.createdById], {
      title: "Nouvelle évaluation",
      message: `Évaluation « ${data?.title ?? ""} » enregistrée pour le projet « ${project?.name ?? ""} ».`,
      type: "INFO",
    }, actor);
    await notifyRoles(["ADMIN"], {
      title: "Nouvelle évaluation",
      message: `Évaluation « ${data?.title ?? ""} » ajoutée (${project?.name ?? "projet"}).`,
      type: "INFO",
    }, actor);
    return;
  }

  m = path.match(/^\/api\/evaluations\/(\d+)$/);
  if (m && method === "PUT" && data?.status === "VALIDATED") {
    await notifyUsers([data?.createdById], {
      title: "Évaluation validée",
      message: `Votre évaluation « ${data?.title ?? ""} » a été validée.`,
      type: "SUCCESS",
    }, actor);
  }
}

export function eventNotifier(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "OPTIONS") return next();

  const original = res.json.bind(res);

  res.json = ((body: Json) => {
    const result = original(body);

    if (res.statusCode >= 200 && res.statusCode < 300) {
      handleEvent(req, res.statusCode, body).catch((error) =>
        logger.error("Erreur notifications automatiques", error),
      );
    }

    return result;
  }) as Response["json"];

  next();
}
