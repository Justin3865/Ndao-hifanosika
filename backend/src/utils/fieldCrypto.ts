// src/utils/fieldCrypto.ts
// Chiffrement applicatif AES-256-GCM des champs sensibles (CIN, téléphone, …) — cahier §6 et §10.
//
// ÉTAT : module PRÊT et TESTÉ, mais volontairement NON BRANCHÉ sur les modèles. Chiffrer CIN/téléphone
// change leur stockage (recherche, unicité, filtres) : cela demande la décision du DSI (voir
// docs/SECURITE_LOT_C.md). L'alternative sans impact applicatif est le volume + les sauvegardes chiffrés
// (scripts/backup-chiffre.cjs).
//
// Format d'une valeur chiffrée :  enc:v1:<iv base64url>:<tag base64url>:<texte chiffré base64url>
//  - IV aléatoire de 12 octets pour chaque chiffrement (jamais réutilisé) ;
//  - étiquette GCM de 16 octets : toute modification du texte chiffré est détectée au déchiffrement ;
//  - la valeur déjà chiffrée n'est pas rechiffrée (idempotent) ; une valeur en clair est rendue telle quelle
//    au déchiffrement (migration progressive possible).

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";
const IV_BYTES = 12;

/** Clé de 32 octets fournie en base64 (44 car.) ou en hexadécimal (64 car.). */
export function parseKey(raw: string | undefined, name = "DATA_ENCRYPTION_KEY"): Buffer {
  const value = String(raw ?? "").trim();
  if (!value) throw new Error(`${name} est absente.`);
  const key = /^[0-9a-fA-F]{64}$/.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error(`${name} doit faire 32 octets (64 caractères hexadécimaux ou 44 en base64).`);
  return key;
}

/** Génère une clé aléatoire de 32 octets (base64). */
export function generateKey(): string {
  return randomBytes(32).toString("base64");
}

export const isEncrypted = (value: unknown): value is string => typeof value === "string" && value.startsWith(PREFIX);

export function encryptField(plain: string | null | undefined, key: Buffer): string | null {
  if (plain === null || plain === undefined) return null;
  if (isEncrypted(plain)) return plain;
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return `${PREFIX}${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${body.toString("base64url")}`;
}

export function decryptField(value: string | null | undefined, key: Buffer): string | null {
  if (value === null || value === undefined) return null;
  if (!isEncrypted(value)) return value; // valeur historique en clair
  const [ivB64, tagB64, bodyB64] = value.slice(PREFIX.length).split(":");
  if (!ivB64 || !tagB64 || bodyB64 === undefined) throw new Error("Valeur chiffrée mal formée.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(bodyB64, "base64url")), decipher.final()]).toString("utf8");
}

/**
 * Index aveugle : empreinte HMAC-SHA256 déterministe, pour RECHERCHER ou garantir l'UNICITÉ d'une valeur
 * (ex. un CIN) sans la stocker en clair. Utiliser une clé DIFFÉRENTE de celle du chiffrement
 * (DATA_INDEX_KEY). La valeur est normalisée (espaces et casse) avant calcul.
 */
export function blindIndex(plain: string, indexKey: Buffer): string {
  const normalized = String(plain).replace(/\s+/g, "").toLowerCase();
  return createHmac("sha256", indexKey).update(normalized).digest("hex");
}
