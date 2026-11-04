// Vérifie que la synthèse par LLM fonctionne RÉELLEMENT (clé et modèle requis, accès Internet).
// 1) Dans l'environnement du service IA : LLM_API_KEY=... LLM_MODEL=<nom du modèle> (uvicorn redémarré)
// 2) node tests-http/llm-check.mjs        (variables : API, EMAIL, PASSWORD comme perf.mjs)
// Résultat attendu : source = "llm". Si source = "rules" : clé/modèle absents, texte rejeté (llmRejected) ou erreur réseau (llmError).
const API = process.env.API || "http://localhost:4000/api";
const lr = await fetch(`${API}/auth/login`, { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: process.env.EMAIL || "admin@ndao-hifanosika.org", password: process.env.PASSWORD || "admin" }) });
const lj = await lr.json().catch(() => ({}));
const token = lj?.data?.accessToken || lj?.data?.token || lj?.accessToken || lj?.token;
if (!token) { console.error("Connexion impossible"); process.exit(2); }
const r = await fetch(`${API}/ai/narrative?period=${encodeURIComponent("test LLM")}`, { headers: { authorization: `Bearer ${token}` } });
const j = await r.json();
const d = j?.data;
console.log("HTTP", r.status, "| source :", d?.source, d?.llmError ? "| llmError" : "", d?.llmRejected ? "| llmRejected" : "");
console.log("\n" + (d?.text || JSON.stringify(j, null, 2)));
process.exit(d?.source === "llm" ? 0 : 1);
