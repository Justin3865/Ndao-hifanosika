# « Ajouter un stage » : le champ Stagiaire n'est plus obligatoire si on saisit un NOUVEAU stagiaire
# (prénom, nom, e-mail, niveau) : le compte est créé avec le stage, puis sa fiche (téléphone, naissance, CIN) est complétée.
# Prérequis : stagiaire-identite.zip (appliquer-stagiaire.py) déjà appliqué.
# Usage (depuis C:\ndao-hifanosika) :  py appliquer-nouveau-stagiaire.py      (peut être relancé sans danger)
import io, os, sys

BASE = os.environ.get("BASE", "")

def lire(c):
    if not os.path.exists(c):
        sys.exit("Introuvable : " + c + " (lancez le script depuis C:\\ndao-hifanosika)")
    with io.open(c, "r", encoding="utf-8", newline="") as f:
        b = f.read()
    return b.replace("\r\n", "\n"), "\r\n" in b

def ecrire(c, t, crlf):
    with io.open(c, "w", encoding="utf-8", newline="") as f:
        f.write(t.replace("\n", "\r\n") if crlf else t)

def patch(rel, marque, etapes):
    c = os.path.join(BASE, *rel.split("/"))
    s, crlf = lire(c)
    if marque in s:
        print("%s : déjà à jour." % rel); return
    for ancien, nouveau, nom in etapes:
        if s.count(ancien) != 1:
            sys.exit("Ancre introuvable ou ambiguë (%s / %s) : rien n'a été modifié dans ce fichier. "
                     "Avez-vous appliqué stagiaire-identite.zip avant ?" % (rel, nom))
        s = s.replace(ancien, nouveau, 1)
    ecrire(c, s, crlf)
    print("%s : modifié." % rel)

# ------------------------------------------------------------------ backend
patch("backend/src/controllers/internship.controller.ts", "createStudentFromBody", [
    ('import { logger } from "../config/logger";\n',
     'import bcrypt from "bcrypt";\nimport { randomBytes } from "crypto";\nimport { logger } from "../config/logger";\nimport { sendEmail } from "../utils/mailer";\n', "imports"),
    ('async function saveStudentIdentity(',
     '/**\n'
     ' * Nouveau stagiaire saisi dans le formulaire du stage : crée (ou retrouve par e-mail) le compte stagiaire.\n'
     ' * Réservé à l\'ADMIN et au RH. Aucun mot de passe n\'est envoyé : la personne utilise « Mot de passe oublié ».\n'
     ' */\n'
     'async function createStudentFromBody(\n'
     '  body: Record<string, any> | undefined,\n'
     '  requesterRole: string | undefined,\n'
     '): Promise<{ id?: number; error?: string; status?: number }> {\n'
     '  const person = body?.newStudent;\n\n'
     '  if (body?.studentId || !person || typeof person !== "object") return {};\n\n'
     '  if (!requesterRole || !["ADMIN", "RH"].includes(requesterRole)) {\n'
     '    return { error: "Seuls l\'administrateur et le RH peuvent créer un compte stagiaire.", status: 403 };\n'
     '  }\n\n'
     '  const firstName = toText(person.firstName);\n'
     '  const lastName = toText(person.lastName);\n'
     '  const email = toText(person.email)?.toLowerCase();\n\n'
     '  if (!firstName || !lastName || !email) {\n'
     '    return { error: "Prénom, nom et e-mail du nouveau stagiaire sont obligatoires." };\n'
     '  }\n\n'
     '  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return { error: "Adresse e-mail du stagiaire invalide." };\n\n'
     '  if (!body?.title || !body?.startDate) return { error: "Le titre et la date de début du stage sont obligatoires." };\n\n'
     '  const identity = readStudentIdentity(body);\n\n'
     '  if (identity.error) return { error: identity.error };\n\n'
     '  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });\n\n'
     '  if (existing) {\n'
     '    if (["STAGIAIRE_L3", "STAGIAIRE_M2"].includes(String(existing.role))) return { id: existing.id };\n\n'
     '    return { error: "Un compte non stagiaire utilise déjà cet e-mail." };\n'
     '  }\n\n'
     '  const role = person.role === "STAGIAIRE_M2" ? "STAGIAIRE_M2" : "STAGIAIRE_L3";\n'
     '  const password = `${randomBytes(9).toString("base64url")}aA1!`;\n\n'
     '  const user = await prisma.user.create({\n'
     '    data: {\n'
     '      firstName,\n'
     '      lastName,\n'
     '      email,\n'
     '      password: await bcrypt.hash(password, 12),\n'
     '      role: role as never,\n'
     '      status: "ACTIVE" as never,\n'
     '    },\n'
     '    select: { id: true },\n'
     '  });\n\n'
     '  try {\n'
     '    const base = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\\/$/, "");\n\n'
     '    await sendEmail(\n'
     '      email,\n'
     '      "Votre compte — Ndao Hifanosika",\n'
     '      `Bonjour ${firstName},\\n\\nUn compte stagiaire a été créé pour votre stage « ${String(body.title)} ».\\n'
     'Pour définir votre mot de passe : ${base}/login puis « Mot de passe oublié » avec cette adresse e-mail.\\n\\n— Ndao Hifanosika`,\n'
     '    );\n'
     '  } catch (error) {\n'
     '    logger.error("E-mail de bienvenue du stagiaire non envoyé", error);\n'
     '  }\n\n'
     '  return { id: user.id };\n'
     '}\n\n'
     'async function saveStudentIdentity(', "helper"),
    ('  try {\n    const {\n      projectId,\n      studentId,',
     '  try {\n'
     '    // Nouveau stagiaire saisi dans le formulaire : le compte est créé avant le stage\n'
     '    const created = await createStudentFromBody(req.body, getReqUser(req)?.role);\n\n'
     '    if (created.error) {\n'
     '      res.status(created.status ?? 400).json({ success: false, message: created.error });\n'
     '      return;\n'
     '    }\n\n'
     '    if (created.id) req.body.studentId = created.id;\n\n'
     '    const {\n      projectId,\n      studentId,', "create"),
])

# ------------------------------------------------------------------ frontend : champ générique « newperson »
patch("frontend/src/lib/crud.ts", '"newperson"', [
    ('  | "identity";\n', '  | "identity"\n  | "newperson";\n', "FieldType"),
    ('  identityOf?: string;\n}', '  identityOf?: string;\n  /** Champ obligatoire SAUF si le bloc « newperson » de ce nom est rempli */\n  requiredUnless?: string;\n}', "FieldDef"),
])

patch("frontend/src/components/crud/ResourceFormPage.tsx", "NewPersonFields", [
    ('import { IDENTITY_KEYS, IdentityFields, identityName } from "@/components/crud/IdentityFields";\n',
     'import { IDENTITY_KEYS, IdentityFields, identityName } from "@/components/crud/IdentityFields";\n'
     'import { NEW_PERSON_KEYS, NewPersonFields, newPersonFilled, newPersonName } from "@/components/crud/NewPersonFields";\n', "import"),
    ('function initialEntries(field: FieldDef): Array<[string, string | boolean]> {\n',
     'function initialEntries(field: FieldDef): Array<[string, string | boolean]> {\n'
     '  if (field.type === "newperson") {\n'
     '    return NEW_PERSON_KEYS.map((key): [string, string | boolean] => [newPersonName(key), key === "role" ? "STAGIAIRE_L3" : ""]);\n'
     '  }\n\n', "initialEntries"),
    ('  if (field.type === "identity") return initialEntries(field);\n',
     '  if (field.type === "identity" || field.type === "newperson") return initialEntries(field);\n', "loadedEntries"),
    ('      if (field.required && field.type !== "checkbox") {\n        if (String(values[field.name] ?? "").trim() === "") {',
     '      if (field.required && field.type !== "checkbox") {\n'
     '        const alternative = field.requiredUnless ? newPersonFilled(values) : false;\n\n'
     '        if (String(values[field.name] ?? "").trim() === "" && !alternative) {', "required"),
    ('          setError(`Le champ « ${field.label} » est obligatoire.`);',
     '          setError(\n'
     '            field.requiredUnless\n'
     '              ? `Choisissez « ${field.label} » ou renseignez le prénom, le nom et l\'e-mail du nouveau stagiaire.`\n'
     '              : `Le champ « ${field.label} » est obligatoire.`,\n'
     '          );', "message"),
    ('      if (field.type === "identity") {\n        const identity: Record<string, unknown> = {};',
     '      if (field.type === "newperson") {\n'
     '        if (String(values[field.identityOf ?? ""] ?? "") === "" && newPersonFilled(values)) {\n'
     '          payload.newStudent = Object.fromEntries(\n'
     '            NEW_PERSON_KEYS.map((key) => [key, String(values[newPersonName(key)] ?? "").trim()]),\n'
     '          );\n'
     '        }\n\n'
     '        continue;\n'
     '      }\n\n'
     '      if (field.type === "identity") {\n        const identity: Record<string, unknown> = {};', "payload newperson"),
    ('        if (String(values[field.identityOf ?? ""] ?? "") !== "") payload.identity = identity;',
     '        if (String(values[field.identityOf ?? ""] ?? "") !== "" || newPersonFilled(values)) payload.identity = identity;', "payload identity"),
    ('    if (field.type === "identity") {\n      return (\n        <IdentityFields',
     '    if (field.type === "newperson") {\n'
     '      return (\n'
     '        <NewPersonFields\n'
     '          disabled={String(values[field.identityOf ?? ""] ?? "") !== ""}\n'
     '          values={values}\n'
     '          setValue={setValue}\n'
     '        />\n'
     '      );\n'
     '    }\n\n'
     '    if (field.type === "identity") {\n      return (\n        <IdentityFields', "render"),
])

patch("frontend/src/lib/resources.tsx", 'type: "newperson"', [
    ('    { name: "studentId", label: "Stagiaire", type: "select", lookup: "students", required: true },',
     '    { name: "studentId", label: "Stagiaire", type: "select", lookup: "students", required: true, requiredUnless: "newPerson" },\n'
     '    { name: "newPerson", label: "Nouveau stagiaire", type: "newperson", identityOf: "studentId", hideOnEdit: true, full: true },', "champs"),
])
print("Terminé. Redémarrez le backend et le frontend (aucune migration).")
