import test from "node:test";
import assert from "node:assert/strict";
import { blindIndex, decryptField, encryptField, generateKey, isEncrypted, parseKey } from "../src/utils/fieldCrypto";

const key = parseKey(generateKey());

test("aller-retour : le texte est retrouvé, y compris accents et vide", () => {
  for (const plain of ["101 231 456 789", "034 12 345 67", "Rakotoarivelo é ü", ""]) {
    const enc = encryptField(plain, key) as string;
    assert.ok(isEncrypted(enc));
    assert.ok(!enc.includes(plain) || plain === "");
    assert.equal(decryptField(enc, key), plain);
  }
});

test("IV aléatoire : deux chiffrements du même texte diffèrent", () => {
  assert.notEqual(encryptField("0340000000", key), encryptField("0340000000", key));
});

test("null conservé, valeur déjà chiffrée non rechiffrée, valeur en clair rendue telle quelle", () => {
  assert.equal(encryptField(null, key), null);
  assert.equal(decryptField(undefined, key), null);
  const enc = encryptField("abc", key) as string;
  assert.equal(encryptField(enc, key), enc);
  assert.equal(decryptField("0340000000", key), "0340000000");
});

test("altération ou mauvaise clé détectées (authentification GCM)", () => {
  const enc = encryptField("secret", key) as string;
  const parts = enc.split(":");
  const tampered = [...parts.slice(0, 4), parts[4].replace(/.$/, parts[4].endsWith("A") ? "B" : "A")].join(":");
  assert.throws(() => decryptField(tampered, key));
  assert.throws(() => decryptField(enc, parseKey(generateKey())));
  assert.throws(() => decryptField("enc:v1:xx", key));
});

test("clé : formats hex et base64 acceptés, longueur contrôlée", () => {
  assert.equal(parseKey("ab".repeat(32)).length, 32);
  assert.equal(parseKey(generateKey()).length, 32);
  assert.throws(() => parseKey("trop-court"));
  assert.throws(() => parseKey(""));
});

test("index aveugle : déterministe, normalisé, dépend de la clé", () => {
  const k1 = parseKey(generateKey());
  const k2 = parseKey(generateKey());
  assert.equal(blindIndex("101 231 456", k1), blindIndex("101231456", k1));
  assert.equal(blindIndex("ABC", k1), blindIndex("abc", k1));
  assert.notEqual(blindIndex("101231456", k1), blindIndex("101231456", k2));
  assert.match(blindIndex("x", k1), /^[0-9a-f]{64}$/);
});
