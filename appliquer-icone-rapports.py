# Menu : « Rapports » reçoit l'icône document (FileText) ; « Suivi & Évaluation » garde le graphique.
# Usage (depuis C:\ndao-hifanosika) :  py appliquer-icone-rapports.py      (peut être relancé sans danger)
import io, os, sys
c = os.path.join(os.environ.get("BASE", ""), "frontend", "src", "components", "layout", "Sidebar.tsx")
if not os.path.exists(c):
    sys.exit("Introuvable : " + c + " (lancez le script depuis C:\\ndao-hifanosika)")
with io.open(c, "r", encoding="utf-8", newline="") as f:
    b = f.read()
crlf = "\r\n" in b
s = b.replace("\r\n", "\n")
ancien = '{ href: "/reports", label: "Rapports", icon: BarChart3 }'
nouveau = '{ href: "/reports", label: "Rapports", icon: FileText }'
if nouveau in s:
    sys.exit("Déjà à jour.")
if s.count(ancien) != 1:
    sys.exit("Ancre introuvable : Sidebar.tsx non modifié.")
if "  FileText,\n" not in s:
    sys.exit("FileText n'est pas importé dans Sidebar.tsx : non modifié.")
s = s.replace(ancien, nouveau, 1)
with io.open(c, "w", encoding="utf-8", newline="") as f:
    f.write(s.replace("\n", "\r\n") if crlf else s)
print("OK : l'icône de « Rapports » est maintenant un document.")
