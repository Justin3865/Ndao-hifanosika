# Complète la base et les formulaires pour que les certificats se remplissent automatiquement
# (stagiaires, bénévoles, personnel = comptes utilisateurs ; bénéficiaires = fiche bénéficiaire).
# Usage (depuis C:\ndao-hifanosika) :  py appliquer-identite.py      (peut être relancé sans danger)
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

# ------------------------------------------------------------ 1) schema.prisma
patch("backend/prisma/schema.prisma", "// Identité (certificats automatiques)", [
    ("  hasDisability  Boolean @default(false)\n",
     "  hasDisability  Boolean @default(false)\n\n"
     "  // Identité (certificats automatiques)\n"
     "  birthDate      DateTime?\n  birthPlace     String?\n  cinNumber      String?\n  cinIssuedAt    DateTime?\n"
     "  cinIssuedPlace String?\n  cinDuplicata   Boolean   @default(false)\n  cinDuplicataAt DateTime?\n",
     "Beneficiary"),
])

# ------------------------------------------------------------ 2) bénéficiaires : enregistrement
patch("backend/src/controllers/beneficiary.controller.ts", "parseIdentity", [
    ('import { logger } from "../config/logger";\n',
     'import { logger } from "../config/logger";\nimport { parseIdentity } from "../utils/identity";\n',
     "import"),
    ("  return { ok: true, data };\n",
     "  // Naissance + CIN (validés : 12 chiffres, dates passées)\n"
     "  const identity = parseIdentity(body);\n\n"
     "  if (identity.error) return { ok: false, message: identity.error };\n\n"
     "  Object.assign(data, identity.data);\n\n"
     "  return { ok: true, data };\n",
     "parseBeneficiaryBody"),
])

# ------------------------------------------------------------ 3) utilisateurs : naissance + CIN
patch("backend/src/controllers/user.controller.ts", "parseIdentity", [
    ('import { prisma } from "../config/database";\n',
     'import { prisma } from "../config/database";\nimport { parseIdentity } from "../utils/identity";\n\n'
     '/** Naissance + CIN saisis par l\'administrateur (champs absents ignorés) */\n'
     'async function applyIdentity(user: any, body: Record<string, unknown>) {\n'
     '  const identity = parseIdentity(body);\n'
     '  if (identity.error || !user?.id || Object.keys(identity.data).length === 0) return user;\n'
     '  return prisma.user.update({ where: { id: user.id }, data: identity.data as any, include: { department: true } });\n'
     '}\n',
     "import"),
    ("    const user =\n      await createUserService({",
     "    const identityCheck = parseIdentity(req.body);\n\n    if (identityCheck.error) {\n"
     "      return res.status(400).json({ success: false, message: identityCheck.error });\n    }\n\n"
     "    const user =\n      await createUserService({", "create"),
    ("    const user =\n      await updateUserService(",
     "    const identityCheck = parseIdentity(req.body);\n\n    if (identityCheck.error) {\n"
     "      return res.status(400).json({ success: false, message: identityCheck.error });\n    }\n\n"
     "    const user =\n      await updateUserService(", "update"),
    ('        "Utilisateur créé avec succès.",\n      user: sanitizeUser(user),',
     '        "Utilisateur créé avec succès.",\n      user: sanitizeUser(await applyIdentity(user, req.body)),', "create msg"),
    ('        "Utilisateur mis à jour avec succès.",\n      user: sanitizeUser(user),',
     '        "Utilisateur mis à jour avec succès.",\n      user: sanitizeUser(await applyIdentity(user, req.body)),', "update msg"),
])

# ------------------------------------------------------------ 4) certificats : lecture / écriture de la fiche bénéficiaire
CERT = "backend/src/routes/certificates.routes.ts"
patch(CERT, "beneficiaryRow", [
    ("        select: { id: true, firstName: true, lastName: true, email: true, phone: true, project: { select: { name: true } } },",
     "        select: {\n          id: true, firstName: true, lastName: true, email: true, phone: true,\n"
     "          birthDate: true, birthPlace: true, cinNumber: true, cinIssuedAt: true, cinIssuedPlace: true,\n"
     "          cinDuplicata: true, cinDuplicataAt: true,\n          project: { select: { name: true } },\n        },",
     "lookup select"),
    ("    birthDate: null,\n    birthPlace: null,\n    cinNumber: null,\n    cinIssuedAt: null,\n    cinIssuedPlace: null,\n    cinDuplicata: false,\n    cinDuplicataAt: null,\n    role: null,",
     "    birthDate: b.birthDate ?? null,\n    birthPlace: b.birthPlace ?? null,\n    cinNumber: b.cinNumber ?? null,\n    cinIssuedAt: b.cinIssuedAt ?? null,\n"
     "    cinIssuedPlace: b.cinIssuedPlace ?? null,\n    cinDuplicata: Boolean(b.cinDuplicata),\n    cinDuplicataAt: b.cinDuplicataAt ?? null,\n    role: null,",
     "toBeneficiaryCandidate"),
    ("    if (!holderName || !title) {",
     "    // Bénéficiaire : la fiche en base complète ce qui n'a pas été saisi\n"
     "    if (beneficiaryId && type !== \"INTERNSHIP\" && !specialCase) {\n"
     "      const beneficiaryRow: Json = await db.beneficiary.findUnique({\n"
     "        where: { id: beneficiaryId },\n"
     "        select: { firstName: true, lastName: true, email: true, phone: true, birthDate: true, birthPlace: true, cinNumber: true, cinIssuedAt: true, cinIssuedPlace: true, cinDuplicata: true, cinDuplicataAt: true },\n"
     "      });\n\n"
     "      if (!beneficiaryRow) return res.status(404).json({ success: false, message: \"Bénéficiaire introuvable\" });\n\n"
     "      if (!holderName) holderName = `${beneficiaryRow.firstName} ${beneficiaryRow.lastName}`.trim();\n"
     "      holderEmail = holderEmail || beneficiaryRow.email?.trim() || null;\n"
     "      holderPhone = holderPhone || beneficiaryRow.phone?.trim() || null;\n"
     "      holderBirthDate = holderBirthDate ?? beneficiaryRow.birthDate ?? null;\n"
     "      holderBirthPlace = holderBirthPlace || beneficiaryRow.birthPlace?.trim() || null;\n"
     "      holderCin = holderCin || beneficiaryRow.cinNumber?.trim() || null;\n"
     "      holderCinIssuedAt = holderCinIssuedAt ?? beneficiaryRow.cinIssuedAt ?? null;\n"
     "      holderCinIssuedPlace = holderCinIssuedPlace || beneficiaryRow.cinIssuedPlace?.trim() || null;\n"
     "      holderCinDuplicata = holderCinDuplicata || Boolean(beneficiaryRow.cinDuplicata);\n"
     "      holderCinDuplicataAt = holderCinDuplicataAt ?? beneficiaryRow.cinDuplicataAt ?? null;\n    }\n\n"
     "    if (!holderName || !title) {",
     "autofill"),
    ("    res.status(201).json({ success: true, data: row, profileUpdated });",
     "    // Même principe pour la fiche d'un bénéficiaire : seuls les champs vides sont remplis\n"
     "    if (beneficiaryId && !userId && saveToProfile && type !== \"INTERNSHIP\") {\n"
     "      try {\n"
     "        const current: Json = await db.beneficiary.findUnique({\n"
     "          where: { id: beneficiaryId },\n"
     "          select: { birthDate: true, birthPlace: true, phone: true, cinNumber: true, cinIssuedAt: true, cinIssuedPlace: true, cinDuplicata: true, cinDuplicataAt: true },\n"
     "        });\n\n"
     "        if (current) {\n"
     "          const patch: Record<string, unknown> = {};\n"
     "          const has = (v: unknown) => v !== null && v !== undefined && v !== \"\";\n"
     "          const fill = (key: string, label: string, value: unknown, existing: unknown) => {\n"
     "            if (has(value) && !has(existing)) {\n              patch[key] = value;\n              profileUpdated.push(label);\n            }\n          };\n\n"
     "          fill(\"birthDate\", \"date de naissance\", holderBirthDate, current.birthDate);\n"
     "          fill(\"birthPlace\", \"lieu de naissance\", holderBirthPlace, current.birthPlace);\n"
     "          fill(\"phone\", \"téléphone\", holderPhone, current.phone);\n"
     "          fill(\"cinNumber\", \"numéro de CIN\", holderCin, current.cinNumber);\n"
     "          fill(\"cinIssuedAt\", \"date de délivrance du CIN\", holderCinIssuedAt, current.cinIssuedAt);\n"
     "          fill(\"cinIssuedPlace\", \"lieu de délivrance du CIN\", holderCinIssuedPlace, current.cinIssuedPlace);\n"
     "          fill(\"cinDuplicataAt\", \"date du duplicata\", holderCinDuplicataAt, current.cinDuplicataAt);\n\n"
     "          if (holderCinDuplicata && !current.cinDuplicata) {\n            patch.cinDuplicata = true;\n            profileUpdated.push(\"duplicata du CIN\");\n          }\n\n"
     "          if (Object.keys(patch).length > 0) await db.beneficiary.update({ where: { id: beneficiaryId }, data: patch });\n"
     "        }\n      } catch (error) {\n        logger.error(\"Mise à jour de la fiche bénéficiaire depuis le certificat impossible\", error);\n      }\n    }\n\n"
     "    res.status(201).json({ success: true, data: row, profileUpdated });",
     "write-back"),
])

# ------------------------------------------------------------ 5) formulaire bénéficiaire (frontend)
patch("frontend/src/lib/resources.tsx", "Date de naissance (certificat)", [
    ('    { name: "home", label: "Domicile du ménage (carte)", type: "geo", full: true },',
     '    { name: "birthDate", label: "Date de naissance (certificat)", type: "date" },\n'
     '    { name: "birthPlace", label: "Lieu de naissance (certificat)", type: "text" },\n'
     '    { name: "cinNumber", label: "N° CIN (12 chiffres)", type: "text" },\n'
     '    { name: "cinIssuedAt", label: "Date de délivrance du CIN", type: "date" },\n'
     '    { name: "cinIssuedPlace", label: "Lieu de délivrance du CIN", type: "text" },\n'
     '    { name: "cinDuplicata", label: "CIN délivré en duplicata", type: "checkbox" },\n'
     '    { name: "cinDuplicataAt", label: "Date du duplicata", type: "date" },\n'
     '    { name: "home", label: "Domicile du ménage (carte)", type: "geo", full: true },',
     "fields"),
    ('    { label: "Handicap", value: b.hasDisability ? "Oui" : "Non" },',
     '    { label: "Handicap", value: b.hasDisability ? "Oui" : "Non" },\n'
     '    { label: "Date de naissance", value: b.birthDate ? fmtDate(b.birthDate) : "—" },\n'
     '    { label: "Lieu de naissance", value: b.birthPlace || "—" },\n'
     '    { label: "N° CIN", value: b.cinNumber || "—" },\n'
     '    { label: "CIN délivré le", value: b.cinIssuedAt ? fmtDate(b.cinIssuedAt) : "—" },\n'
     '    { label: "CIN délivré à", value: b.cinIssuedPlace || "—" },\n'
     '    { label: "Duplicata", value: b.cinDuplicata ? (b.cinDuplicataAt ? "Oui, le " + fmtDate(b.cinDuplicataAt) : "Oui") : "Non" },',
     "detail"),
])

# ------------------------------------------------------------ 6) page « Délivrer un certificat » (frontend)
patch("frontend/src/app/certificates/create/page.tsx", 'selected?.source === "BENEFICIARY" ? selected.id', [
    ('        saveToProfile: !specialCase && selected?.source === "USER" && saveToProfile,',
     '        saveToProfile: !specialCase && !!selected && saveToProfile,', "saveToProfile"),
    ('            userId: !specialCase && selected?.source === "USER" ? selected.id : undefined,',
     '            userId: !specialCase && selected?.source === "USER" ? selected.id : undefined,\n'
     '            beneficiaryId: !specialCase && selected?.source === "BENEFICIARY" ? selected.id : undefined,', "beneficiaryId"),
    ('                  {selected.source === "USER"\n'
     '                    ? " Saisissez-les ci-dessous : elles seront enregistrées dans la fiche à la délivrance."\n'
     '                    : " La fiche d\'un bénéficiaire ne stocke que le nom, le téléphone et l\'e-mail : rien n\'est écrit dans la base."}',
     '                  {" Saisissez-les ci-dessous : elles seront enregistrées dans la fiche à la délivrance."}', "message"),
    ('          {selected?.source === "USER" && !specialCase && (\n            <label className="flex cursor-pointer',
     '          {selected && !specialCase && (\n            <label className="flex cursor-pointer', "checkbox"),
])

print("Terminé. Étapes suivantes : migration, prisma generate, redémarrer backend et frontend (voir LISEZMOI.txt).")
