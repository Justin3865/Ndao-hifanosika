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

const BCRYPT_ROUNDS = 12;

const ADMIN_EMAIL = "admin@ndao-hifanosika.org";
const ADMIN_PASSWORD = "admin";

async function main() {
  console.log("🔐 Création / vérification du compte ADMIN...\n");

  // Vérifier si l'ADMIN existe déjà
  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: ADMIN_EMAIL,
    },
  });

  if (existingAdmin) {
    console.log("⚠️ Le compte ADMIN existe déjà.");
    console.log(`   Email  : ${existingAdmin.email}`);
    console.log(`   Role   : ${existingAdmin.role}`);
    console.log(`   Status : ${existingAdmin.status}`);
    return;
  }

  // Chercher le département Direction
  let department = await prisma.department.findFirst({
    where: {
      code: "DIR",
    },
  });

  // Si le département Direction n'existe pas, le créer
  if (!department) {
    department = await prisma.department.create({
      data: {
        name: "Direction",
        code: "DIR",
        description: "Direction générale de Ndao Hifanosika",
      },
    });

    console.log("✓ Département Direction créé.");
  }

  // Hasher le mot de passe
  const passwordHash = await bcrypt.hash(
    ADMIN_PASSWORD,
    BCRYPT_ROUNDS,
  );

  // Créer l'ADMIN
  const admin = await prisma.user.create({
    data: {
      firstName: "Administrateur",
      lastName: "Système",
      email: ADMIN_EMAIL,
      password: passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      departmentId: department.id,
    },
  });

  console.log("========================================");
  console.log("✅ COMPTE ADMIN CRÉÉ AVEC SUCCÈS");
  console.log("========================================");
  console.log(`Email      : ${admin.email}`);
  console.log(`Role       : ${admin.role}`);
  console.log(`Status     : ${admin.status}`);
  console.log("Password   : admin");
  console.log("Stockage   : bcrypt");
  console.log("========================================");
}

main()
  .catch((error) => {
    console.error("\n❌ Erreur pendant la création de l'ADMIN :");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });