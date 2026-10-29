import { Request, Response, Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { computeZoneStats, mlZoneScores } from "../services/vulnerability.service";

export const chatRouter = Router();
chatRouter.use(authenticate, authorizeRoles("ADMIN", "DIRECTION", "COORDINATOR"));

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * POST /api/ai/chat { message }
 * Assistant de comparaison : répond uniquement à partir des données réelles
 * (zones, ménages vulnérables, altitude, score ML). Comprend le français et le malgache courant.
 */
chatRouter.post("/chat", async (req: Request, res: Response) => {
  const message = String(req.body?.message ?? "").trim().slice(0, 500);
  if (!message) return res.status(400).json({ success: false, message: "Message vide." });
  const q = norm(message);

  const [stats, ml] = await Promise.all([computeZoneStats(), mlZoneScores()]);
  const zones = stats.map((z) => ({ ...z, final: ml?.scores[z.id] != null ? Math.round(z.score * 0.5 + ml.scores[z.id] * 0.5) : z.score }));
  if (!zones.length) {
    return res.json({ success: true, data: { answer: "Aucune zone d'intervention n'est enregistrée pour le moment.", zones: [] } });
  }

  const mentioned = zones.filter((z) => q.includes(norm(z.name)));
  const wantsCompare = /compar|versus|\bvs\b|fampitahana|ampit?aha|difference|entre/.test(q);
  const wantsTop = /plus vulnerable|le plus|classement|priorit|tena (mila|marefo)|mahantra|top/.test(q);
  const wantsAlt = /altitude|haut|elevation|haavo/.test(q);

  let list = zones.slice().sort((a, b) => b.final - a.final);
  let answer: string;

  if (mentioned.length >= 2 || (wantsCompare && mentioned.length >= 1)) {
    list = (mentioned.length >= 2 ? mentioned : [...mentioned, ...zones.filter((z) => !mentioned.includes(z))].slice(0, 3)).sort((a, b) => b.final - a.final);
    const [top, ...rest] = list;
    answer = `Parmi ${list.map((z) => z.name).join(", ")}, la zone la plus vulnérable est ${top.name} (indice ${top.final}/100, ${top.vulnerable} ménage(s) vulnérable(s) sur ${top.total}, soit ${top.rate} %). ` +
      rest.map((z) => `${z.name} : ${z.final}/100 (${z.rate} %)`).join(" ; ") + ".";
  } else if (mentioned.length === 1) {
    const z = mentioned[0];
    list = [z];
    answer = `${z.name} : ${z.vulnerable} ménage(s) vulnérable(s) sur ${z.total} (${z.rate} %), altitude ${z.altitude ?? "non renseignée"} m, indice de vulnérabilité ${z.final}/100.`;
  } else if (wantsAlt) {
    list = zones.slice().sort((a, b) => (b.altitude ?? 0) - (a.altitude ?? 0)).slice(0, 5);
    answer = "Zones classées par altitude : " + list.map((z) => `${z.name} (${z.altitude ?? "?"} m)`).join(", ") + ".";
  } else {
    list = list.slice(0, 5);
    answer = (wantsTop ? "Zones à cibler en priorité : " : "Voici les zones les plus vulnérables : ") +
      list.map((z, i) => `${i + 1}. ${z.name} — ${z.final}/100 (${z.rate} % de ménages vulnérables)`).join(" ; ") + ".";
  }
  if (!ml) answer += " (Indice calculé sur les données terrain ; le modèle ML n'est pas connecté.)";
  res.json({ success: true, data: { answer, zones: list } });
});
