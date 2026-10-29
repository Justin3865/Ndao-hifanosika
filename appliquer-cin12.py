# CIN : 12 chiffres EXACTEMENT, jamais plus (saisie bloquée dans tous les formulaires + contrôle serveur).
# Usage (depuis C:\ndao-hifanosika) :  py appliquer-cin12.py      (peut être relancé sans danger)
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
            print("%s : ancre introuvable (%s) -> non modifié." % (rel, nom)); return
        s = s.replace(ancien, nouveau, 1)
    ecrire(c, s, crlf)
    print("%s : modifié." % rel)

D = 'replace(/\\D/g, "").slice(0, 12)'

patch("frontend/src/app/profile/page.tsx", D, [
    ('                        maxLength={15}\n                        placeholder="12 chiffres"\n                        value={form.cinNumber}\n                        onChange={(e) => setForm({ ...form, cinNumber: e.target.value })}',
     '                        maxLength={12}\n                        placeholder="12 chiffres"\n                        value={form.cinNumber}\n                        onChange={(e) => setForm({ ...form, cinNumber: e.target.value.' + D + ' })}', "profil")])

patch("frontend/src/components/users/UserEditorForm.tsx", D, [
    ('maxLength={15} placeholder="12 chiffres" value={form.cinNumber} onChange={(e) => set("cinNumber", e.target.value)}',
     'maxLength={12} placeholder="12 chiffres" value={form.cinNumber} onChange={(e) => set("cinNumber", e.target.value.' + D + ')}', "utilisateur")])

patch("frontend/src/app/certificates/create/page.tsx", D, [
    ('                onChange={(e) => set("holderCin", e.target.value)}',
     '                maxLength={12}\n                onChange={(e) => set("holderCin", e.target.value.' + D + ')}', "certificat")])

# champ générique (formulaire Bénéficiaire) : nouvelle option « digitsOnly »
patch("frontend/src/lib/crud.ts", "digitsOnly", [
    ('  full?: boolean;\n', '  full?: boolean;\n  /** type "text" : n\'accepte que des chiffres, au plus N */\n  digitsOnly?: number;\n', "FieldDef")])

patch("frontend/src/components/crud/ResourceFormPage.tsx", "digitsOnly", [
    ('          max={field.max}\n          className={inputClass}\n          value={String(value)}\n          onChange={(e) => setValue(field.name, e.target.value)}',
     '          max={field.max}\n          maxLength={field.digitsOnly}\n          inputMode={field.digitsOnly ? "numeric" : undefined}\n          className={inputClass}\n          value={String(value)}\n          onChange={(e) =>\n            setValue(field.name, field.digitsOnly ? e.target.value.replace(/\\D/g, "").slice(0, field.digitsOnly) : e.target.value)\n          }', "input")])

patch("frontend/src/lib/resources.tsx", "digitsOnly: 12", [
    ('{ name: "cinNumber", label: "N° CIN (12 chiffres)", type: "text" }',
     '{ name: "cinNumber", label: "N° CIN (12 chiffres)", type: "text", digitsOnly: 12 }', "bénéficiaire")])

# contrôle serveur du certificat : 12 chiffres exactement
patch("backend/src/routes/certificates.routes.ts", "\\d{12}", [
    ('    if (holderCin && !/^[A-Za-z0-9]{6,20}$/.test(holderCin)) {\n      return res.status(400).json({ success: false, message: "Numéro de CIN invalide (6 à 20 caractères, sans symboles)" });',
     '    if (holderCin && !/^\\d{12}$/.test(holderCin)) {\n      return res.status(400).json({ success: false, message: "Le numéro de CIN doit contenir exactement 12 chiffres" });', "serveur")])
print("Terminé.")
