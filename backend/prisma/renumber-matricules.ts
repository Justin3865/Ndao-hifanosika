import "dotenv/config";
import { prisma } from "../src/config/database";
import { renumberMatricules } from "../src/utils/matricule";

/**
 * Remet directement dans la base de données les matricules en ordre : NH-2026-STG-0001, 0002, 0003…
 * (une personne = un matricule, sans trou ; les N° de certificats de stage suivent).
 *
 *   npx ts-node prisma/renumber-matricules.ts      (ou : npx tsx prisma/renumber-matricules.ts)
 *
 * Faire une sauvegarde de la base avant de lancer.
 */
async function show(title: string) {
  const rows = await prisma.user.findMany({
    where: { matricule: { not: null } } as never,
    select: { id: true, firstName: true, lastName: true, matricule: true } as never,
    orderBy: { matricule: "asc" } as never,
  });

  console.log(`\n${title} (${rows.length})`);

  for (const r of rows as unknown as Array<{ id: number; firstName: string; lastName: string; matricule: string }>) {
    console.log(`  ${r.matricule}  #${r.id}  ${r.firstName} ${r.lastName}`);
  }
}

async function main() {
  await show("AVANT");

  const { changed } = await renumberMatricules();

  console.log(`\n${changed} matricule(s) modifié(s) / libéré(s).`);

  await show("APRÈS");
}

main()
  .catch((error) => {
    console.error("Renumérotation impossible :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
