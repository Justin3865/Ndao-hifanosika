const fs = require("fs");
const path = require("path");
const envPath = path.join(process.cwd(), ".env");
if (!fs.existsSync(envPath)) { console.log("X Aucun .env"); process.exit(1); }
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const to = process.argv[2]; console.log("FROM =", env.RESET_EMAIL_FROM);
for (const k of ["RESEND_API_KEY","RESET_EMAIL_FROM","SMTP_USER","SMTP_PASS","ESET_EMAIL_FROM"]) {
  console.log(k.padEnd(18), env[k] ? "present (" + env[k].length + ")" : "ABSENT");
}
if (!env.RESEND_API_KEY || !env.RESET_EMAIL_FROM) { console.log("X variable manquante"); process.exit(1); }
(async () => {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.RESET_EMAIL_FROM, to: [to], subject: "Test Ndao Hifanosika", text: "Test." }),
  });
  console.log("HTTP", r.status);
  console.log(await r.text());
})().catch((e) => console.log("X", e.message));
