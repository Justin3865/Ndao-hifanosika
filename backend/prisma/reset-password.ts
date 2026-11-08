// prisma/reset-password.ts
// Réinitialise le mot de passe d'UN utilisateur, sans toucher aux autres données.
// Usage :  npx tsx prisma/reset-password.ts <email> <nouveau_mot_de_passe>
// Exemple: npx tsx prisma/reset-password.ts claire.andriamihaja@ndao-hifanosika.org password
import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL est introuvable dans le fichier .env");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const [email, newPassword] = process.argv.slice(2);
  if (!email || !newPassword) {
    console.error("Usage : npx tsx prisma/reset-password.ts <email> <nouveau_mot_de_passe>");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    console.error(`Aucun utilisateur avec l'email : ${email}`);
    process.exitCode = 1;
    return;
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash, status: "ACTIVE" },
  });

  console.log(`✅ Mot de passe réinitialisé pour ${user.email} (${user.role}). Statut : ACTIVE.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());