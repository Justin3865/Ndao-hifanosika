# Corrige "Mot de passe oublié" : envoi d'un code à 6 chiffres par e-mail/SMS.
# Usage (depuis C:\ndao-hifanosika) :  py appliquer-motdepasse.py
import io, os, re, sys

FICHIER = os.path.join("backend", "src", "controllers", "auth.controller.ts")
BLOC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "new_block.ts")

if not os.path.exists(FICHIER):
    sys.exit("Introuvable : " + FICHIER + " (lancez le script depuis C:\\ndao-hifanosika)")

with io.open(FICHIER, "r", encoding="utf-8", newline="") as f:
    src = f.read()
crlf = "\r\n" in src
src = src.replace("\r\n", "\n")

if "findResetUser" in src:
    sys.exit("Déjà appliqué.")

with io.open(BLOC, "r", encoding="utf-8") as f:
    bloc = f.read()

debut = src.find("export async function forgotPassword")
fin = src.find("export async function resetPassword")
if debut < 0 or fin < 0 or fin < debut:
    sys.exit("Structure inattendue : forgotPassword / resetPassword introuvables.")

src = src[:debut] + bloc + src[fin:]

if "isEmailConfigured" not in src.split("export async function")[0]:
    src = src.replace(
        'import { isSmsConfigured, normalizePhone, sendSms } from "../utils/sms";',
        'import { isSmsConfigured, normalizePhone, sendSms } from "../utils/sms";\nimport { isEmailConfigured, sendEmail } from "../utils/mailer";',
        1,
    )

if crlf:
    src = src.replace("\n", "\r\n")
with io.open(FICHIER + ".bak", "w", encoding="utf-8", newline="") as f:
    pass
os.remove(FICHIER + ".bak")
with io.open(FICHIER, "w", encoding="utf-8", newline="") as f:
    f.write(src)
print("OK : auth.controller.ts mis à jour.")
