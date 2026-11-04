#!/bin/sh
# Restauration d'une sauvegarde. À TESTER régulièrement sur la recette (procédure de restauration testée, cahier §10).
#   ./restore.sh <fichier.dump> [conteneur_db]
# ATTENTION : écrase les objets existants de la base cible.
set -eu
FILE="${1:?usage: restore.sh <fichier.dump> [conteneur_db]}"
CONTAINER="${2:-ndao-dev-db-1}"
[ -f "$FILE" ] || { echo "Fichier introuvable : $FILE" >&2; exit 1; }
echo "Restauration de $FILE dans $CONTAINER (Ctrl+C pour annuler)…"; sleep 5
docker exec -i "$CONTAINER" sh -c 'pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$FILE"
echo "Restauration terminée."
