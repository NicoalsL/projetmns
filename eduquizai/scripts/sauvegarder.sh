#!/usr/bin/env bash
# Sauvegarde des deux bases de la stack Docker (PostgreSQL + MongoDB).
#
#   cd eduquizai && ./scripts/sauvegarder.sh
#
# Crée sauvegardes/AAAA-MM-JJ_HHMMSS/ avec :
#   - postgres.sql : export complet (schéma + données) par pg_dump
#   - mongo.archive : export de la base MongoDB par mongodump
# Le dossier sauvegardes/ est exclu de Git : il contient des données personnelles.

set -euo pipefail

# Toujours exécuté depuis le dossier eduquizai/, où se trouve docker-compose.yml.
cd "$(dirname "$0")/.."

horodatage=$(date +%Y-%m-%d_%H%M%S)
dossier="sauvegardes/$horodatage"
mkdir -p "$dossier"

echo "Sauvegarde PostgreSQL..."
# --clean --if-exists : le fichier supprime puis recrée chaque objet, ce qui
# permet de le rejouer sur une base existante lors d'une restauration.
docker compose exec -T postgres pg_dump -U eduquizai -d eduquizai --clean --if-exists > "$dossier/postgres.sql"

echo "Sauvegarde MongoDB..."
docker compose exec -T mongo mongodump --db eduquizai --archive > "$dossier/mongo.archive"

# Une sauvegarde vide est pire qu'une absence de sauvegarde : on vérifie.
if [ ! -s "$dossier/postgres.sql" ] || [ ! -s "$dossier/mongo.archive" ]; then
  echo "ERREUR : fichier de sauvegarde vide dans $dossier" >&2
  exit 1
fi

echo "Sauvegarde terminée : $dossier"
ls -l "$dossier"
