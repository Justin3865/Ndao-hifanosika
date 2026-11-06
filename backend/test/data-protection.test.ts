import test from "node:test";
import assert from "node:assert/strict";
import {
  accessLevel, ageOf, containsMask, initials, maskEmail, maskPhone, protectPayload, protectedKinds, protectionMode, suppressSmall,
} from "../src/utils/dataProtectionRules";

const NOW = new Date("2026-11-05T00:00:00Z");
const child = { id: 1, firstName: "Rado", lastName: "Andria", age: 9, gender: "MALE", vulnerable: false, phone: "0341234567", email: "rado@ex.mg", cinNumber: "101234567890", homeLatitude: -21.4527, homeLongitude: 47.0857, addressDetail: "Lot II M 45", birthDate: "2017-03-04T00:00:00.000Z", notes: "orphelin" };
const woman = { id: 2, firstName: "Voahangy", lastName: "Rasoa", age: 34, gender: "FEMALE", vulnerable: true, phone: "0321112233", homeLatitude: -21.45, homeLongitude: 47.08 };
const man = { id: 3, firstName: "Jean", lastName: "Rakoto", age: 40, gender: "MALE", vulnerable: true, phone: "0340000000", homeLatitude: -21.45, homeLongitude: 47.08 };

test("classification : mineur, femme vulnérable, adulte ordinaire", () => {
  assert.deepEqual(protectedKinds(child, NOW), ["MINOR"]);
  assert.deepEqual(protectedKinds(woman, NOW), ["VULNERABLE_WOMAN"]);
  assert.deepEqual(protectedKinds(man, NOW), []);
  assert.deepEqual(protectedKinds({ age: 16, gender: "FEMALE", vulnerable: true }, NOW), ["MINOR", "VULNERABLE_WOMAN"]);
  assert.deepEqual(protectedKinds({ age: 30, gender: "FEMALE", vulnerable: false, hasDisability: true }, NOW), ["VULNERABLE_WOMAN"]);
});

test("âge : la date de naissance prime sur le champ age ; 18 ans pile = majeur", () => {
  assert.equal(ageOf({ birthDate: "2008-11-05T00:00:00Z", age: 5 }, NOW), 18);
  assert.equal(ageOf({ birthDate: "2008-11-06T00:00:00Z" }, NOW), 17);
  assert.equal(ageOf({ age: "abc" }, NOW), null);
  assert.deepEqual(protectedKinds({ age: null }, NOW), []);
});

test("rôles : ADMIN/COORDINATOR complet, DIRECTION limité, le reste pseudonymisé", () => {
  assert.equal(accessLevel("ADMIN", {}), "FULL");
  assert.equal(accessLevel("coordinator", {}), "FULL");
  assert.equal(accessLevel("DIRECTION", {}), "LIMITED");
  assert.equal(accessLevel("DSI", {}), "PSEUDONYMISED");
  assert.equal(accessLevel("STAGIAIRE_L3", {}), "PSEUDONYMISED");
  assert.equal(accessLevel(undefined, {}), "PSEUDONYMISED");
  assert.equal(accessLevel("DSI", { DATA_PROTECTION_FULL_ROLES: "ADMIN, DSI" }), "FULL");
});

test("FULL : rien n'est masqué mais les personnes protégées sont comptées (journal d'accès)", () => {
  const r = protectPayload({ data: [child, woman, man] }, "FULL", NOW);
  assert.equal(r.protectedCount, 2);
  assert.equal(r.maskedCount, 0);
  assert.deepEqual(r.body.data[0], child);
});

test("PSEUDONYMISED : initiales, contact/CIN/GPS/adresse masqués, adulte ordinaire intact", () => {
  const r = protectPayload({ success: true, data: [child, woman, man] }, "PSEUDONYMISED", NOW);
  const [c, w, m] = r.body.data as Array<Record<string, any>>;
  assert.equal(c.firstName, "R.");
  assert.equal(c.lastName, "A.");
  assert.equal(c.phone, "••••••••67");
  assert.equal(c.email, "r•••@ex.mg");
  assert.match(c.cinNumber, /^•+90$/);
  assert.equal(c.homeLatitude, null);
  assert.equal(c.addressDetail, null);
  assert.equal(c.notes, null);
  assert.equal(c.birthDate, "2017-01-01T00:00:00.000Z");
  assert.equal(c._protected, true);
  assert.equal(w.lastName, "R.");
  assert.equal(m.firstName, "Jean");
  assert.equal(m.phone, "0340000000");
  assert.equal(m._protected, undefined);
  assert.equal(r.maskedCount, 2);
});

test("LIMITED : nom conservé, contact masqué, GPS arrondi à ~1 km", () => {
  const r = protectPayload([child], "LIMITED", NOW);
  const c = r.body[0] as Record<string, any>;
  assert.equal(c.firstName, "Rado");
  assert.equal(c.phone, "••••••••67");
  assert.equal(c.homeLatitude, -21.45);
  assert.equal(c.homeLongitude, 47.09);
});

test("l'objet d'origine n'est jamais modifié (caches des services)", () => {
  const original = structuredClone(child);
  protectPayload({ data: [child] }, "PSEUDONYMISED", NOW);
  assert.deepEqual(child, original);
});

test("objets imbriqués { beneficiary } et lignes d'analyse { beneficiaryId, name }", () => {
  const nested = protectPayload({ data: { beneficiary: child, status: "ACTIVE" } }, "PSEUDONYMISED", NOW);
  assert.equal((nested.body.data.beneficiary as any).firstName, "R.");
  const row = protectPayload({ data: [{ beneficiaryId: 1, name: "Rado Andria", age: 9, riskScore: 70 }, { beneficiaryId: 3, name: "Jean Rakoto", age: 40 }] }, "PSEUDONYMISED", NOW);
  assert.equal((row.body.data[0] as any).name, "R. A.");
  assert.equal((row.body.data[1] as any).name, "Jean Rakoto");
});

test("carte des ménages : position arrondie et nom en initiales hors accès complet", () => {
  const h = { id: 9, name: "Rasoa Bema", zone: "Z", latitude: -21.45271, longitude: 47.08571, altitude: 1100, nearestWorker: null };
  const r = protectPayload({ data: { households: [h] } }, "PSEUDONYMISED", NOW).body.data.households[0] as any;
  assert.equal(r.latitude, -21.45);
  assert.equal(r.name, "R. B.");
  assert.equal(r.altitude, null);
  const full = protectPayload({ data: { households: [h] } }, "FULL", NOW).body.data.households[0] as any;
  assert.equal(full.latitude, -21.45271);
});

test("les utilisateurs du personnel (sans champ bénéficiaire) ne sont pas touchés", () => {
  const staff = { id: 5, firstName: "Hanta", lastName: "Rand", phone: "0341111111", age: 16, role: "COORDINATOR" };
  assert.deepEqual(protectPayload([staff], "PSEUDONYMISED", NOW).body[0], staff);
});

test("valeurs masquées renvoyées par un formulaire : détectées pour refus à l'écriture", () => {
  assert.equal(containsMask({ phone: maskPhone("0341234567") }), true);
  assert.equal(containsMask({ a: [{ email: maskEmail("a@b.mg") }] }), true);
  assert.equal(containsMask({ phone: "0341234567", notes: "RAS" }), false);
  assert.equal(containsMask(null), false);
});

test("petites cellules : 1 à 4 supprimés, 0 et ≥ 5 conservés", () => {
  assert.equal(suppressSmall(0, 5), 0);
  assert.equal(suppressSmall(1, 5), null);
  assert.equal(suppressSmall(4, 5), null);
  assert.equal(suppressSmall(5, 5), 5);
});

test("utilitaires : initiales et mode", () => {
  assert.equal(initials("Jean Pierre"), "J. P.");
  assert.equal(initials(""), "");
  assert.equal(protectionMode({}), "enforce");
  assert.equal(protectionMode({ DATA_PROTECTION_MODE: "AUDIT" }), "audit");
  assert.equal(protectionMode({ DATA_PROTECTION_MODE: "off" }), "off");
  assert.equal(protectionMode({ DATA_PROTECTION_MODE: "n'importe quoi" }), "enforce");
});

import { isDatasetCsvPath, pseudonymiseDatasetCsv } from "../src/utils/dataProtectionRules";

test("export CSV : colonne name en initiales hors accès complet, BOM et guillemets conservés", () => {
  const csv = '\uFEFFid,name,context,label,Âge\n1,"Rado, Andria",Projet A,1,9\n2,Jean Rakoto,"Projet ""B""",0,40';
  const out = pseudonymiseDatasetCsv(csv, "PSEUDONYMISED");
  assert.equal(out, '\uFEFFid,name,context,label,Âge\n1,R. A.,Projet A,1,9\n2,J. R.,"Projet ""B""",0,40');
  assert.equal(pseudonymiseDatasetCsv(csv, "FULL"), csv);
  assert.equal(pseudonymiseDatasetCsv("a,b\n1,2", "LIMITED"), "a,b\n1,2");
});

test("chemin des exports CSV reconnu", () => {
  assert.equal(isDatasetCsvPath("/api/ai/datasets/households/export.csv?x=1"), true);
  assert.equal(isDatasetCsvPath("/api/ai/datasets/households/latest"), false);
});
