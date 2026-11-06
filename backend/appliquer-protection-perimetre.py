#!/usr/bin/env python3
"""Branche (ou débranche) les 2 routeurs ajoutés par ce lot dans src/app.ts.

  python appliquer-protection-perimetre.py            # branche (idempotent, sauvegarde src/app.ts.bak-protection)
  python appliquer-protection-perimetre.py --revert   # retire exactement ce qui a été ajouté

Ajoute seulement 4 lignes dans app.ts ; aucun contrôleur, route ou service existant n'est modifié.
  - app.use("/api", scopeOverlayRouter)           : périmètre coordinateur sur les vues agrégées + protection des données
  - app.use("/api/service", mlDropoutRouter)      : GET /api/service/dropout-features (clé de service)
"""
import pathlib
import shutil
import sys

APP = pathlib.Path(__file__).resolve().parent / "src" / "app.ts"
MARK = "// [lot-protection-perimetre]"

IMPORTS = (
    'import { scopeOverlayRouter } from "./routes/scopeOverlay.routes";\n'
    'import { mlDropoutRouter } from "./routes/mlDropout.routes";\n'
)
IMPORT_ANCHOR = 'import { emailLimit } from "./middlewares/emailLimit.middleware";'
OVERLAY = f'app.use("/api", scopeOverlayRouter); {MARK}\n'
OVERLAY_ANCHOR = 'app.use("/api/auth", authRoutes);'
SERVICE = f'app.use("/api/service", mlDropoutRouter); {MARK}\n'
SERVICE_ANCHOR = 'app.use("/api/service", serviceRouter);'


def main() -> int:
    if not APP.exists():
        print(f"Introuvable : {APP} (lancez ce script depuis le dossier backend)")
        return 1
    raw = APP.read_bytes().decode("utf-8")
    crlf = "\r\n" in raw
    text = raw.replace("\r\n", "\n")

    if "--revert" in sys.argv:
        if MARK not in text and "scopeOverlay.routes" not in text:
            print("Rien à retirer.")
            return 0
        text = "".join(
            line + "\n" for line in text.split("\n")[:-1]
            if MARK not in line and "scopeOverlay.routes" not in line and "mlDropout.routes" not in line
        ) + text.split("\n")[-1]
        APP.write_bytes((text.replace("\n", "\r\n") if crlf else text).encode("utf-8"))
        print("Routeurs retirés de src/app.ts.")
        return 0

    if MARK in text:
        print("Déjà appliqué : rien à faire.")
        return 0
    for anchor in (IMPORT_ANCHOR, OVERLAY_ANCHOR, SERVICE_ANCHOR):
        if anchor not in text:
            print(f"Ancre introuvable dans app.ts : {anchor}\nAjoutez les lignes à la main (voir docs/GUIDE_ADMINISTRATEUR.md §Installation).")
            return 1

    shutil.copyfile(APP, APP.with_name("app.ts.bak-protection"))
    text = text.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + "\n" + IMPORTS.rstrip("\n"), 1)
    text = text.replace(OVERLAY_ANCHOR, OVERLAY + OVERLAY_ANCHOR, 1)
    text = text.replace(SERVICE_ANCHOR, SERVICE_ANCHOR + "\n" + SERVICE.rstrip("\n"), 1)
    APP.write_bytes((text.replace("\n", "\r\n") if crlf else text).encode("utf-8"))
    print("OK — src/app.ts mis à jour (sauvegarde : src/app.ts.bak-protection).")
    print("Étape suivante : npm run check  puis redémarrer le backend.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
