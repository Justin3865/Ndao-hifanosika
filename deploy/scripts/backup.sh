#!/bin/sh
# Sauvegarde PostgreSQL (format custom, compressé) + rotation. Utilisé par le service « backup ».
# Variables : PGHOST PGUSER PGPASSWORD PGDATABASE (standard libpq), BACKUP_KEEP_DAYS (défaut 14), BACKUP_DIR (défaut /backups)
set -eu
DIR="${BACKUP_DIR:-/backups}"
KEEP="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$DIR/ndao_${PGDATABASE:-ndao}_${STAMP}.dump"
mkdir -p "$DIR"
if pg_dump --format=custom --compress=6 --no-owner --file="$FILE.part"; then
  mv "$FILE.part" "$FILE"
  # Vérification d'intégrité : l'archive doit pouvoir être listée
  pg_restore --list "$FILE" >/dev/null
  echo "[backup] OK  $FILE ($(du -h "$FILE" | cut -f1))"
else
  rm -f "$FILE.part"
  echo "[backup] ÉCHEC de pg_dump" >&2
  exit 1
fi
find "$DIR" -name 'ndao_*.dump' -mtime +"$KEEP" -print -delete | sed 's/^/[backup] supprimé (rotation) /'
