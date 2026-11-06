#!/usr/bin/env python3
"""
Ndao Hifanosika — ajout des niveaux « Autres » (L1 / L2 / M1), SANS écraser aucun fichier.
Modifie uniquement par petites insertions (idempotent : on peut le relancer sans risque).

Usage (depuis le dossier du backend, là où se trouvent src/ et prisma/) :
    python3 appliquer-roles-autres.py            # applique
    python3 appliquer-roles-autres.py --dry-run  # montre seulement ce qui changerait
"""
import os, re, sys

DRY = "--dry-run" in sys.argv
changed, skipped = [], []

def read(p):
    with open(p, encoding="utf-8") as f: return f.read()

def write(p, s):
    if not DRY:
        with open(p, "w", encoding="utf-8") as f: f.write(s)

def edit(path, fn, label):
    if not os.path.exists(path):
        skipped.append(f"{path} (introuvable) — {label}"); return
    s = read(path); t = fn(s)
    if t == s: skipped.append(f"{path} — {label} (déjà fait ou motif absent)")
    else: write(path, t); changed.append(f"{path} — {label}")

# 1) Listes de rôles : ajoute L1/L2/M1 après "STAGIAIRE_M2" dans les listes qui contiennent L3 et M2
pat = re.compile(r'"STAGIAIRE_L3",(\s*)"STAGIAIRE_M2"(?!,\s*"STAGIAIRE_L1")')
rep = lambda m: '"STAGIAIRE_L3",{0}"STAGIAIRE_M2",{0}"STAGIAIRE_L1",{0}"STAGIAIRE_L2",{0}"STAGIAIRE_M1"'.format(m.group(1))
for root, _, files in os.walk("src"):
    for fn in files:
        if not fn.endswith(".ts"): continue
        p = os.path.join(root, fn)
        if fn == "merit.service.ts": continue          # traité séparément (L3/M2 + Autres)
        if os.path.exists(p):
            s0 = read(p); t0 = pat.sub(rep, s0)
            if t0 != s0: write(p, t0); changed.append(f"{p} — rôles L1/L2/M1 ajoutés aux listes")

# 2) Enum Prisma + migration
def enum_fix(s):
    if "STAGIAIRE_L1" in s: return s
    return s.replace("  STAGIAIRE_M2\n", "  STAGIAIRE_M2\n  STAGIAIRE_L1\n  STAGIAIRE_L2\n  STAGIAIRE_M1\n", 1)
edit("prisma/schema.prisma", enum_fix, "enum UserRole : L1, L2, M1")
mig = "prisma/migrations/20261111000000_add_stagiaire_levels/migration.sql"
has_mig = any("ADD VALUE IF NOT EXISTS 'STAGIAIRE_L1'" in read(os.path.join(r, f))
              for r, _, fs in os.walk("prisma/migrations") for f in fs if f.endswith(".sql")) if os.path.isdir("prisma/migrations") else False
if not has_mig:
    if not DRY:
        os.makedirs(os.path.dirname(mig), exist_ok=True)
        write(mig, "-- Niveaux « Autres » (L1, L2, M1)\nALTER TYPE \"UserRole\" ADD VALUE IF NOT EXISTS 'STAGIAIRE_L1';\nALTER TYPE \"UserRole\" ADD VALUE IF NOT EXISTS 'STAGIAIRE_L2';\nALTER TYPE \"UserRole\" ADD VALUE IF NOT EXISTS 'STAGIAIRE_M1';\n")
    changed.append(mig + " — migration créée")
else:
    skipped.append("migration L1/L2/M1 déjà présente")

# 3) Étiquettes (certificats)
def labels(s):
    if "STAGIAIRE_L1:" in s: return s
    return s.replace('  STAGIAIRE_M2: "Stagiaire M2",\n', '  STAGIAIRE_M2: "Stagiaire M2",\n  STAGIAIRE_L1: "Stagiaire L1",\n  STAGIAIRE_L2: "Stagiaire L2",\n  STAGIAIRE_M1: "Stagiaire M1",\n', 1)
edit("src/services/certificatePerson.service.ts", labels, "étiquettes L1/L2/M1")

# 4) Création d'un stagiaire : L1/L2/M1 = niveau « Autre »
def intern(s):
    if "OTHER_LEVELS" in s: return s
    a = '''const isOtherLevel = person.role === "AUTRE";
  const otherLevel = isOtherLevel ? toText(person.otherLevel) : null;'''
    b = '''// L1 / L2 / M1 sont des niveaux « Autres » (niveau libre)
  const OTHER_LEVELS: Record<string, string> = { STAGIAIRE_L1: "L1", STAGIAIRE_L2: "L2", STAGIAIRE_M1: "M1" };
  const fixedOther = OTHER_LEVELS[String(person.role)] ?? null;
  const isOtherLevel = person.role === "AUTRE" || fixedOther !== null;
  const otherLevel = fixedOther ?? (isOtherLevel ? toText(person.otherLevel) : null);'''
    return s.replace(a, b, 1)
edit("src/controllers/internship.controller.ts", intern, "L1/L2/M1 → niveau « Autre »")

# 5) Ordre de mérite : L1/L2/M1 classés comme les autres stagiaires, dans le groupe « Autre »
def merit(s):
    if "OTHER_LEVELS" in s: return s
    s = s.replace('where: { role: { in: ["STAGIAIRE_L3", "STAGIAIRE_M2"] }, status: "ACTIVE" },\n    select: { id: true, firstName: true, lastName: true, role: true },',
                  'where: { role: { in: ["STAGIAIRE_L3", "STAGIAIRE_M2", "STAGIAIRE_L1", "STAGIAIRE_L2", "STAGIAIRE_M1"] }, status: "ACTIVE" },\n    select: { id: true, firstName: true, lastName: true, role: true, studentLevel: true },', 1)
    s = s.replace('const pushRow = (row: MeritRow) => cohorts[groupOf(row)].push(row);',
'''// Niveaux « Autres » (L1, L2, M1) : classés comme tous les stagiaires, dans le groupe « Autre »
  const OTHER_LEVELS = ["L1", "L2", "M1"];
  const otherIds = new Set<number>(
    (interns as Array<{ id: number; role: string; studentLevel?: string | null }>)
      .filter((u) => OTHER_LEVELS.includes(String(u.studentLevel ?? "").trim().toUpperCase()) || /^STAGIAIRE_(L1|L2|M1)$/.test(u.role))
      .map((u) => u.id),
  );
  const pushRow = (row: MeritRow) => cohorts[otherIds.has(row.userId) ? "AUTRE" : groupOf(row)].push(row);''', 1)
    return s
edit("src/services/merit.service.ts", merit, "ordre de mérite : Autres L1/L2/M1")

print(("[SIMULATION] " if DRY else "") + f"{len(changed)} modification(s) :")
for c in changed: print("  +", c)
print(f"{len(skipped)} ignoré(s) :")
for c in skipped[:30]: print("  -", c)
print("\nEnsuite : npx prisma migrate deploy && npx prisma generate, puis redémarrer le serveur.")
