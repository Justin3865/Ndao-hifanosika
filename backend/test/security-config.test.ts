import test from "node:test";
import assert from "node:assert/strict";
import { decideHttps, hasCritical, isRateLimitExempt, readRateLimitConfig, readTrustProxy, securityWarnings } from "../src/utils/securityConfig";

test("limitation globale : valeurs par défaut larges, réglables et désactivable", () => {
  assert.deepEqual(readRateLimitConfig({}), { enabled: true, windowMs: 60000, max: 1200 });
  assert.deepEqual(readRateLimitConfig({ RATE_LIMIT_MAX: "50", RATE_LIMIT_WINDOW_MS: "1000" }), { enabled: true, windowMs: 1000, max: 50 });
  assert.equal(readRateLimitConfig({ RATE_LIMIT_DISABLED: "1" }).enabled, false);
  assert.equal(readRateLimitConfig({ RATE_LIMIT_MAX: "abc" }).max, 1200);
  assert.equal(readRateLimitConfig({ RATE_LIMIT_MAX: "-5" }).max, 1200);
});

test("chemins exemptés : santé, suivi GPS, WebSocket, préflight CORS", () => {
  assert.equal(isRateLimitExempt("GET", "/health"), true);
  assert.equal(isRateLimitExempt("GET", "/api/health"), true);
  assert.equal(isRateLimitExempt("POST", "/api/public/tracking/ping"), true);
  assert.equal(isRateLimitExempt("GET", "/socket.io/"), true);
  assert.equal(isRateLimitExempt("OPTIONS", "/api/projects"), true);
  assert.equal(isRateLimitExempt("GET", "/api/projects"), false);
});

test("trust proxy : absent par défaut, nombre ou booléen sinon", () => {
  assert.equal(readTrustProxy({}), undefined);
  assert.equal(readTrustProxy({ TRUST_PROXY: "1" }), 1);
  assert.equal(readTrustProxy({ TRUST_PROXY: "true" }), true);
  assert.equal(readTrustProxy({ TRUST_PROXY: "oups" }), undefined);
});

test("HTTPS : sans FORCE_HTTPS rien ne change ; avec, redirection GET et refus des écritures en clair", () => {
  const base = { secure: false, method: "GET", path: "/api/projects" };
  assert.equal(decideHttps({ ...base, forceHttps: false }), "allow");
  assert.equal(decideHttps({ ...base, forceHttps: true }), "redirect");
  assert.equal(decideHttps({ ...base, forceHttps: true, method: "POST", path: "/api/auth/login" }), "reject");
  assert.equal(decideHttps({ ...base, forceHttps: true, secure: true }), "allow");
  assert.equal(decideHttps({ ...base, forceHttps: true, forwardedProto: "https, http" }), "allow");
  assert.equal(decideHttps({ ...base, forceHttps: true, path: "/health" }), "allow");
});

test("avertissements de sécurité : aucun hors production", () => {
  assert.deepEqual(securityWarnings({ NODE_ENV: "development" }), []);
  assert.deepEqual(securityWarnings({}), []);
});

test("avertissements de sécurité en production : un environnement faible est signalé", () => {
  const codes = (e: Record<string, string>) => securityWarnings({ NODE_ENV: "production", ...e }).map((w) => w.code);
  const weak = codes({ JWT_SECRET: "secret", JWT_REFRESH_SECRET: "secret", CORS_ORIGIN: "http://localhost:3000" });
  for (const c of ["COORDINATOR_SCOPE", "JWT_SECRET", "JWT_REFRESH_SECRET", "AI_SERVICE_KEY", "FORCE_HTTPS", "CORS_ORIGIN", "DATA_ENCRYPTION_KEY"]) assert.ok(weak.includes(c), c);
  assert.equal(hasCritical(securityWarnings({ NODE_ENV: "production" })), true);
});

test("avertissements de sécurité en production : une configuration saine n'en produit aucun critique", () => {
  const good = {
    NODE_ENV: "production",
    COORDINATOR_SCOPE: "strict",
    JWT_SECRET: "a".repeat(8) + "Zx9!kLm2#pQr7$vWs4&tYu1*eIo6^bNc",
    JWT_REFRESH_SECRET: "B".repeat(8) + "q8!Lm2#pQr7$vWs4&tYu1*eIo6^bNcZx",
    AI_SERVICE_KEY: "0123456789abcdef0123456789abcdef",
    FORCE_HTTPS: "1",
    CORS_ORIGIN: "https://suivi.exemple.org",
    FRONTEND_URL: "https://suivi.exemple.org",
    DATA_ENCRYPTION_KEY: "x",
  };
  assert.deepEqual(securityWarnings(good), []);
});
