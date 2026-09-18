import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL est introuvable dans le fichier .env");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

// ============================================================
// CONFIGURATION DES MOTS DE PASSE
// ============================================================

const BCRYPT_ROUNDS = 12;

const ADMIN_PASSWORD = "admin";
const DEFAULT_USER_PASSWORD = "password";

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("🌱 Début du seed...\n");

  // ============================================================
  // 1. SUPPRESSION DES DONNÉES EXISTANTES
  // ============================================================

  console.log("🗑️ Suppression des anciennes données...");

  await prisma.auditLog.deleteMany();
  await prisma.internship.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.beneficiary.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  console.log("✓ Anciennes données supprimées\n");

  // ============================================================
  // 2. DEPARTMENTS - 20
  // ============================================================

  console.log("🏢 Création des départements...");

  const departmentData = [
    {
      name: "Direction",
      code: "DIR",
      description: "Direction générale de Ndao Hifanosika",
    },
    {
      name: "Direction des Systèmes d'Information",
      code: "DSI",
      description: "Gestion des systèmes informatiques et numériques",
    },
    {
      name: "Direction Administrative et Financière",
      code: "DAF",
      description: "Gestion administrative et financière",
    },
    {
      name: "Ressources Humaines",
      code: "RH",
      description: "Gestion des ressources humaines",
    },
    {
      name: "Communication",
      code: "COM",
      description: "Communication et relations publiques",
    },
    {
      name: "Maison Digitale pour les Femmes",
      code: "MDF",
      description: "Formation numérique destinée aux femmes",
    },
    {
      name: "Kids Preneur",
      code: "KID",
      description: "Programme entrepreneurial pour les enfants",
    },
    {
      name: "Ankizy Innov",
      code: "ANI",
      description: "Programme innovation et créativité pour les jeunes",
    },
    {
      name: "Otrikasa",
      code: "OTR",
      description: "Programme de développement et accompagnement",
    },
    {
      name: "Formation",
      code: "FOR",
      description: "Département chargé des formations",
    },
    {
      name: "Incubation",
      code: "INC",
      description: "Accompagnement des jeunes entrepreneurs",
    },
    {
      name: "Suivi et Évaluation",
      code: "SE",
      description: "Suivi, évaluation et analyse des projets",
    },
    {
      name: "Partenariats",
      code: "PAR",
      description: "Gestion des partenaires et collaborations",
    },
    {
      name: "Administration",
      code: "ADM",
      description: "Gestion administrative générale",
    },
    {
      name: "Finance",
      code: "FIN",
      description: "Gestion financière et budgétaire",
    },
    {
      name: "Logistique",
      code: "LOG",
      description: "Gestion logistique et matérielle",
    },
    {
      name: "Protection",
      code: "PRO",
      description: "Protection des bénéficiaires vulnérables",
    },
    {
      name: "Innovation",
      code: "INN",
      description: "Recherche et développement de solutions innovantes",
    },
    {
      name: "Terrain",
      code: "TER",
      description: "Interventions et activités sur le terrain",
    },
    {
      name: "Documentation",
      code: "DOC",
      description: "Gestion documentaire et archivage",
    },
  ];

  const departments = await Promise.all(
    departmentData.map((department) =>
      prisma.department.create({
        data: department,
      }),
    ),
  );

  console.log(`✓ Departments : ${departments.length}`);

  // ============================================================
  // 3. ADMINISTRATEUR - COMPTE UNIQUE
  // ============================================================

  console.log("\n🔐 Création du compte administrateur...");

  const adminPasswordHash = await bcrypt.hash(
    ADMIN_PASSWORD,
    BCRYPT_ROUNDS,
  );

  const admin = await prisma.user.create({
    data: {
      firstName: "Administrateur",
      lastName: "Système",
      email: "admin@ndao-hifanosika.org",
      password: adminPasswordHash,
      role: "ADMIN",
      status: "ACTIVE",
      departmentId: departments[0].id,
    },
  });

  console.log("✓ Administrateur créé");
  console.log(`  Email      : ${admin.email}`);
  console.log(`  Role       : ${admin.role}`);
  console.log(`  Status     : ${admin.status}`);
  console.log("  Password   : bcrypt hashé");
  console.log("");

  // ============================================================
  // 4. USERS - 19 UTILISATEURS
  // ============================================================

  console.log("👥 Création des utilisateurs...");

  const userData = [
    {
      firstName: "Jean",
      lastName: "Rakoto",
      email: "jean.rakoto@ndao-hifanosika.org",
      role: "DIRECTION" as const,
      status: "ACTIVE" as const,
      departmentId: departments[0].id,
    },
    {
      firstName: "Marie",
      lastName: "Rasoanaivo",
      email: "marie.rasoanaivo@ndao-hifanosika.org",
      role: "DSI" as const,
      status: "ACTIVE" as const,
      departmentId: departments[1].id,
    },
    {
      firstName: "Paul",
      lastName: "Randria",
      email: "paul.randria@ndao-hifanosika.org",
      role: "DAF" as const,
      status: "ACTIVE" as const,
      departmentId: departments[2].id,
    },
    {
      firstName: "Claire",
      lastName: "Andriamihaja",
      email: "claire.andriamihaja@ndao-hifanosika.org",
      role: "RH" as const,
      status: "ACTIVE" as const,
      departmentId: departments[3].id,
    },
    {
      firstName: "Nathalie",
      lastName: "Rabe",
      email: "nathalie.rabe@ndao-hifanosika.org",
      role: "COMMUNICATION" as const,
      status: "ACTIVE" as const,
      departmentId: departments[4].id,
    },
    {
      firstName: "Hery",
      lastName: "Rakotomalala",
      email: "hery.rakotomalala@ndao-hifanosika.org",
      role: "COORDINATOR" as const,
      status: "ACTIVE" as const,
      departmentId: departments[5].id,
    },
    {
      firstName: "Fara",
      lastName: "Razanadrakoto",
      email: "fara.razanadrakoto@ndao-hifanosika.org",
      role: "COORDINATOR" as const,
      status: "ACTIVE" as const,
      departmentId: departments[6].id,
    },
    {
      firstName: "Toky",
      lastName: "Andrianina",
      email: "toky.andrianina@ndao-hifanosika.org",
      role: "COORDINATOR" as const,
      status: "ACTIVE" as const,
      departmentId: departments[7].id,
    },
    {
      firstName: "Lova",
      lastName: "Rakotoarisoa",
      email: "lova.rakotoarisoa@ndao-hifanosika.org",
      role: "TUTEUR_L3" as const,
      status: "ACTIVE" as const,
      departmentId: departments[9].id,
    },
    {
      firstName: "Mamy",
      lastName: "Randrianasolo",
      email: "mamy.randrianasolo@ndao-hifanosika.org",
      role: "TUTEUR_M2" as const,
      status: "ACTIVE" as const,
      departmentId: departments[9].id,
    },
    {
      firstName: "Sarah",
      lastName: "Raveloson",
      email: "sarah.raveloson@ndao-hifanosika.org",
      role: "STAGIAIRE_L3" as const,
      status: "ACTIVE" as const,
      departmentId: departments[10].id,
    },
    {
      firstName: "Kevin",
      lastName: "Andriamamonjy",
      email: "kevin.andriamamonjy@ndao-hifanosika.org",
      role: "STAGIAIRE_L3" as const,
      status: "ACTIVE" as const,
      departmentId: departments[10].id,
    },
    {
      firstName: "Anja",
      lastName: "Rasolofoniaina",
      email: "anja.rasolofoniaina@ndao-hifanosika.org",
      role: "STAGIAIRE_M2" as const,
      status: "ACTIVE" as const,
      departmentId: departments[11].id,
    },
    {
      firstName: "Mickael",
      lastName: "Rakotondrabe",
      email: "mickael.rakotondrabe@ndao-hifanosika.org",
      role: "STAGIAIRE_M2" as const,
      status: "ACTIVE" as const,
      departmentId: departments[11].id,
    },
    {
      firstName: "Julie",
      lastName: "Razafindrakoto",
      email: "julie.razafindrakoto@ndao-hifanosika.org",
      role: "STAGIAIRE_M2" as const,
      status: "PENDING" as const,
      departmentId: departments[12].id,
    },
    {
      firstName: "Dina",
      lastName: "Razanakoto",
      email: "dina.razanakoto@ndao-hifanosika.org",
      role: "STAGIAIRE_L3" as const,
      status: "PENDING" as const,
      departmentId: departments[13].id,
    },
    {
      firstName: "Olivier",
      lastName: "Ramanantsoa",
      email: "olivier.ramanantsoa@ndao-hifanosika.org",
      role: "STAGIAIRE_L3" as const,
      status: "ACTIVE" as const,
      departmentId: departments[14].id,
    },
    {
      firstName: "Miora",
      lastName: "Andriatsiferana",
      email: "miora.andriatsiferana@ndao-hifanosika.org",
      role: "STAGIAIRE_M2" as const,
      status: "ACTIVE" as const,
      departmentId: departments[15].id,
    },
    {
      firstName: "Tiana",
      lastName: "Rakotobe",
      email: "tiana.rakotobe@ndao-hifanosika.org",
      role: "COORDINATOR" as const,
      status: "ACTIVE" as const,
      departmentId: departments[18].id,
    },
  ];

  // Hash du mot de passe par défaut pour les utilisateurs
  const defaultUserPasswordHash = await bcrypt.hash(
    DEFAULT_USER_PASSWORD,
    BCRYPT_ROUNDS,
  );

  const users = await Promise.all(
    userData.map((user) =>
      prisma.user.create({
        data: {
          ...user,
          password: defaultUserPasswordHash,
        },
      }),
    ),
  );

  console.log(`✓ Users : ${users.length}`);
  console.log("  Password par défaut : bcrypt hashé");

  // ============================================================
  // 5. PROJECTS - 20
  // ============================================================

  console.log("\n📁 Création des projets...");

  const projectNames = [
    "Maison Digitale",
    "Kids Preneur",
    "Ankizy Innov",
    "Otrikasa",
    "Formation Numérique",
    "Entrepreneuriat Jeunes",
    "Autonomisation des Femmes",
    "Innovation Sociale",
    "Inclusion Numérique",
    "Programme Éducation",
    "Compétences Digitales",
    "Accompagnement Jeunes",
    "Leadership Féminin",
    "Création d'Emploi",
    "Innovation Technologique",
    "Développement Local",
    "Protection des Enfants",
    "Insertion Professionnelle",
    "Incubation Jeunes",
    "Transformation Digitale",
  ];

  const projectData = projectNames.map((name, index) => ({
    name,
    code: `PROJ-${String(index + 1).padStart(3, "0")}`,
    description: `Projet ${name} de Ndao Hifanosika`,
    objective: `Accompagner les bénéficiaires dans le cadre du programme ${name}`,
    startDate: new Date(2026, index % 6, 1 + index),
    endDate: new Date(2026, 6 + (index % 5), 15),
    status:
      index < 12
        ? ("ACTIVE" as const)
        : index < 15
          ? ("COMPLETED" as const)
          : index < 18
            ? ("SUSPENDED" as const)
            : ("DRAFT" as const),
    budget: 5000000 + index * 750000,
    beneficiaryTarget: 50 + index * 10,
    departmentId: departments[index % departments.length].id,
    createdById: users[index % users.length].id,
  }));

  const projects = await Promise.all(
    projectData.map((project) =>
      prisma.project.create({
        data: project,
      }),
    ),
  );

  console.log(`✓ Projects : ${projects.length}`);

  // ============================================================
  // 6. ACTIVITIES - 20
  // ============================================================

  console.log("📅 Création des activités...");

  const activityData = Array.from({ length: 20 }, (_, index) => ({
    projectId: projects[index].id,
    title: `Activité ${index + 1} - ${projectNames[index]}`,
    description: `Activité de mise en œuvre du projet ${projectNames[index]}`,
    location: index % 2 === 0 ? "Antananarivo" : "Fianarantsoa",
    startDate: new Date(2026, 1 + (index % 8), 5 + index),
    endDate: new Date(2026, 2 + (index % 8), 10 + index),
    status:
      index < 8
        ? ("COMPLETED" as const)
        : index < 15
          ? ("IN_PROGRESS" as const)
          : index < 18
            ? ("PLANNED" as const)
            : ("CANCELLED" as const),
    budget: 500000 + index * 100000,
    createdById: users[(index + 1) % users.length].id,
  }));

  const activities = await Promise.all(
    activityData.map((activity) =>
      prisma.activity.create({
        data: activity,
      }),
    ),
  );

  console.log(`✓ Activities : ${activities.length}`);

  // ============================================================
  // 7. MILESTONES - 20
  // ============================================================

  console.log("🎯 Création des jalons...");

  const milestoneData = Array.from({ length: 20 }, (_, index) => ({
    projectId: projects[index].id,
    title: `Jalon ${index + 1} - ${projectNames[index]}`,
    description: `Jalon de suivi du projet ${projectNames[index]}`,
    dueDate: new Date(2026, 5 + (index % 5), 10 + (index % 15)),
    completedAt:
      index < 10
        ? new Date(2026, 5 + (index % 5), 5 + (index % 15))
        : null,
    progress: index < 10 ? 100 : 25 + index * 2,
  }));

  const milestones = await Promise.all(
    milestoneData.map((milestone) =>
      prisma.milestone.create({
        data: milestone,
      }),
    ),
  );

  console.log(`✓ Milestones : ${milestones.length}`);

  // ============================================================
  // 8. BENEFICIARIES - 20
  // ============================================================

  console.log("❤️ Création des bénéficiaires...");

  const firstNames = [
    "Aina",
    "Mialy",
    "Faneva",
    "Hasina",
    "Soa",
    "Lalaina",
    "Zo",
    "Tahina",
    "Mamy",
    "Fitiavana",
    "Toky",
    "Hanta",
    "Miora",
    "Nantenaina",
    "Lova",
    "Tiana",
    "Mirana",
    "Anjara",
    "Voahirana",
    "Manda",
  ];

  const lastNames = [
    "Rakoto",
    "Rasoanaivo",
    "Randria",
    "Rabe",
    "Rakotomalala",
    "Andriamihaja",
    "Razanakoto",
    "Raveloson",
    "Randrianasolo",
    "Andrianina",
    "Rakotobe",
    "Ramanantsoa",
    "Razafindrakoto",
    "Andriatsiferana",
    "Rakotondrabe",
    "Razanadrakoto",
    "Rasoazanany",
    "Rakotovao",
    "Andriamampionona",
    "Rasolofoniaina",
  ];

  const beneficiaries = await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      prisma.beneficiary.create({
        data: {
          projectId: projects[index].id,
          firstName: firstNames[index],
          lastName: lastNames[index],
          gender: index % 2 === 0 ? "FEMALE" : "MALE",
          age: 12 + (index % 25),
          phone: `034${String(1000000 + index).padStart(7, "0")}`,
          email: `beneficiaire${index + 1}@example.org`,
          vulnerable: index % 4 === 0,
        },
      }),
    ),
  );

  console.log(`✓ Beneficiaries : ${beneficiaries.length}`);

  // ============================================================
  // 9. EVALUATIONS - 20
  // ============================================================

  console.log("📊 Création des évaluations...");

  const evaluations = await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      prisma.evaluation.create({
        data: {
          projectId: projects[index].id,
          title: `Évaluation ${index + 1} - ${projectNames[index]}`,
          description: `Évaluation des résultats du projet ${projectNames[index]}`,
          score: 60 + (index % 35),
          status:
            index < 5
              ? ("DRAFT" as const)
              : index < 12
                ? ("SUBMITTED" as const)
                : ("VALIDATED" as const),
          evaluatedAt:
            index >= 5
              ? new Date(2026, 7, 1 + (index % 20))
              : null,
          createdById: users[(index + 2) % users.length].id,
        },
      }),
    ),
  );

  console.log(`✓ Evaluations : ${evaluations.length}`);

  // ============================================================
  // 10. INTERNSHIPS - 20
  // ============================================================

  console.log("🎓 Création des stages...");

  const internships = await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      prisma.internship.create({
        data: {
          projectId: projects[index].id,
          studentId: users[10 + (index % 9)].id,
          supervisorId: users[8 + (index % 2)].id,
          title: `Stage ${index + 1} - Suivi et Évaluation`,
          institution:
            index % 2 === 0
              ? "Université de Fianarantsoa"
              : "ENI Fianarantsoa",
          startDate: new Date(2026, 7, 1 + (index % 15)),
          endDate: new Date(2026, 9, 1 + (index % 15)),
          status:
            index < 5
              ? ("PENDING" as const)
              : index < 14
                ? ("IN_PROGRESS" as const)
                : index < 18
                  ? ("COMPLETED" as const)
                  : ("CANCELLED" as const),
          description: `Stage pratique dans le cadre du projet ${projectNames[index]}`,
        },
      }),
    ),
  );

  console.log(`✓ Internships : ${internships.length}`);

  // ============================================================
  // 11. AUDIT LOGS - 20
  // ============================================================

  console.log("📝 Création des journaux d'audit...");

  const auditLogs = await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      prisma.auditLog.create({
        data: {
          userId:
            index === 0
              ? admin.id
              : users[(index - 1) % users.length].id,
          action:
            index % 4 === 0
              ? "CREATE"
              : index % 4 === 1
                ? "UPDATE"
                : index % 4 === 2
                  ? "LOGIN"
                  : "VIEW",
          entity:
            index % 3 === 0
              ? "Project"
              : index % 3 === 1
                ? "User"
                : "Evaluation",
          entityId: (index % 20) + 1,
          details: {
            message: `Action de test numéro ${index + 1}`,
            source: "seed",
          },
          ipAddress: "127.0.0.1",
          userAgent: "Ndao-Hifanosika-Test",
        },
      }),
    ),
  );

  console.log(`✓ AuditLogs : ${auditLogs.length}`);

  // ============================================================
  // RÉSUMÉ
  // ============================================================

  console.log("\n========================================");
  console.log("🎉 SEED TERMINÉ AVEC SUCCÈS !");
  console.log("========================================");
  console.log(`Admin         : 1`);
  console.log(`Users         : ${users.length}`);
  console.log(`Departments   : ${departments.length}`);
  console.log(`Projects      : ${projects.length}`);
  console.log(`Activities    : ${activities.length}`);
  console.log(`Milestones    : ${milestones.length}`);
  console.log(`Beneficiaries : ${beneficiaries.length}`);
  console.log(`Evaluations   : ${evaluations.length}`);
  console.log(`Internships   : ${internships.length}`);
  console.log(`AuditLogs     : ${auditLogs.length}`);
  console.log("----------------------------------------");
  console.log(
    `TOTAL         : ${
      departments.length +
      1 +
      users.length +
      projects.length +
      activities.length +
      milestones.length +
      beneficiaries.length +
      evaluations.length +
      internships.length +
      auditLogs.length
    } enregistrements`,
  );
  console.log("----------------------------------------");
  console.log("🔐 ADMIN");
  console.log("Email         : admin@ndao-hifanosika.org");
  console.log("Mot de passe  : admin");
  console.log("Stockage      : bcrypt");
  console.log("----------------------------------------");
  console.log("👥 UTILISATEURS");
  console.log("Mot de passe  : password");
  console.log("Stockage      : bcrypt");
  console.log("========================================\n");
}

// ============================================================
// EXECUTION
// ============================================================

main()
  .catch((error) => {
    console.error("\n❌ Erreur pendant le seed :");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });