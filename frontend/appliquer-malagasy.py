#!/usr/bin/env python3
"""Branche (ou débranche) la traduction malgache complète dans src/app/layout.tsx : 2 lignes, rien d'autre.

  python appliquer-malagasy.py            # branche (idempotent, sauvegarde layout.tsx.bak-malagasy)
  python appliquer-malagasy.py --revert   # retire exactement ces 2 lignes
"""
import pathlib, shutil, sys

F = pathlib.Path(__file__).resolve().parent / "src" / "app" / "layout.tsx"
MARK = "AutoTranslate"
IMPORT_ANCHOR = 'import { I18nProvider } from "@/components/i18n/I18nProvider";'
IMPORT = 'import { AutoTranslate } from "@/components/i18n/AutoTranslate";'
TAG_ANCHOR = "<I18nProvider>"
TAG = "<AutoTranslate />"

def main() -> int:
    if not F.exists():
        print(f"Introuvable : {F} (lancez le script depuis le dossier frontend)"); return 1
    raw = F.read_bytes().decode("utf-8"); crlf = "\r\n" in raw; t = raw.replace("\r\n", "\n")
    if "--revert" in sys.argv:
        t = "\n".join(l for l in t.split("\n") if MARK not in l)
        F.write_bytes((t.replace("\n", "\r\n") if crlf else t).encode("utf-8")); print("Retiré."); return 0
    if MARK in t:
        print("Déjà appliqué."); return 0
    if IMPORT_ANCHOR not in t or TAG_ANCHOR not in t:
        print("Ancres introuvables : ajoutez à la main l'import et <AutoTranslate /> juste après <I18nProvider>."); return 1
    shutil.copyfile(F, F.with_name("layout.tsx.bak-malagasy"))
    t = t.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + "\n" + IMPORT, 1)
    t = t.replace(TAG_ANCHOR, TAG_ANCHOR + "\n          " + TAG, 1)
    F.write_bytes((t.replace("\n", "\r\n") if crlf else t).encode("utf-8"))
    print("OK — layout.tsx mis à jour (sauvegarde : layout.tsx.bak-malagasy).")
    return 0

if __name__ == "__main__":
    sys.exit(main())
