#!/usr/bin/env bash
# Restauration des deux bases à partir d'une sauvegarde de sauvegarder.sh.
#
#   cd eduquizai && ./scripts/restaurer.sh sauvegardes/AAAA-MM-JJ_HHMMSS
#
# ATTENTION : remplace le contenu ACTUEL des bases par celui de la sauvegarde.
# Une confirmation est demandée (sauf avec la variable CONFIRMER=oui, pour
# un usage automatisé).

set -euo pipefail

cd "$(dirname "$0")/.."

dossier="${1:-}"
if [ -z "$dossier" ] || [ ! -f "$dossier/postgres.sql" ] || [ ! -f "$dossier/mongo.archive" ]; then
  echo "Usage : $0 sauvegardes/AAAA-MM-JJ_HHMMSS" >&2
  echo "Le dossier doit contenir postgres.sql et mongo.archive." >&2
  exit 1
fi

if [ "${CONFIRMER:-}" != "oui" ]; then
  read -r -p "Remplacer les données actuelles par la sauvegarde $dossier ? (oui/non) " reponse
  if [ "$reponse" != "oui" ]; then
    echo "Restauration annulée."
    exit 0
  fi
fi

echo "Restauration PostgreSQL..."
# ON_ERROR_STOP : on s'arrête à la première erreur au lieu de restaurer à moitié.
docker compose exec -T postgres psql -U eduquizai -d eduquizai -v ON_ERROR_STOP=1 --quiet < "$dossier/postgres.sql" > /dev/null

echo "Restauration MongoDB..."
# --drop : chaque collection est vidée avant d'être restaurée (pas de doublons).
docker compose exec -T mongo mongorestore --archive --drop --quiet < "$dossier/mongo.archive"

echo "Restauration terminée depuis $dossier."
