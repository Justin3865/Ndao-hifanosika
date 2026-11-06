#!/bin/sh
# Sauvegarde PostgreSQL (format custom), vérification de l'archive, rotation.
set -eu
DIR=/backups
KEEP=${BACKUP_KEEP_DAYS:-14}
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILE="$DIR/${PGDATABASE}_$STAMP.dump"
mkdir -p "$DIR"
pg_dump -Fc --no-owner -f "$FILE.tmp"
pg_restore --list "$FILE.tmp" >/dev/null   # échoue si l'archive est illisible
mv "$FILE.tmp" "$FILE"
find "$DIR" -name '*.dump' -mtime +"$KEEP" -delete
echo "Sauvegarde OK : $FILE ($(du -h "$FILE" | cut -f1))"
