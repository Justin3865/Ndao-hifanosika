// Mesure de performance (cahier des charges §6) : API principales < 500 ms (hors IA), pages < 2 s.
// Usage : API=http://localhost:4000/api EMAIL=admin@... PASSWORD=... node tests-http/perf.mjs
//   N=30 (requêtes par route)  C=5 (concurrence)  WEB=http://localhost:3000 (pour tester aussi des pages)
const API = process.env.API || "http://localhost:4000/api";
const WEB = process.env.WEB || "";
const N = Number(process.env.N || 30);
const C = Number(process.env.C || 5);
const API_BUDGET = Number(process.env.API_BUDGET_MS || 500);
const PAGE_BUDGET = Number(process.env.PAGE_BUDGET_MS || 2000);

const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p / 100 * s.length) - 1))]; };

async function login() {
  const r = await fetch(`${API}/auth/login`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: process.env.EMAIL || "admin@ndao-hifanosika.org", password: process.env.PASSWORD || "admin" }) });
  const j = await r.json().catch(() => ({}));
  const t = j?.data?.accessToken || j?.data?.token || j?.accessToken || j?.token;
  if (!t) throw new Error(`Connexion impossible (HTTP ${r.status}) — définir EMAIL / PASSWORD`);
  return t;
}

async function bench(name, url, headers, budget) {
  const times = []; let errors = 0; let next = 0;
  await fetch(url, { headers }).catch(() => {}); // échauffement
  async function worker() {
    while (next < N) {
      next++;
      const t0 = performance.now();
      try { const r = await fetch(url, { headers }); await r.arrayBuffer(); if (r.status >= 500) errors++; } catch { errors++; }
      times.push(performance.now() - t0);
    }
  }
  await Promise.all(Array.from({ length: C }, worker));
  const p95 = pct(times, 95);
  return { name, p50: Math.round(pct(times, 50)), p95: Math.round(p95), max: Math.round(Math.max(...times)), errors, budget, ok: p95 <= budget && errors === 0 };
}

const token = await login();
const auth = { authorization: `Bearer ${token}` };
const targets = [
  ["GET /health", `${API}/health`, {}],
  ["GET /projects", `${API}/projects`, auth],
  ["GET /beneficiaries", `${API}/beneficiaries`, auth],
  ["GET /evaluations", `${API}/evaluations`, auth],
  ["GET /activities", `${API}/activities`, auth],
  ["GET /reports/dashboard", `${API}/reports/dashboard`, auth],
  ["GET /follow-ups/impact", `${API}/follow-ups/impact`, auth],
];
const results = [];
for (const [n, u, h] of targets) results.push(await bench(n, u, h, API_BUDGET));
if (WEB) for (const p of ["/login", "/dashboard"]) results.push(await bench(`PAGE ${p}`, WEB + p, {}, PAGE_BUDGET));

console.table(results.map(({ ok, ...r }) => ({ ...r, verdict: ok ? "OK" : "DÉPASSE" })));
const bad = results.filter((r) => !r.ok);
console.log(bad.length ? `\n${bad.length} route(s) hors objectif.` : `\nObjectifs respectés (p95 ≤ ${API_BUDGET} ms API${WEB ? `, ≤ ${PAGE_BUDGET} ms pages` : ""}).`);
process.exit(bad.length ? 1 : 0);
