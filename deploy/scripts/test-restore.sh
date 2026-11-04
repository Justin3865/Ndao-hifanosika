#!/bin/sh
# Test automatisé de restauration : restaure la dernière sauvegarde dans une base temporaire et compte les tables.
#   ./test-restore.sh [conteneur_db] [dossier_sauvegardes_dans_conteneur_backup]
set -eu
DB="${1:-ndao-dev-db-1}"; BK="${2:-ndao-dev-backup-1}"
LATEST="$(docker exec "$BK" sh -c 'ls -1t /backups/ndao_*.dump | head -1')"
[ -n "$LATEST" ] || { echo "Aucune sauvegarde trouvée" >&2; exit 1; }
docker exec "$DB" sh -c 'dropdb -U "$POSTGRES_USER" --if-exists ndao_restore_test; createdb -U "$POSTGRES_USER" ndao_restore_test'
docker exec "$BK" cat "$LATEST" | docker exec -i "$DB" sh -c 'pg_restore --no-owner -U "$POSTGRES_USER" -d ndao_restore_test'
N="$(docker exec "$DB" sh -c 'psql -U "$POSTGRES_USER" -d ndao_restore_test -Atc "select count(*) from information_schema.tables where table_schema='"'"'public'"'"'"')"
docker exec "$DB" sh -c 'dropdb -U "$POSTGRES_USER" ndao_restore_test'
echo "Restauration OK : $N tables dans la base temporaire (source : $LATEST)"
