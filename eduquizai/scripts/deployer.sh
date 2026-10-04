#!/usr/bin/env bash
# Déploiement (ou mise à jour) de la configuration de production.
#
#   cd eduquizai && ./scripts/deployer.sh
#
# Étapes : vérifier les secrets, construire les images, démarrer la stack,
# attendre que chaque service soit sain, puis vérifier le site de l'extérieur.
# Procédure complète et retour arrière : docs/deploiement.md.

set -euo pipefail

cd "$(dirname "$0")/.."

FICHIER_SECRETS=".env.production"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file "$FICHIER_SECRETS")

if [ ! -f "$FICHIER_SECRETS" ]; then
  echo "ERREUR : $FICHIER_SECRETS absent. Copier .env.production.example et le remplir." >&2
  exit 1
fi

# Aucun secret ne doit rester vide : la stack refuserait de démarrer plus loin,
# avec un message moins clair.
for variable in POSTGRES_MOT_DE_PASSE MONGO_MOT_DE_PASSE JWT_SECRET; do
  if ! grep -Eq "^${variable}=.+" "$FICHIER_SECRETS"; then
    echo "ERREUR : $variable est vide dans $FICHIER_SECRETS." >&2
    exit 1
  fi
done

echo "Construction des images et démarrage..."
# --wait : rend la main seulement quand les healthchecks sont au vert.
"${COMPOSE[@]}" up -d --build --wait

port=$(grep -E '^PORT_PUBLIC=' "$FICHIER_SECRETS" | cut -d= -f2)
port=${port:-8080}

echo "Vérification du site sur le port $port..."
curl --fail --silent --show-error "http://localhost:$port/" > /dev/null
# Une route protégée doit répondre 401 (JSON) à travers nginx : l'API est bien reliée.
statut_api=$(curl --silent --output /dev/null --write-out "%{http_code}" "http://localhost:$port/api/cours")
if [ "$statut_api" != "401" ]; then
  echo "ERREUR : l'API répond $statut_api au lieu de 401 à travers nginx." >&2
  exit 1
fi

"${COMPOSE[@]}" ps
echo "Déploiement terminé : http://localhost:$port"
