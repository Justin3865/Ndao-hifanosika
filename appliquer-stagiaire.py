# Ajoute, dans le formulaire « Ajouter / Modifier un stage », les informations personnelles du stagiaire
# (téléphone, naissance, CIN, duplicata) : lues dans la base, enregistrées dans la fiche du stagiaire.
# Usage (depuis C:\ndao-hifanosika) :  py appliquer-stagiaire.py      (peut être relancé sans danger)
import io, os, sys

BASE = os.environ.get("BASE", "")

def lire(chemin):
    if not os.path.exists(chemin):
        sys.exit("Introuvable : " + chemin + " (lancez le script depuis C:\\ndao-hifanosika)")
    with io.open(chemin, "r", encoding="utf-8", newline="") as f:
        brut = f.read()
    return brut.replace("\r\n", "\n"), "\r\n" in brut

def ecrire(chemin, texte, crlf):
    if crlf:
        texte = texte.replace("\n", "\r\n")
    with io.open(chemin, "w", encoding="utf-8", newline="") as f:
        f.write(texte)

def remplacer(texte, ancien, nouveau, nom):
    if texte.count(ancien) != 1:
        sys.exit("Ancre introuvable ou ambiguë (%s) : fichier non modifié." % nom)
    return texte.replace(ancien, nouveau, 1)

def patch(rel, marque, etapes):
    chemin = os.path.join(BASE, *rel.split("/"))
    s, crlf = lire(chemin)
    if marque in s:
        print("%s : déjà à jour." % rel)
        return
    for ancien, nouveau, nom in etapes:
        s = remplacer(s, ancien, nouveau, rel + " / " + nom)
    ecrire(chemin, s, crlf)
    print("%s : modifié." % rel)

# ---------------------------------------------------------------- backend : lecture de l'identité
patch("backend/src/routes/profile.routes.ts", '"/identity/:userId"', [
    ('import { authenticate } from "../middlewares/auth.middleware";\n',
     'import { authenticate } from "../middlewares/auth.middleware";\nimport { authorizeRoles } from "../middlewares/role.middleware";\n', "import role"),
    ('import { missingIdentity, parseIdentity } from "../utils/identity";',
     'import { identitySelect, missingIdentity, parseIdentity } from "../utils/identity";', "import identity"),
    ('router.get("/", async (req: Request, res: Response) => {',
     '/** Identité d\'un utilisateur (stagiaire…) : préremplit les formulaires de l\'encadrement */\n'
     'router.get("/identity/:userId", authorizeRoles("ADMIN", "DIRECTION", "RH", "COORDINATOR"), async (req: Request, res: Response) => {\n'
     '  try {\n'
     '    const userId = Number(req.params.userId);\n\n'
     '    if (!Number.isInteger(userId) || userId <= 0) {\n'
     '      return res.status(400).json({ success: false, message: "Utilisateur invalide" });\n'
     '    }\n\n'
     '    const user = await prisma.user.findUnique({ where: { id: userId }, select: identitySelect });\n\n'
     '    if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable" });\n\n'
     '    return res.json({ success: true, data: user, missing: missingIdentity(user) });\n'
     '  } catch (error) {\n'
     '    logger.error("Lecture de l\'identité impossible", error);\n'
     '    return res.status(500).json({ success: false, message: "Erreur serveur" });\n'
     '  }\n'
     '});\n\n'
     'router.get("/", async (req: Request, res: Response) => {', "route"),
])

# ---------------------------------------------------------------- backend : enregistrement avec le stage
patch("backend/src/controllers/internship.controller.ts", "readStudentIdentity", [
    ('import { logger } from "../config/logger";\n',
     'import { logger } from "../config/logger";\nimport { parseIdentity, toText } from "../utils/identity";\n', "import"),
    ('export async function getInternships(\n',
     '/** Identité du stagiaire saisie dans le formulaire du stage (téléphone, naissance, CIN) */\n'
     'function readStudentIdentity(body: Record<string, unknown> | undefined): { data: Record<string, unknown>; error?: string } {\n'
     '  const raw = body?.identity;\n\n'
     '  if (!raw || typeof raw !== "object") return { data: {} };\n\n'
     '  const source = raw as Record<string, unknown>;\n'
     '  const parsed = parseIdentity(source);\n\n'
     '  if (parsed.error) return parsed;\n\n'
     '  const data = { ...parsed.data };\n\n'
     '  if (source.phone !== undefined) {\n'
     '    const phone = toText(source.phone);\n\n'
     '    if (phone && phone.length > 30) return { data, error: "Numéro de téléphone invalide." };\n\n'
     '    if (phone) data.phone = phone;\n'
     '  }\n\n'
     '  return { data };\n'
     '}\n\n'
     'async function saveStudentIdentity(studentId: number, data: Record<string, unknown>): Promise<void> {\n'
     '  if (Object.keys(data).length === 0) return;\n\n'
     '  await prisma.user.update({ where: { id: studentId }, data: data as never });\n'
     '}\n\n'
     'export async function getInternships(\n', "helpers"),
    ('    const internship = await prisma.internship.create({\n',
     '    const identity = readStudentIdentity(req.body);\n\n'
     '    if (identity.error) {\n'
     '      res.status(400).json({ success: false, message: identity.error });\n'
     '      return;\n'
     '    }\n\n'
     '    const internship = await prisma.internship.create({\n', "create parse"),
    ('    res.status(201).json({\n      success: true,\n      message: "Stage créé avec succès",',
     '    await saveStudentIdentity(Number(studentId), identity.data);\n\n'
     '    res.status(201).json({\n      success: true,\n      message: "Stage créé avec succès",', "create save"),
    ('    const internship = await prisma.internship.update({\n',
     '    const identity = readStudentIdentity(req.body);\n\n'
     '    if (identity.error) {\n'
     '      res.status(400).json({ success: false, message: identity.error });\n'
     '      return;\n'
     '    }\n\n'
     '    const internship = await prisma.internship.update({\n', "update parse"),
    ('    res.status(200).json({\n      success: true,\n      message: "Stage modifié avec succès",',
     '    await saveStudentIdentity(internship.studentId, identity.data);\n\n'
     '    res.status(200).json({\n      success: true,\n      message: "Stage modifié avec succès",', "update save"),
])

# ---------------------------------------------------------------- frontend : générique (nouveau type de champ)
patch("frontend/src/lib/crud.ts", '| "identity"', [
    ('  | "geo";\n', '  | "geo"\n  | "identity";\n', "FieldType"),
    ('  full?: boolean;\n}', '  full?: boolean;\n  /** type "identity" : nom du champ « select » qui contient l\'identifiant de la personne */\n  identityOf?: string;\n}', "FieldDef"),
])

patch("frontend/src/components/crud/ResourceFormPage.tsx", "IdentityFields", [
    ('import { getStoredRole } from "@/lib/access";\n',
     'import { getStoredRole } from "@/lib/access";\nimport { IDENTITY_KEYS, IdentityFields, identityName } from "@/components/crud/IdentityFields";\n', "import"),
    ('function initialEntries(field: FieldDef): Array<[string, string | boolean]> {\n',
     'function initialEntries(field: FieldDef): Array<[string, string | boolean]> {\n'
     '  if (field.type === "identity") {\n'
     '    return IDENTITY_KEYS.map((key): [string, string | boolean] => [identityName(key), key === "cinDuplicata" ? false : ""]);\n'
     '  }\n\n', "initialEntries"),
    ('function loadedEntries(field: FieldDef, item: Record<string, unknown>): Array<[string, string | boolean]> {\n',
     'function loadedEntries(field: FieldDef, item: Record<string, unknown>): Array<[string, string | boolean]> {\n'
     '  if (field.type === "identity") return initialEntries(field);\n\n', "loadedEntries"),
    ('    const payload: Record<string, unknown> = {};\n\n    for (const field of fields) {\n      if (field.type === "geo") {',
     '    const payload: Record<string, unknown> = {};\n\n    for (const field of fields) {\n'
     '      if (field.type === "identity") {\n'
     '        const identity: Record<string, unknown> = {};\n\n'
     '        for (const key of IDENTITY_KEYS) {\n'
     '          const raw = values[identityName(key)];\n\n'
     '          if (key === "cinDuplicata") identity[key] = Boolean(raw);\n'
     '          else if (String(raw ?? "").trim() !== "") identity[key] = String(raw).trim();\n'
     '        }\n\n'
     '        const cin = String(identity.cinNumber ?? "").replace(/[\\s.\\-]/g, "");\n\n'
     '        if (cin && !/^\\d{12}$/.test(cin)) {\n'
     '          setError("Le numéro de CIN doit contenir exactement 12 chiffres.");\n'
     '          return;\n'
     '        }\n\n'
     '        if (String(values[field.identityOf ?? ""] ?? "") !== "") payload.identity = identity;\n\n'
     '        continue;\n'
     '      }\n\n'
     '      if (field.type === "geo") {', "payload"),
    ('    const value = values[field.name];\n\n    if (field.type === "geo") {',
     '    const value = values[field.name];\n\n'
     '    if (field.type === "identity") {\n'
     '      return (\n'
     '        <IdentityFields\n'
     '          personId={String(values[field.identityOf ?? ""] ?? "")}\n'
     '          values={values}\n'
     '          setValue={setValue}\n'
     '          setMany={(patch) => setValues((cur) => ({ ...cur, ...patch }))}\n'
     '        />\n'
     '      );\n'
     '    }\n\n'
     '    if (field.type === "geo") {', "render"),
])

# ---------------------------------------------------------------- frontend : formulaire « Stage »
patch("frontend/src/lib/resources.tsx", 'type: "identity"', [
    ('    { name: "studentId", label: "Stagiaire", type: "select", lookup: "students", required: true },',
     '    { name: "studentId", label: "Stagiaire", type: "select", lookup: "students", required: true },\n'
     '    { name: "identity", label: "Informations du stagiaire", type: "identity", identityOf: "studentId", full: true },',
     "champ identité"),
])

print("Terminé. Redémarrez le backend et le frontend (aucune migration nécessaire : les champs existent déjà sur User).")
