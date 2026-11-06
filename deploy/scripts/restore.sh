#!/bin/sh
# Restauration d'une sauvegarde dans une base. USAGE : restore.sh <fichier.dump> <base_cible>
# ATTENTION : --clean supprime les objets existants de la base cible.
set -eu
[ $# -eq 2 ] || { echo "usage: $0 <fichier.dump> <base_cible>" >&2; exit 2; }
DUMP=$1; TARGET=$2
createdb "$TARGET" 2>/dev/null || true
pg_restore --clean --if-exists --no-owner -d "$TARGET" "$DUMP"
echo "Restauration terminée dans la base $TARGET"
