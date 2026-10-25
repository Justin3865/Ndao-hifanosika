#!/usr/bin/env python3
"""Branche la fenêtre de détail + les boutons Accepter/Refuser dans frontend/src/app/notifications/page.tsx.
Usage (depuis la racine du projet, celle qui contient backend/ et frontend/) :   python appliquer-notifications.py
Idempotent ; CRLF conservé ; ne touche à rien d'autre. Fait une copie page.tsx.bak."""
import re, sys, shutil, pathlib

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
page = root / "frontend" / "src" / "app" / "notifications" / "page.tsx"
if not page.exists():
    sys.exit(f"Introuvable : {page}")

raw = page.read_bytes().decode("utf-8")
crlf = "\r\n" in raw
t = raw.replace("\r\n", "\n")

if "NotificationDetail" in t:
    sys.exit("Déjà appliqué.")

missing = []

def sub(pattern, repl, label, flags=0):
    global t
    new, n = re.subn(pattern, repl, t, count=1, flags=flags)
    if n == 0:
        missing.append(label)
    else:
        t = new

sub(r'(import \{ MessageAttachments \} from "@/components/notifications/MessageAttachments";\n)',
    r'\1import { NotificationDetail } from "@/components/notifications/NotificationDetail";\nimport { RegistrationRequestActions } from "@/components/notifications/RegistrationRequestActions";\n',
    "imports")

sub(r'(  const \[query, setQuery\] = useState\(""\);\n)',
    r'\1  const [detailId, setDetailId] = useState<number | null>(null);\n', "état detailId")

sub(r'(  const menuItem = menuId === null \? null : items\.find\(\(item\) => item\.id === menuId\) \?\? null;\n)',
    r'\1  const detailItem = detailId === null ? null : items.find((item) => item.id === detailId) ?? null;\n', "detailItem")

sub(r'(  const markRead = \(item: FeedItem\) => \{\n\s*if \(!item\.read\) void setRead\(item\.id, true\);\n)(\s*\};)',
    r'\1    setDetailId(item.id); // toucher un message ouvre son détail\n\2', "markRead")

sub(r'(onMenu=\{\(target\) => setMenuId\(target\.id\)\}\s*>\n)',
    r'\1            <RegistrationRequestActions item={item} />\n', "boutons dans la carte")

sub(r'(      \{menuItem && \(\n)',
    r'      {detailItem && <NotificationDetail item={detailItem} onClose={() => setDetailId(null)} />}\n\n\1', "rendu du détail")

if missing:
    print("!! Repères introuvables (votre page a changé) :", ", ".join(missing))
    print("   Rien n'a été écrit. Envoyez-moi frontend/src/app/notifications/page.tsx et je l'adapte.")
    sys.exit(1)

shutil.copyfile(page, str(page) + ".bak")
page.write_bytes((t.replace("\n", "\r\n") if crlf else t).encode("utf-8"))
print("OK : notifications/page.tsx modifié (sauvegarde : page.tsx.bak).")
