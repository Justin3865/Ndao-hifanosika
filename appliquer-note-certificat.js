// Certificat de stage : tsy mamoaka "0.0/20 — Insuffisant" raha tsy misy angona; "Lieu de stage" ho an'ny stage.
// Fampiasana (ao amin'ny C:\ndao-hifanosika):   node appliquer-note-certificat.js
const fs = require("fs");
const path = require("path");
const base = process.argv[2] || process.cwd();

function patch(rel, marker, steps) {
  const p = path.join(base, rel);
  if (!fs.existsSync(p)) { console.error("Tsy hita: " + rel + " (alefaso ao amin'ny C:\\ndao-hifanosika)"); process.exit(1); }
  const raw = fs.readFileSync(p, "utf8");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  let t = raw.replace(/\r\n/g, "\n");
  if (t.includes(marker)) { console.log(rel + " : efa vita"); return; }
  for (const [old, neu, name] of steps) {
    if (t.split(old).length !== 2) { console.error("Anchor tsy hita/tsy tokana (" + rel + " / " + name + ") : tsy nisy novaina."); process.exit(1); }
    t = t.replace(old, () => neu);
  }
  fs.writeFileSync(p, t.replace(/\n/g, nl), "utf8");
  console.log(rel + " : nohavaozina");
}

// 1) Backend : note finale = null raha tsy misy angona tena izy (ny présence 0 % irery tsy ampy)
patch("backend/src/services/certificateSuggestion.service.ts", "hasScoreData", [
  ["  const finalScoreOn20 = metrics.actualProgress === null ? null : round1(Math.min(20, Math.max(0, (metrics.actualProgress / 100) * 20)));",
   "  // Angona tena izy : tâches, rapports ou évaluations ; présence : raha misy check-in (> 0 %) fotsiny\n" +
   "  const hasScoreData =\n" +
   "    metrics.components.tasks !== null ||\n" +
   "    metrics.components.reports !== null ||\n" +
   "    metrics.components.evaluations !== null ||\n" +
   "    (metrics.components.presence !== null && metrics.components.presence > 0);\n" +
   "  const finalScoreOn20 =\n" +
   "    metrics.actualProgress === null || !hasScoreData ? null : round1(Math.min(20, Math.max(0, (metrics.actualProgress / 100) * 20)));",
   "finalScore"],
]);

// 2) Formulaire : « Lieu de stage » + « Note indisponible »
patch("frontend/src/app/certificates/create/page.tsx", 'isInternship ? "Lieu de stage"', [
  ["              Lieu de mission\n", '              {isInternship ? "Lieu de stage" : "Lieu de mission"}\n', "label"],
  ['{suggestion.finalScoreOn20 === null ? "—" :', '{suggestion.finalScoreOn20 === null ? "Note indisponible" :', "note"],
  ['"Automatique (aucune donnée de suivi disponible)"', '"Automatique — note indisponible (aucune donnée de suivi)"', "option"],
]);

// 3) Certificat affiché : « Lieu de stage » pour un stage
patch("frontend/src/app/certificates/[id]/page.tsx", 'item.type === "INTERNSHIP" ? "Lieu de stage"', [
  ['text-[#1B9AA0]">Lieu de mission</p>', 'text-[#1B9AA0]">{item.type === "INTERNSHIP" ? "Lieu de stage" : "Lieu de mission"}</p>', "label"],
]);
console.log("Vita. Avereno alefa ny backend sy ny frontend.");
