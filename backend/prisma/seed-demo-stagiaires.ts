/**
 * DONNÉES DE DÉMO « STAGIAIRES » pour la soutenance — à placer dans srcb/prisma/seed-demo-stagiaires.ts
 *
 * Crée 40 stagiaires fictifs (comptes + stages + tâches + pointages + évaluations du tuteur) pour que la source
 * « Stagiaires (Suivi & Évaluation) » de /ai/models n'affiche plus « Données insuffisantes » :
 *   - 36 stagiaires AVEC résultat connu (note moyenne /20) : 16 « en difficulté » (< 12/20) et 20 « satisfaisant »
 *   - 4 stagiaires SANS évaluation (liste « À tester »)
 *
 *   npx tsx prisma/seed-demo-stagiaires.ts           # crée les données de démo
 *   npx tsx prisma/seed-demo-stagiaires.ts --clean   # SUPPRIME tout ce qui a été créé (après la soutenance)
 *
 * Tout est repérable par l'e-mail « …@demo-soutenance.local » et le marqueur [DEMO-SOUTENANCE] : --clean ne touche
 * à aucune autre donnée.
 * AVERTISSEMENT : données SIMULÉES — ne jamais les présenter comme des résultats réels.
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL est introuvable dans le fichier .env");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const DEMO_TAG = "[DEMO-SOUTENANCE]";
const DEMO_DOMAIN = "@demo-soutenance.local";

// Générateur pseudo-aléatoire reproductible (mêmes données à chaque exécution)
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const DAY = 86_400_000;

async function clean() {
  const users = await prisma.user.findMany({ where: { email: { endsWith: DEMO_DOMAIN } }, select: { id: true } });
  const ids = users.map((u) => u.id);

  if (!ids.length) {
    console.log("Rien à supprimer : aucun stagiaire de démo.");
    return;
  }

  // tâches et évaluations partent en cascade avec le stage ; les missions partent avec le compte
  await prisma.internship.deleteMany({ where: { studentId: { in: ids } } });
  await prisma.mission.deleteMany({ where: { agentId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`✅ ${ids.length} stagiaires de démo supprimés.`);
}

async function create() {
  if (await prisma.user.findFirst({ where: { email: { endsWith: DEMO_DOMAIN } } })) {
    console.log("Les stagiaires de démo existent déjà. Lancez avec --clean pour les supprimer d'abord.");
    return;
  }

  // Tuteur / évaluateur : un tuteur existant, sinon l'admin
  const tutor =
    (await prisma.user.findFirst({ where: { role: { in: ["TUTEUR_L3", "TUTEUR_M2"] } }, orderBy: { id: "asc" } })) ??
    (await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { id: "asc" } }));
  if (!tutor) throw new Error("Aucun tuteur ni administrateur trouvé pour attribuer les évaluations.");

  const password = await bcrypt.hash(`Demo#${Math.random().toString(36).slice(2)}`, 4); // compte non utilisable
  const rand = rng(2026);
  const int = (min: number, max: number) => Math.floor(min + rand() * (max - min + 1));
  const between = (min: number, max: number) => min + rand() * (max - min);
  const now = new Date();

  const first = ["Rakoto", "Rasoa", "Andry", "Hery", "Fara", "Tiana", "Njaka", "Lalao", "Mamy", "Voahangy", "Toky", "Soa", "Aina", "Mialy", "Tojo", "Lova"];
  const last = ["Randria", "Rabe", "Razafy", "Rakotomalala", "Andrianina", "Ravelo", "Rasolofo", "Ramanana"];
  const taskTitles = ["Collecte de données", "Saisie des enquêtes", "Rapport hebdomadaire", "Analyse des indicateurs", "Visite de terrain", "Mise à jour du tableau de bord", "Contrôle qualité", "Présentation des résultats"];

  const TOTAL = 40;
  const UNLABELED = 4; // derniers : pas d'évaluation
  let struggling = 0;

  for (let i = 0; i < TOTAL; i++) {
    const labeled = i < TOTAL - UNLABELED;
    const isStruggling = labeled && i % 9 < 4; // ≈ 16 sur 36 « en difficulté »
    // quelques profils « contre-intuitifs » : le modèle ne sera pas parfait (≈ 12 %)
    const flip = rand() < 0.12;
    const weak = isStruggling !== flip; // profil de suivi faible

    const completed = i % 4 === 0;
    const startDate = new Date(now.getTime() - (completed ? 75 : int(30, 48)) * DAY);
    const endDate = completed ? new Date(now.getTime() - 10 * DAY) : new Date(startDate.getTime() + 61 * DAY);

    const user = await prisma.user.create({
      data: {
        firstName: first[i % first.length],
        lastName: `${last[i % last.length]} (démo ${i + 1})`,
        email: `stagiaire${String(i + 1).padStart(2, "0")}${DEMO_DOMAIN}`,
        password,
        gender: i % 3 === 0 ? "MALE" : "FEMALE",
        role: i % 5 === 0 ? "STAGIAIRE_M2" : "STAGIAIRE_L3",
        status: "ACTIVE",
      },
    });

    const internship = await prisma.internship.create({
      data: {
        studentId: user.id,
        supervisorId: tutor.id,
        title: `[DEMO] Stage Suivi & Évaluation n°${i + 1}`,
        institution: "Université (démo)",
        startDate,
        endDate,
        status: completed ? "COMPLETED" : "IN_PROGRESS",
        description: `${DEMO_TAG} Stage fictif`,
        durationMonths: 2,
      },
    });

    // ---- tâches ----
    const nTasks = int(4, 8);
    for (let t = 0; t < nTasks; t++) {
      const r = rand();
      let status: "COMPLETED" | "IN_PROGRESS" | "TODO" | "BLOCKED";
      if (weak) status = r < 0.3 ? "COMPLETED" : r < 0.5 ? "IN_PROGRESS" : r < 0.75 ? "BLOCKED" : "TODO";
      else status = r < 0.75 ? "COMPLETED" : r < 0.92 ? "IN_PROGRESS" : "TODO";

      const overdueTask = status !== "COMPLETED" && (weak ? rand() < 0.7 : rand() < 0.1);
      const dueDate = new Date(now.getTime() + (overdueTask ? -int(2, 15) : int(3, 20)) * DAY);
      const hasReport = status === "COMPLETED" && (weak ? rand() < 0.35 : rand() < 0.9);
      const hasEvidence = status === "COMPLETED" && (weak ? rand() < 0.25 : rand() < 0.85);

      await prisma.internshipTask.create({
        data: {
          internshipId: internship.id,
          title: `${taskTitles[t % taskTitles.length]} (démo)`,
          status,
          progress: status === "COMPLETED" ? 100 : status === "IN_PROGRESS" ? int(20, 80) : status === "BLOCKED" ? int(5, 40) : 0,
          dueDate,
          completedAt: status === "COMPLETED" ? new Date(now.getTime() - int(1, 25) * DAY) : null,
          report: hasReport ? `${DEMO_TAG} Rapport fictif de la tâche.` : null,
          evidenceName: hasEvidence ? "preuve-demo.pdf" : null,
        },
      });
    }

    // ---- présence terrain : un pointage (mission) par jour ouvré présent ----
    const presenceRate = weak ? between(0.25, 0.6) : between(0.78, 0.98);
    const lastDay = Math.min(now.getTime(), endDate.getTime());
    for (let d = startDate.getTime(); d <= lastDay; d += DAY) {
      const date = new Date(d);
      const dow = date.getUTCDay();
      if (dow === 0 || dow === 6) continue;
      if (rand() > presenceRate) continue;

      const startedAt = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 5, int(0, 40)));
      await prisma.mission.create({
        data: { agentId: user.id, startedAt, endedAt: new Date(startedAt.getTime() + 8 * 3600_000), endReason: DEMO_TAG },
      });
    }

    // ---- évaluation du tuteur : donne le résultat connu ----
    if (labeled) {
      const note = isStruggling ? between(6, 11.5) : between(12.5, 18);
      const around = (n: number) => Math.max(0, Math.min(20, n + between(-1.5, 1.5)));
      if (isStruggling) struggling++;

      await prisma.internshipEvaluation.create({
        data: {
          internshipId: internship.id,
          evaluatorId: tutor.id,
          title: "Évaluation finale (démo)",
          technicalScore: around(note),
          qualityScore: around(note),
          autonomyScore: around(note),
          punctualityScore: around(note),
          communicationScore: around(note),
          overallScore: Math.round(note * 10) / 10,
          comments: `${DEMO_TAG} Évaluation fictive.`,
          evaluatedAt: new Date(now.getTime() - int(1, 10) * DAY),
        },
      });
    }
  }

  console.log(`✅ ${TOTAL} stagiaires de démo créés : ${struggling} en difficulté, ${TOTAL - UNLABELED - struggling} satisfaisants, ${UNLABELED} à tester.`);
  console.log("   Allez sur /ai/models, onglet « Stagiaires », puis « Entraîner et tester ».");
  console.log("   Après la soutenance : npx tsx prisma/seed-demo-stagiaires.ts --clean");
}

async function main() {
  if (process.argv.includes("--clean")) await clean();
  else await create();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());