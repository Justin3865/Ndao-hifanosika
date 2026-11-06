#!/bin/sh
# Test de restauration non destructif : dernière sauvegarde -> base temporaire -> comptage des tables -> suppression.
# USAGE : ./test-restore.sh <conteneur_db> <conteneur_backup>
set -eu
[ $# -eq 2 ] || { echo "usage: $0 <conteneur_db> <conteneur_backup>" >&2; exit 2; }
DB=$1; BK=$2; TMP=restore_test_$(date +%s)
LAST=$(docker exec "$BK" sh -c 'ls -1t /backups/*.dump | head -1')
[ -n "$LAST" ] || { echo "Aucune sauvegarde trouvée" >&2; exit 1; }
USER_=$(docker exec "$DB" printenv POSTGRES_USER)
docker exec "$BK" sh -c "createdb -h db -U $USER_ $TMP && pg_restore --no-owner -h db -U $USER_ -d $TMP $LAST"
N=$(docker exec "$DB" psql -U "$USER_" -d "$TMP" -tAc "select count(*) from information_schema.tables where table_schema='public'")
docker exec "$BK" dropdb -h db -U "$USER_" "$TMP"
[ "$N" -gt 0 ] && echo "Restauration VALIDE : $N tables restaurées depuis $LAST" || { echo "Restauration SUSPECTE : 0 table" >&2; exit 1; }
