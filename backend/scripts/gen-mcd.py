#!/usr/bin/env python3
"""Génère docs/MCD_MLD.md (MCD en Mermaid + dictionnaire MLD) à partir de prisma/schema.prisma.

Usage (depuis srcb/) :  python scripts/gen-mcd.py [prisma/schema.prisma] [docs/MCD_MLD.md]

Le schéma Prisma reste la source de vérité : relancer ce script après chaque migration.
Les modèles récents déclarent leurs clés étrangères dans le SQL seulement (sans @relation) ;
elles sont listées dans SQL_ONLY_FKS ci-dessous.
"""
import re
import sys
from collections import OrderedDict

SQL_ONLY_FKS = [
    ("BeneficiaryJourney", "Beneficiary", "beneficiaryId"),
    ("ProjectCoordinator", "Project", "projectId"),
    ("ProjectCoordinator", "User", "userId"),
    ("BeneficiaryAttendance", "Activity", "activityId"),
    ("BeneficiaryAttendance", "Beneficiary", "beneficiaryId"),
    ("MemberObjective", "User", "userId"),
    ("InternshipDocument", "Internship", "internshipId"),
    ("BeneficiaryConsent", "Beneficiary", "beneficiaryId"),
]

src = sys.argv[1] if len(sys.argv) > 1 else "prisma/schema.prisma"
out = sys.argv[2] if len(sys.argv) > 2 else "docs/MCD_MLD.md"
text = open(src, encoding="utf-8").read()

models = OrderedDict()
enums = OrderedDict()
for kind, name, body in re.findall(r"^(model|enum)\s+(\w+)\s*\{(.*?)^\}", text, re.S | re.M):
    if kind == "enum":
        enums[name] = [l.strip().split()[0] for l in body.splitlines() if l.strip() and not l.strip().startswith(("//", "@@"))]
        continue
    fields, comment = [], ""
    for raw in body.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("///"):
            comment = line[3:].strip()
            continue
        if line.startswith("//") or line.startswith("@@"):
            continue
        line = line.split("//")[0].strip()
        m = re.match(r"(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)", line)
        if not m:
            continue
        fname, ftype, is_list, opt, rest = m.groups()
        fields.append(dict(name=fname, type=ftype, list=bool(is_list), opt=bool(opt), attrs=rest, note=comment))
        comment = ""
    models[name] = fields

relations = []  # (child, parent, fkfield)
for mname, fields in models.items():
    for f in fields:
        m = re.search(r"@relation\((?:[^)]*?)fields:\s*\[(\w+)\]", f["attrs"])
        if m and f["type"] in models:
            relations.append((mname, f["type"], m.group(1)))
relations += SQL_ONLY_FKS

scalar = {"Int", "String", "Boolean", "DateTime", "Float", "Decimal", "Json", "Bytes", "BigInt"}
fk_of = {}
for child, parent, fk in relations:
    fk_of.setdefault(child, {})[fk] = parent

lines = ["# MCD / MLD — Plateforme S&E Ndao Hifanosika", "",
         f"> Document **généré** depuis `{src}` par `scripts/gen-mcd.py` ({len(models)} entités, {len(enums)} énumérations). Ne pas éditer à la main : relancer le script.", "",
         "## 1. Modèle conceptuel (relations)", "",
         "Chaque trait relie une entité enfant (côté « plusieurs ») à son parent (côté « un »). Les attributs détaillés sont dans le dictionnaire (§3).", "",
         "```mermaid", "erDiagram"]
seen = set()
for child, parent, fk in relations:
    key = (child, parent, fk)
    if key in seen:
        continue
    seen.add(key)
    lines.append(f'  {parent} ||--o{{ {child} : "{fk}"')
lonely = [m for m in models if not any(m in (c, p) for c, p, _ in relations)]
for m in lonely:
    lines.append(f"  {m}")
lines += ["```", ""]

lines += ["## 2. Énumérations", "", "| Énumération | Valeurs |", "|---|---|"]
for n, vals in enums.items():
    lines.append(f"| `{n}` | {', '.join(vals)} |")
lines.append("")

lines += ["## 3. Modèle logique (dictionnaire des tables)", ""]
for mname, fields in models.items():
    lines += [f"### {mname}", "", "| Colonne | Type | Null | Clé | Remarque |", "|---|---|---|---|---|"]
    for f in fields:
        if f["type"] in models and not f["name"] in fk_of.get(mname, {}):
            continue  # champ de navigation Prisma, pas une colonne
        if f["type"] in models:
            continue
        key = []
        if "@id" in f["attrs"]:
            key.append("PK")
        if "@unique" in f["attrs"]:
            key.append("UNIQUE")
        if f["name"] in fk_of.get(mname, {}):
            key.append(f"FK → {fk_of[mname][f['name']]}")
        t = f["type"] + ("[]" if f["list"] else "")
        lines.append(f"| `{f['name']}` | {t} | {'oui' if f['opt'] else 'non'} | {', '.join(key)} | {f['note']} |")
    lines.append("")

import os
os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
open(out, "w", encoding="utf-8").write("\n".join(lines))
print(f"{out} : {len(models)} entités, {len(relations)} relations, {len(enums)} énumérations")
