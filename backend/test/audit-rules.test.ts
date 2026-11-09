import test from "node:test";
import assert from "node:assert/strict";
import { auditChangedFields, auditEntityIdFromPath, auditOperation, auditResource, buildAuditContext } from "../src/utils/auditRules";

test("opération déduite de la méthode HTTP", () => {
  assert.equal(auditOperation("POST"), "CREATE");
  assert.equal(auditOperation("put"), "UPDATE");
  assert.equal(auditOperation("PATCH"), "UPDATE");
  assert.equal(auditOperation("DELETE"), "DELETE");
  assert.equal(auditOperation("GET"), "ACTION");
});

test("ressource et identifiant d'entité lus dans le chemin", () => {
  assert.equal(auditResource("/api/beneficiaries/12?x=1"), "beneficiaries");
  assert.equal(auditEntityIdFromPath("/api/beneficiaries/12/consent"), 12);
  assert.equal(auditEntityIdFromPath("/api/projects"), null);
  assert.equal(auditEntityIdFromPath("/api/users/abc"), null);
  assert.equal(auditEntityIdFromPath("/api/users/0"), null);
  assert.equal(auditEntityIdFromPath("/api/users/99999999999999"), null); // hors plage Int PostgreSQL
});

test("seuls les NOMS des champs sont journalisés, jamais les valeurs ni les champs secrets", () => {
  const fields = auditChangedFields({ firstName: "Lala", phone: "0340000000", password: "x", refreshToken: "y", cin: "101" });
  assert.deepEqual(fields, ["firstName", "phone", "cin"]);
  assert.deepEqual(auditChangedFields(null), []);
  assert.deepEqual(auditChangedFields([1, 2]), []);
  assert.equal(auditChangedFields(Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`f${i}`, i]))).length, 30);
});

test("contexte complet : champs historiques conservés + entityId + détails", () => {
  const ctx = buildAuditContext({
    method: "PUT",
    originalUrl: "/api/beneficiaries/7",
    statusCode: 200,
    body: { phone: "0340000000", password: "secret" },
    entity: "/api/beneficiaries",
  });
  assert.equal(ctx.entity, "/api/beneficiaries");
  assert.equal(ctx.entityId, 7);
  assert.equal(ctx.details.statusCode, 200);
  assert.equal(ctx.details.method, "PUT");
  assert.equal(ctx.details.path, "/api/beneficiaries/7");
  assert.equal(ctx.details.operation, "UPDATE");
  assert.equal(ctx.details.resource, "beneficiaries");
  assert.equal(ctx.details.outcome, "success");
  assert.deepEqual(ctx.details.fields, ["phone"]);
  assert.ok(!JSON.stringify(ctx).includes("0340000000"), "aucune valeur ne doit être journalisée");
  assert.ok(!JSON.stringify(ctx).includes("secret"));
});

test("identifiant fourni par le contrôleur prioritaire ; échec signalé", () => {
  const ctx = buildAuditContext({ method: "POST", originalUrl: "/api/projects", statusCode: 422, entityId: 55, entity: "project" });
  assert.equal(ctx.entityId, 55);
  assert.equal(ctx.details.outcome, "failure");
  assert.equal(ctx.entity, "project");
  assert.equal(buildAuditContext({ method: "POST", originalUrl: "/api/projects", statusCode: 201, entityId: -3 }).entityId, null);
});
