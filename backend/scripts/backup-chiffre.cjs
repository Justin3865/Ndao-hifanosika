#!/usr/bin/env node
/**
 * scripts/backup-chiffre.cjs — sauvegarde PostgreSQL CHIFFRÉE (AES-256-GCM), sans dépendance externe.
 *
 *   Sauvegarder :  node scripts/backup-chiffre.cjs backup  [fichier_sortie.dump.enc]
 *   Restaurer   :  node scripts/backup-chiffre.cjs restore <fichier.dump.enc> [fichier_sortie.dump]
 *                  (le .dump déchiffré se restaure ensuite avec : pg_restore --clean -d <base> fichier.dump)
 *
 * Variables : DATABASE_URL (sauvegarde), BACKUP_ENCRYPTION_KEY (32 octets, base64 ou 64 hex).
 * Génération de clé : node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * Conserver la clé HORS du serveur et hors du dépôt : sans elle la sauvegarde est irrécupérable.
 *
 * Format du fichier : "NHBK1" (5 o) | IV (12 o) | données chiffrées | étiquette GCM (16 o).
 * Prérequis : pg_dump dans le PATH (client PostgreSQL).
 */
const { createCipheriv, createDecipheriv, randomBytes } = require("node:crypto");
const { createReadStream, createWriteStream, statSync, openSync, readSync, closeSync } = require("node:fs");
const { spawn } = require("node:child_process");
const { pipeline } = require("node:stream/promises");
const { Transform } = require("node:stream");

const MAGIC = Buffer.from("NHBK1");
const IV_BYTES = 12;
const TAG_BYTES = 16;

function parseKey(raw) {
  const value = String(raw || "").trim();
  if (!value) throw new Error("BACKUP_ENCRYPTION_KEY est absente.");
  const key = /^[0-9a-fA-F]{64}$/.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("BACKUP_ENCRYPTION_KEY doit faire 32 octets (64 hex ou 44 base64).");
  return key;
}

/** Chiffre un flux d'entrée vers un fichier. */
async function encryptStreamToFile(input, outPath, key) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const out = createWriteStream(outPath, { mode: 0o600 });
  out.write(Buffer.concat([MAGIC, iv]));
  const finish = new Transform({
    transform(chunk, _enc, cb) { cb(null, chunk); },
    flush(cb) { cb(null, cipher.getAuthTag()); },
  });
  // cipher.final() doit précéder getAuthTag() : on enchaîne cipher -> finish (flush lit l'étiquette)
  await pipeline(input, cipher, finish, out);
}

/** Déchiffre un fichier vers un autre ; échoue si le fichier a été altéré ou si la clé est mauvaise. */
async function decryptFile(inPath, outPath, key) {
  const size = statSync(inPath).size;
  if (size < MAGIC.length + IV_BYTES + TAG_BYTES) throw new Error("Fichier de sauvegarde invalide (trop court).");
  const fd = openSync(inPath, "r");
  const head = Buffer.alloc(MAGIC.length + IV_BYTES);
  const tag = Buffer.alloc(TAG_BYTES);
  readSync(fd, head, 0, head.length, 0);
  readSync(fd, tag, 0, TAG_BYTES, size - TAG_BYTES);
  closeSync(fd);
  if (!head.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Ce fichier n'est pas une sauvegarde Ndao Hifanosika chiffrée.");
  const decipher = createDecipheriv("aes-256-gcm", key, head.subarray(MAGIC.length));
  decipher.setAuthTag(tag);
  await pipeline(
    createReadStream(inPath, { start: head.length, end: size - TAG_BYTES - 1 }),
    decipher,
    createWriteStream(outPath, { mode: 0o600 }),
  );
}

async function backup(outPath) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL est absente.");
  const key = parseKey(process.env.BACKUP_ENCRYPTION_KEY);
  const target = outPath || `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.dump.enc`;
  const dump = spawn("pg_dump", ["--format=custom", "--no-owner", url], { stdio: ["ignore", "pipe", "inherit"] });
  const exited = new Promise((resolve, reject) => {
    dump.on("error", (e) => reject(new Error(`pg_dump introuvable ou en erreur : ${e.message}`)));
    dump.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`pg_dump a échoué (code ${code}).`))));
  });
  await Promise.all([encryptStreamToFile(dump.stdout, target, key), exited]);
  console.log(`✅ Sauvegarde chiffrée : ${target}`);
}

async function restore(inPath, outPath) {
  if (!inPath) throw new Error("Indiquez le fichier .dump.enc à déchiffrer.");
  const key = parseKey(process.env.BACKUP_ENCRYPTION_KEY);
  const target = outPath || inPath.replace(/\.enc$/, "");
  await decryptFile(inPath, target, key);
  console.log(`✅ Déchiffré : ${target}\n   Restauration : pg_restore --clean --no-owner -d <base> "${target}"`);
}

module.exports = { parseKey, encryptStreamToFile, decryptFile };

if (require.main === module) {
  const [mode, a, b] = process.argv.slice(2);
  const run = mode === "backup" ? backup(a) : mode === "restore" ? restore(a, b) : Promise.reject(new Error("Usage : backup [sortie] | restore <fichier.enc> [sortie]"));
  run.catch((e) => { console.error("❌", e.message); process.exitCode = 1; });
}
