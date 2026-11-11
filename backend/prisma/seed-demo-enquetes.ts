/**
 * DONNÉES DE DÉMO pour la soutenance — à placer dans srcb/prisma/seed-demo-enquetes.ts
 *
 * Crée un projet « [DEMO] Soutenance » + 24 ménages enquêtés par un agent (12 vulnérables / 12 non vulnérables)
 * pour que « Entraîner maintenant » (modèles de vulnérabilité) ne réponde plus « Données insuffisantes ».
 *
 *   npx tsx prisma/seed-demo-enquetes.ts           # crée les données de démo
 *   npx tsx prisma/seed-demo-enquetes.ts --clean   # SUPPRIME tout ce qui a été créé (après la soutenance)
 *
 * Tout est rattaché au projet de code DEMO-SOUTENANCE : le supprimer efface en cascade ses ménages et leurs
 * enquêtes (onDelete: Cascade). Aucune autre donnée n'est touchée.
 * AVERTISSEMENT : données SIMULÉES — ne jamais les présenter comme des résultats réels.
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL est introuvable dans le fichier .env");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const DEMO_CODE = "DEMO-SOUTENANCE";
const DEMO_TAG = "[DEMO-SOUTENANCE]";

// Petit générateur pseudo-aléatoire reproductible (mêmes données à chaque exécution)
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

async function clean() {
  const project = await prisma.project.findUnique({ where: { code: DEMO_CODE } });
  if (!project) {
    console.log("Rien à supprimer : aucun projet DEMO-SOUTENANCE.");
    return;
  }
  // Les enquêtes sont liées aux ménages (cascade) ; on supprime aussi la mission de démo
  await prisma.survey.deleteMany({ where: { notes: { startsWith: DEMO_TAG } } });
  await prisma.mission.deleteMany({ where: { endReason: DEMO_TAG } });
  await prisma.project.delete({ where: { id: project.id } }); // cascade -> bénéficiaires
  console.log("✅ Données de démo supprimées.");
}

async function create() {
  if (await prisma.project.findUnique({ where: { code: DEMO_CODE } })) {
    console.log("Les données de démo existent déjà. Lancez avec --clean pour les supprimer d'abord.");
    return;
  }

  // Agent qui « a réalisé » les enquêtes : un coordinateur existant, sinon l'admin
  const agent =
    (await prisma.user.findFirst({ where: { role: "COORDINATOR" }, orderBy: { id: "asc" } })) ??
    (await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { id: "asc" } }));
  if (!agent) throw new Error("Aucun utilisateur (COORDINATOR ou ADMIN) trouvé pour attribuer les enquêtes.");

  const project = await prisma.project.create({
    data: {
      name: "[DEMO] Soutenance",
      code: DEMO_CODE,
      description: "Données fictives pour la démonstration. À supprimer après la soutenance.",
      status: "ACTIVE",
      createdById: agent.id,
    },
  });

  const now = new Date();
  const mission = await prisma.mission.create({
    data: { agentId: agent.id, startedAt: new Date(now.getTime() - 4 * 3600_000), endedAt: now, endReason: DEMO_TAG },
  });

  const rand = rng(42);
  const int = (min: number, max: number) => Math.floor(min + rand() * (max - min + 1));
  const first = ["Rakoto", "Rasoa", "Andry", "Hery", "Fara", "Tiana", "Njaka", "Lalao", "Mamy", "Voahangy", "Toky", "Soa"];
  const last = ["Randria", "Rabe", "Razafy", "Rakotomalala", "Andrianina", "Ravelo"];
  const housing = ["Précaire", "Bois", "Brique", "Dur"];

  const total = 24;
  for (let i = 0; i < total; i++) {
    const vulnerable = i % 2 === 0; // 12 / 12
    // Profils contrastés mais avec un peu de chevauchement (pas 100 % séparable)
    const noise = rand() < 0.12;
    const poor = vulnerable !== noise;
    const householdSize = poor ? int(5, 9) : int(2, 5);
    const monthlyIncome = poor ? int(30, 120) * 1000 : int(150, 600) * 1000;
    const childrenUnder5 = poor ? int(1, 4) : int(0, 2);
    const outOfSchool = poor ? int(1, 3) : int(0, 1);
    const meals = poor ? int(1, 2) : int(2, 3);
    const hasDisability = poor ? rand() < 0.35 : rand() < 0.05;
    const lat = -18.91 + (rand() - 0.5) * 0.06;
    const lng = 47.52 + (rand() - 0.5) * 0.06;
    const startedAt = new Date(now.getTime() - (total - i) * 8 * 60_000 - 3600_000);

    const b = await prisma.beneficiary.create({
      data: {
        projectId: project.id,
        firstName: `${first[i % first.length]}`,
        lastName: `${last[i % last.length]} (démo ${i + 1})`,
        gender: i % 3 === 0 ? "MALE" : "FEMALE",
        age: int(20, 60),
        vulnerable,
        latitude: lat,
        longitude: lng,
        homeLatitude: lat,
        homeLongitude: lng,
        householdSize,
        monthlyIncome,
        childrenUnder5,
        hasDisability,
        outOfSchoolChildren: outOfSchool,
        mealsPerDay: meals,
        healthIssues: poor ? rand() < 0.6 : rand() < 0.15,
        waterAccess: poor ? rand() < 0.3 : rand() < 0.85,
        electricityAccess: poor ? rand() < 0.2 : rand() < 0.9,
        housingType: poor ? housing[int(0, 1)] : housing[int(2, 3)],
        notes: `${DEMO_TAG} Ménage fictif`,
      },
    });

    await prisma.survey.create({
      data: {
        beneficiaryId: b.id,
        agentId: agent.id,
        missionId: mission.id,
        latitude: lat,
        longitude: lng,
        householdSize,
        monthlyIncome,
        childrenUnder5,
        outOfSchoolChildren: outOfSchool,
        mealsPerDay: meals,
        hasDisability,
        healthIssues: b.healthIssues,
        waterAccess: b.waterAccess,
        electricityAccess: b.electricityAccess,
        housingType: b.housingType,
        vulnerable,
        notes: `${DEMO_TAG} Enquête fictive`,
        startedAt,
        endedAt: new Date(startedAt.getTime() + 6 * 60_000),
      },
    });
  }

  console.log(`✅ ${total} ménages enquêtés créés (12 vulnérables / 12 non vulnérables), projet ${DEMO_CODE}.`);
  console.log("   Allez sur /ai/models puis « Entraîner maintenant ».");
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