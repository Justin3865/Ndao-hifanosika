import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { randomBytes } from "node:crypto";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const backup = require(path.resolve(process.cwd(), "scripts/backup-chiffre.cjs")) as {
  parseKey: (raw: string) => Buffer;
  encryptStreamToFile: (input: Readable, out: string, key: Buffer) => Promise<void>;
  decryptFile: (inPath: string, out: string, key: Buffer) => Promise<void>;
};

const dir = mkdtempSync(path.join(tmpdir(), "nhbk-"));
const key = backup.parseKey(randomBytes(32).toString("base64"));
const payload = randomBytes(300_000); // plus grand qu'un bloc de flux

test("sauvegarde chiffrée : aller-retour identique, rien de lisible dans le fichier", async () => {
  const enc = path.join(dir, "a.dump.enc");
  const dec = path.join(dir, "a.dump");
  await backup.encryptStreamToFile(Readable.from([payload.subarray(0, 100_000), payload.subarray(100_000)]), enc, key);
  const stored = readFileSync(enc);
  assert.equal(stored.subarray(0, 5).toString(), "NHBK1");
  assert.ok(!stored.includes(payload.subarray(1000, 1032)), "les données ne doivent pas apparaître en clair");
  await backup.decryptFile(enc, dec, key);
  assert.ok(readFileSync(dec).equals(payload));
});

test("fichier altéré ou mauvaise clé : le déchiffrement échoue", async () => {
  const enc = path.join(dir, "b.dump.enc");
  await backup.encryptStreamToFile(Readable.from([payload]), enc, key);
  const bytes = readFileSync(enc);
  const altered = Buffer.from(bytes);
  altered[200] ^= 0xff;
  writeFileSync(path.join(dir, "c.dump.enc"), altered);
  await assert.rejects(backup.decryptFile(path.join(dir, "c.dump.enc"), path.join(dir, "c.dump"), key));
  await assert.rejects(backup.decryptFile(enc, path.join(dir, "d.dump"), backup.parseKey(randomBytes(32).toString("base64"))));
  writeFileSync(path.join(dir, "e.dump.enc"), Buffer.from("pas une sauvegarde du tout, juste du texte quelconque"));
  await assert.rejects(backup.decryptFile(path.join(dir, "e.dump.enc"), path.join(dir, "e.dump"), key));
});
