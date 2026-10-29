# Nouveau stage : statut « En cours » par défaut (au lieu d'une liste vide).
# Usage (depuis C:\ndao-hifanosika) :  py appliquer-statut-stage.py      (peut être relancé sans danger)
import io, os, sys
c = os.path.join(os.environ.get("BASE", ""), "frontend", "src", "lib", "resources.tsx")
if not os.path.exists(c):
    sys.exit("Introuvable : " + c + " (lancez le script depuis C:\\ndao-hifanosika)")
with io.open(c, "r", encoding="utf-8", newline="") as f:
    b = f.read()
crlf = "\r\n" in b
s = b.replace("\r\n", "\n")
ancien = '{ name: "status", label: "Statut", type: "select", options: statusOptions(INTERNSHIP_STATUS) }'
nouveau = '{ name: "status", label: "Statut", type: "select", options: statusOptions(INTERNSHIP_STATUS), defaultValue: "IN_PROGRESS" }'
if "options: statusOptions(INTERNSHIP_STATUS), defaultValue" in s:
    sys.exit("Déjà à jour.")
if s.count(ancien) != 1:
    sys.exit("Ancre introuvable : resources.tsx non modifié.")
s = s.replace(ancien, nouveau, 1)
with io.open(c, "w", encoding="utf-8", newline="") as f:
    f.write(s.replace("\n", "\r\n") if crlf else s)
print("OK : le statut d'un nouveau stage est « En cours » par défaut.")
