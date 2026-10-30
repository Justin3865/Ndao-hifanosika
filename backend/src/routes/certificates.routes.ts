import { getInternshipCertificateSuggestion } from "../services/certificateSuggestion.service";
import { isValidMention, MENTIONS } from "../utils/mention";
import { Request, Response, Router } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { db } from "../utils/db";
import { getReqUser } from "../utils/dataScope";
import { sendEmail } from "../utils/mailer";
import { notifyUsers } from "../utils/notify";
import { isSameName } from "../utils/names";

const router = Router();
export const publicCertificateRouter = Router();

const TYPES = ["INTERNSHIP", "VOLUNTEER", "STAFF", "TRAINING", "BENEFICIARY"];
const ISSUERS = ["ADMIN", "DIRECTION", "RH"] as const;

const CATEGORY_CODE: Record<string, string> = {
  INTERNSHIP: "STG",
  VOLUNTEER: "BEN",
  STAFF: "TRV",
  TRAINING: "FOR",
  BENEFICIARY: "BNF",
};

async function nextCode(type: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `NH-${year}-${CATEGORY_CODE[type] ?? "GEN"}-`;

  const rows: Array<{ code: string }> = await db.certificate.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });

  const max = rows.reduce((m, r) => Math.max(m, Number(r.code.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

router.use(authenticate);

/* ------------------------------------------------------------------ */
/* Recherche d'un titulaire dans la base de données (nom, e-mail, téléphone) */
/* ------------------------------------------------------------------ */

const USER_LOOKUP_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  birthDate: true,
  birthPlace: true,
  cinNumber: true,
  cinIssuedAt: true,
  cinIssuedPlace: true,
  cinDuplicata: true,
  cinDuplicataAt: true,
  role: true,
  status: true,
  department: { select: { name: true } },
  // Dernier stage du compte : thème + département repris automatiquement sur le certificat
  internships: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { theme: true, department: { select: { name: true } } },
  },
} as const;

function toUserCandidate(u: Json) {
  return {
    source: "USER" as const,
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email ?? null,
    phone: u.phone ?? null,
    birthDate: u.birthDate ?? null,
    birthPlace: u.birthPlace ?? null,
    cinNumber: u.cinNumber ?? null,
    cinIssuedAt: u.cinIssuedAt ?? null,
    cinIssuedPlace: u.cinIssuedPlace ?? null,
    cinDuplicata: Boolean(u.cinDuplicata),
    cinDuplicataAt: u.cinDuplicataAt ?? null,
    role: u.role ?? null,
    status: u.status ?? null,
    subtitle: u.department?.name ?? null,
    // Lus dans la base de données : département du compte (sinon celui de son dernier stage) + thème du dernier stage
    departmentName: u.department?.name ?? u.internships?.[0]?.department?.name ?? null,
    theme: u.internships?.[0]?.theme ?? null,
  };
}

function toBeneficiaryCandidate(b: Json) {
  return {
    source: "BENEFICIARY" as const,
    id: b.id,
    projectId: b.projectId ?? null,
    name: `${b.firstName} ${b.lastName}`.trim(),
    email: b.email ?? null,
    phone: b.phone ?? null,
    birthDate: b.birthDate ?? null,
    birthPlace: b.birthPlace ?? null,
    cinNumber: b.cinNumber ?? null,
    cinIssuedAt: b.cinIssuedAt ?? null,
    cinIssuedPlace: b.cinIssuedPlace ?? null,
    cinDuplicata: Boolean(b.cinDuplicata),
    cinDuplicataAt: b.cinDuplicataAt ?? null,
    role: null,
    status: null,
    subtitle: b.project?.name ?? null,
    departmentName: b.project?.department?.name ?? null,
    theme: null,
    // Fiche du bénéficiaire (mêmes champs que le formulaire « Ajouter un bénéficiaire »)
    beneficiary: {
      projectName: b.project?.name ?? null,
      firstName: b.firstName ?? null,
      lastName: b.lastName ?? null,
      gender: b.gender ?? null,
      age: b.age ?? null,
      vulnerable: Boolean(b.vulnerable),
      locality: b.locality ?? null,
      zoneName: b.zone?.name ?? null,
      householdSize: b.householdSize ?? null,
      monthlyIncome: b.monthlyIncome ?? null,
      childrenUnder5: b.childrenUnder5 ?? null,
      hasDisability: Boolean(b.hasDisability),
    },
  };
}

/** Cherche par nom (tous les mots), e-mail ou téléphone (+261 34…, 034…, avec ou sans espaces). */
router.get("/lookup", authorizeRoles(...ISSUERS), async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim().slice(0, 80);
    const only = String(req.query.only ?? "").toUpperCase(); // BENEFICIARY : uniquement les bénéficiaires

    if (q.length < 2) return res.json({ success: true, data: [] });

    const tokens = q.split(/\s+/).filter(Boolean).slice(0, 4);
    const digits = q.replace(/\D/g, "");
    const core = digits.replace(/^(261|0)/, "");

    const nameFilter = (extra: Json[] = []) => ({
      AND: tokens.map((token) => ({
        OR: [
          { firstName: { contains: token, mode: "insensitive" } },
          { lastName: { contains: token, mode: "insensitive" } },
          { email: { contains: token, mode: "insensitive" } },
          ...extra,
        ],
      })),
    });

    let userPhoneIds: number[] = [];
    let beneficiaryPhoneIds: number[] = [];

    if (core.length >= 4) {
      const like = `%${core}%`;

      const users = await prisma.$queryRaw<Array<{ id: number }>>`SELECT id FROM "User" WHERE regexp_replace(COALESCE("phone", ''), '\\D', '', 'g') LIKE ${like} LIMIT 20`;
      const beneficiaries = await prisma.$queryRaw<Array<{ id: number }>>`SELECT id FROM "Beneficiary" WHERE regexp_replace(COALESCE("phone", ''), '\\D', '', 'g') LIKE ${like} LIMIT 20`;

      userPhoneIds = users.map((row) => row.id);
      beneficiaryPhoneIds = beneficiaries.map((row) => row.id);
    }

    const [users, beneficiaries]: [Json[], Json[]] = await Promise.all([
      only === "BENEFICIARY"
        ? Promise.resolve([] as Json[])
        : db.user.findMany({
            where: { status: { not: "REJECTED" }, OR: [nameFilter(), ...(userPhoneIds.length ? [{ id: { in: userPhoneIds } }] : [])] },
            select: USER_LOOKUP_SELECT,
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
            take: 15,
          }),
      db.beneficiary.findMany({
        where: { OR: [nameFilter(), ...(beneficiaryPhoneIds.length ? [{ id: { in: beneficiaryPhoneIds } }] : [])] },
        select: {
          id: true,
          projectId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          gender: true,
          age: true,
          vulnerable: true,
          locality: true,
          householdSize: true,
          monthlyIncome: true,
          childrenUnder5: true,
          hasDisability: true,
          birthDate: true,
          birthPlace: true,
          cinNumber: true,
          cinIssuedAt: true,
          cinIssuedPlace: true,
          cinDuplicata: true,
          cinDuplicataAt: true,
          project: { select: { name: true, department: { select: { name: true } } } },
          zone: { select: { name: true } },
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        take: 10,
      }),
    ]);

    res.json({
      success: true,
      data: [...users.map(toUserCandidate), ...beneficiaries.map(toBeneficiaryCandidate)],
    });
  } catch (error) {
    logger.error("Erreur recherche titulaire", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

/** Fiche (base de données) de la personne qui a effectué un stage. */
router.get("/lookup/internship/:id", authorizeRoles(...ISSUERS), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Stage invalide" });

    const internship = await prisma.internship.findUnique({ where: { id }, select: { id: true, student: { select: { id: true } } } });

    if (!internship) return res.status(404).json({ success: false, message: "Stage introuvable" });

    const student = await db.user.findUnique({ where: { id: internship.student.id }, select: USER_LOOKUP_SELECT });

    // Lieu de stage, note finale /20 et mention proposés automatiquement (suivi & évaluation)
    let suggestion = null;
    try {
      suggestion = await getInternshipCertificateSuggestion(id);
    } catch (error) {
      logger.error("Erreur suggestion certificat", error);
    }

    res.json({ success: true, data: student ? toUserCandidate(student) : null, suggestion, mentions: MENTIONS });
  } catch (error) {
    logger.error("Erreur fiche stagiaire", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

/** Slogan + partenaires (logo) d'un projet : aperçu avant de délivrer le certificat. */
router.get("/project-branding/:id", authorizeRoles(...ISSUERS), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Projet invalide" });

    const project = await db.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slogan: true,
        partnerLinks: {
          orderBy: { id: "asc" },
          select: { partner: { select: { id: true, name: true, slogan: true, logoUrl: true, isActive: true } } },
        },
      },
    });

    if (!project) return res.status(404).json({ success: false, message: "Projet introuvable" });

    res.json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        slogan: project.slogan ?? null,
        partners: project.partnerLinks.map((l: Json) => l.partner).filter((p: Json) => p?.isActive),
      },
    });
  } catch (error) {
    logger.error("Erreur aperçu projet", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const user = getReqUser(req);
    const all = user && (ISSUERS as readonly string[]).includes(user.role);

    const rows = await db.certificate.findMany({
      where: all ? {} : { userId: user?.id ?? -1 },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error("Erreur liste certificats", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const user = getReqUser(req);
    const row = await db.certificate.findUnique({
      where: { id: Number(req.params.id) },
      include: { partnerLinks: { orderBy: { displayOrder: "asc" } }, project: { select: { id: true, name: true, slogan: true } } },
    });
    const all = user && (ISSUERS as readonly string[]).includes(user.role);

    if (!row || (!all && row.userId !== user?.id)) {
      return res.status(404).json({ success: false, message: "Certificat introuvable" });
    }

    res.json({ success: true, data: row });
  } catch (error) {
    logger.error("Erreur lecture certificat", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

router.post("/", authorizeRoles(...ISSUERS), async (req: Request, res: Response) => {
  try {
    const body: Json = req.body ?? {};
    const type = String(body.type ?? "");

    if (!TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "Type de certificat invalide" });
    }

    let holderName = String(body.holderName ?? "").trim();
    let holderEmail: string | null = body.holderEmail ? String(body.holderEmail).trim() : null;
    let userId: number | null = body.userId ? Number(body.userId) : null;
    let title = String(body.title ?? "").trim();
    let startDate: Date | null = body.startDate ? new Date(body.startDate) : null;
    let endDate: Date | null = body.endDate ? new Date(body.endDate) : null;
    let expiresAt: Date | null = body.expiresAt ? new Date(body.expiresAt) : null;
    const internshipId = body.internshipId ? Number(body.internshipId) : null;
    // Un ou plusieurs projets (sélection multiple) ; « projectId » reste accepté pour l'ancien format
    const toIds = (value: unknown): number[] =>
      Array.from(new Set<number>((Array.isArray(value) ? value : []).map((v: unknown) => Number(v)).filter((v: number) => Number.isInteger(v) && v > 0)));

    const requestedProjectIds: number[] = toIds(body.projectIds).length ? toIds(body.projectIds) : toIds(body.projectId ? [body.projectId] : []);
    let needsAutoTitle = false;
    const beneficiaryId = body.beneficiaryId ? Number(body.beneficiaryId) : null;

    let holderBirthDate: Date | null = body.holderBirthDate ? new Date(body.holderBirthDate) : null;
    let holderBirthPlace: string | null = body.holderBirthPlace ? String(body.holderBirthPlace).trim() || null : null;
    let missionLocation: string | null = body.missionLocation ? String(body.missionLocation).trim() || null : null;

    // Thème + département : « a effectué avec sérieux son stage dans le département : X intitulé « thème » »
    // (saisis à la délivrance — pour un stage, repris du stage s'ils sont vides)
    let theme: string | null = body.theme ? String(body.theme).trim().slice(0, 300) || null : null;
    let departmentName: string | null = body.departmentName ? String(body.departmentName).trim().slice(0, 150) || null : null;

    // Identité complémentaire (CIN) + cas particulier
    let holderPhone: string | null = body.holderPhone ? String(body.holderPhone).trim().slice(0, 30) || null : null;
    let holderCin: string | null = body.holderCin ? String(body.holderCin).replace(/[\s.\-]/g, "") || null : null;
    let holderCinIssuedAt: Date | null = body.holderCinIssuedAt ? new Date(body.holderCinIssuedAt) : null;
    let holderCinIssuedPlace: string | null = body.holderCinIssuedPlace ? String(body.holderCinIssuedPlace).trim().slice(0, 120) || null : null;
    let holderCinDuplicata = body.holderCinDuplicata === true || body.holderCinDuplicata === "true";
    let holderCinDuplicataAt: Date | null = body.holderCinDuplicataAt ? new Date(body.holderCinDuplicataAt) : null;
    const specialCase = body.specialCase === true || body.specialCase === "true";
    const specialCaseNote: string | null = body.specialCaseNote ? String(body.specialCaseNote).trim().slice(0, 500) || null : null;
    const saveToProfile = !specialCase && body.saveToProfile !== false && body.saveToProfile !== "false";

    const invalid = (d: Date | null) => d !== null && Number.isNaN(d.getTime());

    if (invalid(startDate) || invalid(endDate) || invalid(expiresAt) || invalid(holderBirthDate) || invalid(holderCinIssuedAt) || invalid(holderCinDuplicataAt)) {
      return res.status(400).json({ success: false, message: "Date invalide" });
    }

    if (body.internshipId && (!Number.isInteger(internshipId) || (internshipId as number) <= 0)) {
      return res.status(400).json({ success: false, message: "Stage invalide" });
    }

    if (holderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(holderEmail)) {
      return res.status(400).json({ success: false, message: "Adresse e-mail invalide" });
    }

    let finalScore: number | null = null;
    let mention: string | null = null;

    if (type === "BENEFICIARY" && !specialCase) {
      if (!beneficiaryId || !Number.isInteger(beneficiaryId) || beneficiaryId <= 0) {
        return res.status(400).json({ success: false, message: "Choisissez un bénéficiaire dans la base de données" });
      }

      const beneficiary = await db.beneficiary.findUnique({
        where: { id: beneficiaryId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          projectId: true,
          birthDate: true,
          birthPlace: true,
          cinNumber: true,
          cinIssuedAt: true,
          cinIssuedPlace: true,
          cinDuplicata: true,
          cinDuplicataAt: true,
        },
      });

      if (!beneficiary) return res.status(404).json({ success: false, message: "Bénéficiaire introuvable" });

      // Identité (naissance + CIN) lue dans la fiche du bénéficiaire
      holderBirthDate = beneficiary.birthDate ?? holderBirthDate;
      holderBirthPlace = beneficiary.birthPlace?.trim() || holderBirthPlace;
      holderCin = beneficiary.cinNumber?.trim() || holderCin;
      holderCinIssuedAt = beneficiary.cinIssuedAt ?? holderCinIssuedAt;
      holderCinIssuedPlace = beneficiary.cinIssuedPlace?.trim() || holderCinIssuedPlace;
      holderCinDuplicata = Boolean(beneficiary.cinDuplicata) || holderCinDuplicata;
      holderCinDuplicataAt = beneficiary.cinDuplicataAt ?? holderCinDuplicataAt;

      // Tout vient de la fiche du bénéficiaire ; l'intitulé est celui du projet (complété plus bas)
      holderName = `${beneficiary.firstName} ${beneficiary.lastName}`.trim();
      holderEmail = beneficiary.email ?? holderEmail;
      holderPhone = beneficiary.phone?.trim() || holderPhone;
      needsAutoTitle = true;
      title = "Projet Ndao Hifanosika";

      if (!requestedProjectIds.length && beneficiary.projectId) requestedProjectIds.push(beneficiary.projectId);
    }

    if (type === "INTERNSHIP") {
      if (!internshipId) return res.status(400).json({ success: false, message: "Stage obligatoire" });

      // Eto no nisy ny erreur teo aloha: nitady birthDate tao amin'ny User
      const internship = await prisma.internship.findUnique({
        where: { id: internshipId },
        include: { 
          student: { 
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              email: true, 
              birthDate: true, // Mila mi-ensure fa misy an'ity ao amin'ny schema
              birthPlace: true // Sy ity koa
            } 
          } 
        },
      });

      if (!internship) return res.status(404).json({ success: false, message: "Stage introuvable" });

      if (internship.status !== "COMPLETED") {
        return res.status(400).json({ success: false, message: "Le stage doit être terminé pour délivrer un certificat" });
      }

      if (await db.certificate.findFirst({ where: { internshipId, revokedAt: null } })) {
        return res.status(409).json({ success: false, message: "Un certificat existe déjà pour ce stage" });
      }

      holderName = `${internship.student.firstName} ${internship.student.lastName}`;
      holderEmail = internship.student.email;
      userId = internship.student.id;

      holderBirthDate = internship.student.birthDate ?? holderBirthDate;
      holderBirthPlace = internship.student.birthPlace?.trim() || holderBirthPlace;

      const profile = await db.user.findUnique({
        where: { id: internship.student.id },
        select: { phone: true, cinNumber: true, cinIssuedAt: true, cinIssuedPlace: true, cinDuplicata: true, cinDuplicataAt: true },
      });

      holderPhone = profile?.phone?.trim() || holderPhone;
      holderCin = profile?.cinNumber?.trim() || holderCin;
      holderCinIssuedAt = profile?.cinIssuedAt ?? holderCinIssuedAt;
      holderCinIssuedPlace = profile?.cinIssuedPlace?.trim() || holderCinIssuedPlace;
      holderCinDuplicata = Boolean(profile?.cinDuplicata) || holderCinDuplicata;
      holderCinDuplicataAt = profile?.cinDuplicataAt ?? holderCinDuplicataAt;
      // Si l'intitulé du stage n'est que le nom du stagiaire, il ne doit pas être répété sur le certificat
      const rawTitle = title || internship.title;
      needsAutoTitle = !rawTitle.trim() || isSameName(rawTitle, holderName);
      title = needsAutoTitle ? "Stage au sein de Ndao Hifanosika" : rawTitle;
      startDate = internship.startDate ?? startDate;
      endDate = internship.endDate ?? endDate;

      // Lieu de stage, note finale et mention : calculés par le suivi & évaluation
      const suggestion = await getInternshipCertificateSuggestion(internshipId);
      if (suggestion) {
        missionLocation = missionLocation ?? suggestion.missionLocation;
        theme = theme ?? suggestion.theme ?? null;
        departmentName = departmentName ?? suggestion.departmentName ?? null;
        finalScore = suggestion.finalScoreOn20;
        mention = suggestion.mention;
      }
    }

    // Mention choisie manuellement par l'administrateur (prioritaire sur le calcul automatique)
    const requestedMention = body.mention ? String(body.mention).trim() : "";
    if (requestedMention) {
      if (!isValidMention(requestedMention)) {
        return res.status(400).json({ success: false, message: "Mention invalide" });
      }
      mention = requestedMention;
    }

    if (!holderName || !title) {
      return res.status(400).json({ success: false, message: "Nom du titulaire et intitulé obligatoires" });
    }

    if (holderBirthDate && (holderBirthDate.getTime() > Date.now() || holderBirthDate.getFullYear() < 1900)) {
      return res.status(400).json({ success: false, message: "Date de naissance invalide" });
    }

    if (startDate && endDate && endDate < startDate) {
      return res.status(400).json({ success: false, message: "La date de fin précède la date de début" });
    }

    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: "La date d'expiration doit être dans le futur" });
    }

    if (holderCin && !/^[A-Za-z0-9]{6,20}$/.test(holderCin)) {
      return res.status(400).json({ success: false, message: "Numéro de CIN invalide (6 à 20 caractères, sans symboles)" });
    }

    if (holderCinIssuedAt && holderCinIssuedAt.getTime() > Date.now()) {
      return res.status(400).json({ success: false, message: "La date de délivrance du CIN ne peut pas être dans le futur" });
    }

    if (holderCinDuplicataAt && holderCinDuplicataAt.getTime() > Date.now()) {
      return res.status(400).json({ success: false, message: "La date du duplicata ne peut pas être dans le futur" });
    }

    if (holderCinDuplicataAt) holderCinDuplicata = true;

    if (specialCase && (!specialCaseNote || specialCaseNote.length < 5)) {
      return res.status(400).json({ success: false, message: "Précisez le motif du cas particulier (5 caractères minimum)" });
    }

    // Slogans + partenaires des projets : copiés sur le certificat (sans doublon)
    let resolvedProjectIds: number[] = [...requestedProjectIds];

    if (!resolvedProjectIds.length && beneficiaryId && Number.isInteger(beneficiaryId) && beneficiaryId > 0) {
      const beneficiary = await db.beneficiary.findUnique({ where: { id: beneficiaryId }, select: { projectId: true } });
      if (beneficiary?.projectId) resolvedProjectIds = [beneficiary.projectId];
    }

    if (!resolvedProjectIds.length && internshipId && Number.isInteger(internshipId) && internshipId > 0) {
      const linked = await db.internship.findUnique({ where: { id: internshipId }, select: { projectId: true } });
      if (linked?.projectId) resolvedProjectIds = [linked.projectId];
    }

    const resolvedProjectId: number | null = resolvedProjectIds[0] ?? null;

    let projectSlogan: string | null = null;
    let projectPartners: Array<{ partnerId: number; role: string | null; nameSnapshot: string; sloganSnapshot: string | null; logoSnapshot: string | null; displayOrder: number }> = [];

    const toSnapshot = (partner: Json, index: number, role: string | null = null) => ({
      partnerId: partner.id as number,
      role,
      nameSnapshot: partner.name as string,
      sloganSnapshot: (partner.slogan ?? null) as string | null,
      logoSnapshot: (partner.logoUrl ?? null) as string | null,
      displayOrder: index,
    });

    if (resolvedProjectIds.length) {
      const projects: Json[] = await db.project.findMany({
        where: { id: { in: resolvedProjectIds } },
        select: {
          id: true,
          name: true,
          slogan: true,
          partnerLinks: {
            orderBy: { id: "asc" },
            select: { role: true, partner: { select: { id: true, name: true, slogan: true, logoUrl: true, isActive: true } } },
          },
        },
      });

      // On garde l'ordre de sélection
      const ordered = resolvedProjectIds.map((id) => projects.find((p) => p.id === id)).filter(Boolean) as Json[];

      const slogans = Array.from(new Set<string>(ordered.map((p) => String(p.slogan ?? "").trim()).filter(Boolean)));
      projectSlogan = slogans.length ? slogans.join(" · ") : null;

      const seen = new Set<number>();
      const merged: Array<{ partner: Json; role: string | null }> = [];

      for (const project of ordered) {
        for (const link of project.partnerLinks as Json[]) {
          if (!link.partner?.isActive || seen.has(link.partner.id)) continue;
          seen.add(link.partner.id);
          merged.push({ partner: link.partner, role: link.role ?? null });
        }
      }

      projectPartners = merged.map((entry, index) => toSnapshot(entry.partner, index, entry.role));

      if (needsAutoTitle && ordered.length) {
        title = ordered.map((p) => String(p.name)).join(", ");
      }
    }

    // Liste choisie à la délivrance (ajout / retrait de partenaires) : prioritaire sur celle du projet
    if (Array.isArray(body.partnerIds)) {
      const ids: number[] = Array.from(new Set<number>(body.partnerIds.map((v: unknown) => Number(v)).filter((v: number) => Number.isInteger(v) && v > 0)));

      const found: Json[] = ids.length
        ? await db.partner.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true, name: true, slogan: true, logoUrl: true } })
        : [];

      // Seuls les partenaires enregistrés dans le projet peuvent être imprimés
      const allowed = new Set<number>(projectPartners.map((p) => p.partnerId));

      projectPartners = ids
        .filter((id) => allowed.has(id))
        .map((id) => found.find((p) => p.id === id))
        .filter(Boolean)
        .map((partner, index) => toSnapshot(partner, index));
    }

    // Département + thème : complétés depuis la base de données quand ils n'ont pas été saisis
    if (!specialCase && (!theme || !departmentName)) {
      try {
        if (userId) {
          const owner = await db.user.findUnique({
            where: { id: userId },
            select: {
              department: { select: { name: true } },
              internships: { orderBy: { createdAt: "desc" }, take: 1, select: { theme: true, department: { select: { name: true } } } },
            },
          });
          departmentName = departmentName ?? owner?.department?.name ?? owner?.internships?.[0]?.department?.name ?? null;
          theme = theme ?? owner?.internships?.[0]?.theme ?? null;
        }

        if (!departmentName && resolvedProjectId) {
          const proj = await db.project.findUnique({ where: { id: resolvedProjectId }, select: { department: { select: { name: true } } } });
          departmentName = proj?.department?.name ?? null;
        }
      } catch (error) {
        logger.error("Département / thème non lus dans la base", error);
      }
    }

    let row: Awaited<ReturnType<typeof db.certificate.create>> | null = null;

    for (let attempt = 0; attempt < 5 && !row; attempt++) {
      try {
        row = await db.certificate.create({
          data: {
            code: await nextCode(type),
            type,
            holderName,
            holderEmail,
            title,
            description: body.description ? String(body.description) : null,
            startDate,
            endDate,
            expiresAt,
            holderBirthDate,
            holderBirthPlace,
            missionLocation,
            theme,
            departmentName,
            mention,
            finalScore,
            holderPhone,
            holderCin,
            holderCinIssuedAt,
            holderCinIssuedPlace,
            holderCinDuplicata,
            holderCinDuplicataAt,
            specialCase,
            specialCaseNote: specialCase ? specialCaseNote : null,
            internshipId,
            projectId: resolvedProjectId,
            beneficiaryId,
            userId,
            slogan: projectSlogan,
            partnerLinks: projectPartners.length ? { create: projectPartners } : undefined,
            issuedById: getReqUser(req)?.id ?? null,
          },
        });
      } catch (error) {
        if ((error as { code?: string }).code !== "P2002") throw error;
      }
    }

    if (!row) {
      return res.status(503).json({ success: false, message: "Numérotation indisponible, réessayez." });
    }

    const base = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

    if (userId) {
      await notifyUsers([userId], {
        title: "Certificat délivré",
        message: `Votre certificat « ${title} » est disponible (code ${row.code}).`,
        type: "SUCCESS",
      });
    } else if (holderEmail) {
      await sendEmail(
        holderEmail,
        "Votre certificat — Ndao Hifanosika",
        `Bonjour ${holderName},\n\nVotre certificat « ${title} » a été délivré. Code : ${row.code}\nVérification : ${base}/verification/${row.code}\n\n— Ndao Hifanosika`,
      );
    }

    // La base de données se complète toute seule : on remplit uniquement les champs encore vides du profil
    const profileUpdated: string[] = [];

    if (userId && saveToProfile) {
      try {
        const current = await db.user.findUnique({
          where: { id: userId },
          select: { birthDate: true, birthPlace: true, phone: true, cinNumber: true, cinIssuedAt: true, cinIssuedPlace: true, cinDuplicata: true, cinDuplicataAt: true },
        });

        if (current) {
          const patch: Record<string, unknown> = {};

          const fill = (key: string, label: string, value: unknown, existing: unknown) => {
            const has = (v: unknown) => v !== null && v !== undefined && v !== "";

            if (has(value) && !has(existing)) {
              patch[key] = value;
              profileUpdated.push(label);
            }
          };

          fill("birthDate", "date de naissance", holderBirthDate, current.birthDate);
          fill("birthPlace", "lieu de naissance", holderBirthPlace, current.birthPlace);
          fill("phone", "téléphone", holderPhone, current.phone);
          fill("cinNumber", "numéro de CIN", holderCin, current.cinNumber);
          fill("cinIssuedAt", "date de délivrance du CIN", holderCinIssuedAt, current.cinIssuedAt);
          fill("cinIssuedPlace", "lieu de délivrance du CIN", holderCinIssuedPlace, current.cinIssuedPlace);
          fill("cinDuplicataAt", "date du duplicata", holderCinDuplicataAt, current.cinDuplicataAt);

          if (holderCinDuplicata && !current.cinDuplicata) {
            patch.cinDuplicata = true;
            profileUpdated.push("duplicata du CIN");
          }

          if (Object.keys(patch).length > 0) {
            await db.user.update({ where: { id: userId }, data: patch });
          }
        }
      } catch (error) {
        logger.error("Mise à jour du profil depuis le certificat impossible", error);
      }
    }

    res.status(201).json({ success: true, data: row, profileUpdated });
  } catch (error) {
    logger.error("Erreur délivrance certificat", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

router.delete("/:id", authorizeRoles("ADMIN", "DIRECTION"), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = Number.isInteger(id) ? await db.certificate.findUnique({ where: { id } }) : null;

    if (!existing) return res.status(404).json({ success: false, message: "Certificat introuvable" });

    if (!existing.revokedAt) await db.certificate.update({ where: { id }, data: { revokedAt: new Date() } });

    res.json({ success: true });
  } catch (error) {
    logger.error("Erreur révocation certificat", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

publicCertificateRouter.get("/:code", async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code).toUpperCase();

    if (!/^NH-\d{4}-(?:[A-Z]{3}-\d{4,}|[A-Z0-9]{8})$/.test(code)) {
      return res.status(404).json({ success: false, status: "NOT_FOUND" });
    }

    const row = await db.certificate.findUnique({ where: { code } });

    if (!row) return res.status(404).json({ success: false, status: "NOT_FOUND" });

    res.json({
      success: true,
      status: row.revokedAt ? "REVOKED" : row.expiresAt && row.expiresAt.getTime() <= Date.now() ? "EXPIRED" : "VALID",
      data: {
        code: row.code,
        type: row.type,
        holderName: row.holderName,
        title: row.title,
        theme: row.theme ?? null,
        departmentName: row.departmentName ?? null,
        startDate: row.startDate,
        endDate: row.endDate,
        expiresAt: row.expiresAt,
        issuedAt: row.createdAt,
      },
    });
  } catch (error) {
    logger.error("Erreur vérification certificat", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

export default router;