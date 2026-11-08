#!/usr/bin/env node
/**
 * Vérifie le dossier prisma/migrations (à lancer en CI : `node scripts/check-migrations.cjs`).
 *   ERREUR  : nom mal formé, horodatage invalide, doublon de nom, migration.sql manquant ou vide.
 *   ALERTE  : migrations datées dans le futur (informatif ; ne fait PAS échouer). Rappel : créer les nouvelles
 *             migrations avec `node scripts/new-migration.cjs <nom>`, pas avec `prisma migrate dev` seul.
 * Code de sortie 1 s'il y a au moins une ERREUR.
 */
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "prisma", "migrations");
const entries = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const errors = [];
const future = [];
const nowStamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const seen = new Set();

for (const name of entries) {
  const m = /^(\d{14})_([a-z0-9_]+)$/.exec(name);
  if (!m) { errors.push(`Nom invalide : ${name}`); continue; }
  const [, ts] = m;
  const mo = +ts.slice(4, 6), da = +ts.slice(6, 8), h = +ts.slice(8, 10), mi = +ts.slice(10, 12), s = +ts.slice(12, 14);
  if (mo < 1 || mo > 12 || da < 1 || da > 31 || h > 23 || mi > 59 || s > 59) errors.push(`Horodatage invalide : ${name}`);
  if (seen.has(name)) errors.push(`Doublon : ${name}`);
  seen.add(name);
  const sql = path.join(dir, name, "migration.sql");
  if (!fs.existsSync(sql)) errors.push(`migration.sql manquant : ${name}`);
  else if (!fs.readFileSync(sql, "utf8").replace(/--.*$/gm, "").trim()) errors.push(`migration.sql vide (commentaires seuls) : ${name}`);
  if (ts > nowStamp) future.push(name);
}

console.log(`${entries.length} migrations ; dernière : ${entries[entries.length - 1] || "-"}`);
if (future.length) {
  console.warn(`ALERTE : ${future.length} migration(s) datée(s) dans le futur (${future[0]} … ${future[future.length - 1]}).`);
  console.warn("  -> `prisma migrate dev` nommerait la prochaine migration AVANT elles. Utilisez : node scripts/new-migration.cjs <nom>");
}
if (errors.length) { console.error("\nERREURS :\n - " + errors.join("\n - ")); process.exit(1); }
console.log("OK : historique cohérent.");
