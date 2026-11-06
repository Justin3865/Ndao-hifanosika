#!/usr/bin/env python3
"""Génère docs/MCD_MLD.md (diagramme Mermaid + tableau MLD) depuis srcb/prisma/schema.prisma.

Usage :  python generer-mcd-mld.py <schema.prisma> [sortie.md]
Aucune dépendance. Relancer après chaque migration pour garder le document exact.
"""
import collections
import pathlib
import re
import sys

src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "srcb/prisma/schema.prisma")
dst = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "MCD_MLD.md")
text = src.read_text(encoding="utf-8").replace("\r\n", "\n")

models = re.findall(r"^model (\w+) \{\n(.*?)^\}", text, re.M | re.S)
enums = re.findall(r"^enum (\w+) \{", text, re.M)
names = {m for m, _ in models}

relations, columns, declared_fk = [], {}, collections.defaultdict(set)
for model, body in models:
    cols = []
    for line in body.split("\n"):
        l = line.strip()
        if not l or l.startswith("//") or l.startswith("@@"):
            continue
        m = re.match(r"(\w+)\s+(\w+)(\[\])?(\?)?(.*)", l)
        if not m:
            continue
        field, typ, is_list, optional, rest = m.groups()
        if typ in names:  # champ de relation
            if "@relation" in rest and "fields:" in rest:
                fk = re.search(r"fields:\s*\[(\w+)", rest).group(1)
                relations.append((typ, model, fk, bool(optional)))
                declared_fk[model].add(fk)
            continue
        cols.append((field, typ + ("[]" if is_list else ""), "@id" in rest))
    columns[model] = cols

er = ["erDiagram"]
for parent, child, fk, optional in sorted(relations):
    # parent : exactement un (FK obligatoire) ou zéro/un (FK facultative) ; enfants : zéro ou plusieurs
    er.append(f'  {parent} {"|o" if optional else "||"}--o{{ {child} : "{fk}"')
for model, cols in columns.items():
    er.append(f"  {model} {{")
    for field, typ, is_pk in cols:
        key = "PK" if is_pk else ("FK" if field in declared_fk[model] else "")
        er.append(f"    {typ.replace('[]', '_arr')} {field}" + (f" {key}" if key else ""))
    er.append("  }")

rows, logical = [], 0
for model, cols in sorted(columns.items()):
    cells = []
    for field, _typ, is_pk in cols:
        if is_pk:
            cells.append(f"**{field}**")
        elif field in declared_fk[model]:
            cells.append(f"#{field}")
        elif re.search(r"[a-z]Id$", field):
            cells.append(f"~{field}")
            logical += 1
        else:
            cells.append(field)
    rows.append(f"| `{model}` | {', '.join(cells)} |")

doc = f"""# MCD / MLD — Ndao Hifanosika

Document **généré automatiquement** à partir de `srcb/prisma/schema.prisma` ({len(models)} modèles, {len(enums)} énumérations,
{len(relations)} relations déclarées, {logical} références logiques). Il décrit la base telle qu'elle est.
Pour le régénérer après une migration : `python docs/generer-mcd-mld.py srcb/prisma/schema.prisma docs/MCD_MLD.md`.

## 1. Lecture
- **MCD** (modèle conceptuel) : diagramme entité-relation ci-dessous (Mermaid ; s'affiche sur GitHub, GitLab et dans la plupart des éditeurs Markdown).
  Seules les relations **déclarées** dans Prisma (`@relation`) y figurent.
- **MLD** (modèle logique) : une ligne par table. **gras** = clé primaire ; `#colonne` = clé étrangère déclarée (contrainte en base) ;
  `~colonne` = colonne `…Id` **sans** contrainte déclarée (référence logique : la cohérence est assurée par le code applicatif, pas par PostgreSQL).
- Le MPD (modèle physique) est le résultat de `prisma migrate deploy` ; les migrations sont dans `srcb/prisma/migrations/`.

## 2. MCD
```mermaid
{chr(10).join(er)}
```

## 3. MLD
| Table | Colonnes |
|---|---|
{chr(10).join(rows)}

## 4. Points d'attention pour le mémoire
- Les références logiques (`~`) sont nombreuses ({logical} colonnes) : choix de souplesse (suppression sans cascade bloquante) mais risque
  d'enregistrements orphelins. À présenter comme limite connue et piste d'amélioration (ajouter des contraintes là où c'est pertinent).
- Les données personnelles (bénéficiaires, ménages) sont lues à travers `dataProtection.middleware.ts` (masquage selon le rôle) ;
  il n'y a pas de chiffrement des colonnes au repos : à signaler honnêtement dans la partie sécurité.
"""
dst.write_text(doc, encoding="utf-8")
print(f"{dst} écrit : {len(models)} modèles, {len(relations)} relations, {logical} références logiques.")
