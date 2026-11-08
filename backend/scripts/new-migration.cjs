#!/usr/bin/env node
/**
 * Crée un dossier de migration Prisma dont l'horodatage est TOUJOURS postérieur à la dernière migration existante.
 *
 * Pourquoi : le dépôt contient des migrations datées dans le futur (20261109… à 20261119). `prisma migrate dev`
 * nommerait une nouvelle migration avec l'heure RÉELLE, donc AVANT elles : Prisma verrait un historique dans le
 * désordre et proposerait de réinitialiser la base. Ce script évite cela sans renommer aucune migration existante
 * (les renommer casserait les bases où elles sont déjà appliquées).
 *
 * Usage :  node scripts/new-migration.cjs <nom_en_snake_case>
 * Puis     écrire le SQL dans le migration.sql créé (migrations ADDITIVES : pas de DROP de table/colonne existante),
 *          mettre à jour schema.prisma, et lancer `npx prisma migrate deploy` (ou migrate dev).
 * Aide     npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
 *          (à lancer AVANT de modifier schema.prisma si vous voulez un diff, ou après avec --from-migrations).
 */
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "prisma", "migrations");
const name = (process.argv[2] || "").trim();
if (!/^[a-z][a-z0-9_]{2,60}$/.test(name)) {
  console.error("Nom invalide : snake_case, 3 à 61 caractères (ex. project_members).");
  process.exit(1);
}
const stamp = (d) => d.toISOString().replace(/[-:T]/g, "").slice(0, 14);
const toDate = (s) => new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(8, 10), +s.slice(10, 12), +s.slice(12, 14)));

const existing = fs.readdirSync(dir).filter((f) => /^\d{14}_/.test(f)).sort();
const latest = existing.length ? existing[existing.length - 1].slice(0, 14) : "00000000000000";
const now = stamp(new Date());
let next = now > latest ? now : stamp(new Date(toDate(latest).getTime() + 1000)); // dernière + 1 s
const folder = `${next}_${name}`;
if (fs.existsSync(path.join(dir, folder))) {
  console.error(`Existe déjà : ${folder}`);
  process.exit(1);
}
fs.mkdirSync(path.join(dir, folder));
fs.writeFileSync(path.join(dir, folder, "migration.sql"), `-- ${name}\n-- Migration additive : ne supprime ni table, ni colonne, ni route existante.\n\n`);
console.log(`Créé : prisma/migrations/${folder}/migration.sql` + (now > latest ? "" : `  (horodatage = dernière migration + 1 s, car la dernière est datée du futur : ${latest})`));
