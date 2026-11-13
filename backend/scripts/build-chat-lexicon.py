#!/usr/bin/env python3
"""Génère src/data/lexicon.ts (lexique FR/EN/MG du chatbot) à partir des dictionnaires de l'interface.

  python scripts/build-chat-lexicon.py ../srcf        # à relancer après toute modification de phrases.*.ts / dictionaries.ts

Source unique : srcf/src/lib/i18n/{dictionaries.ts, phrases.mg.ts, phrases.en.ts}. Le dictionnaire (clés) fait foi sur les phrases.
"""
import json, pathlib, re, sys

front = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "../srcf").resolve() / "src" / "lib" / "i18n"
out = pathlib.Path(__file__).resolve().parent.parent / "src" / "data" / "lexicon.ts"

PAIR = re.compile(r'^\s*\[("(?:[^"\\]|\\.)*"),\s*("(?:[^"\\]|\\.)*")\],?\s*$', re.M)
KV = re.compile(r'^\s*("(?:[^"\\]|\\.)*"):\s*("(?:[^"\\]|\\.)*"),?\s*$', re.M)
key = lambda s: re.sub(r"\s+", " ", s.replace("\u00a0", " ").replace("’", "'").replace("…", "...")).strip().lower()

def pairs(path):
    return {json.loads(a): json.loads(b) for a, b in PAIR.findall(path.read_text(encoding="utf-8"))}

def block(text, name):
    m = re.search(r"export const %s[^=]*= \{(.*?)\n\}(?: as const)?;" % name, text, re.S)
    return {json.loads(k): json.loads(v) for k, v in KV.findall(m.group(1))} if m else {}

mg_p, en_p = pairs(front / "phrases.mg.ts"), pairs(front / "phrases.en.ts")
dtxt = (front / "dictionaries.ts").read_text(encoding="utf-8")
d_fr, d_mg, d_en = block(dtxt, "fr"), block(dtxt, "mg"), block(dtxt, "en")

entries = {}
for fr_text in list(en_p) + list(mg_p):
    entries.setdefault(key(fr_text), {"fr": fr_text})
for k_, e in entries.items():
    e["mg"] = mg_p.get(e["fr"]); e["en"] = en_p.get(e["fr"])
for k in d_fr:  # le dictionnaire de l'interface l'emporte
    e = entries.setdefault(key(d_fr[k]), {"fr": d_fr[k]})
    if k in d_mg: e["mg"] = d_mg[k]
    if k in d_en: e["en"] = d_en[k]

rows = [e for e in entries.values() if e.get("mg") or e.get("en")]
rows.sort(key=lambda e: key(e["fr"]))
lines = ["// GÉNÉRÉ par scripts/build-chat-lexicon.py — ne pas modifier à la main.",
         "// Lexique FR / EN / MG du chatbot (mêmes textes que l'interface). %d entrées." % len(rows),
         'import type { LexiconEntry } from "../utils/chatTranslateRules";', "",
         "export const LEXICON_BASE: LexiconEntry[] = ["]
for e in rows:
    lines.append("  " + json.dumps({k: v for k, v in e.items() if v}, ensure_ascii=False) + ",")
lines.append("];")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("OK", len(rows), "entrées ->", out)
