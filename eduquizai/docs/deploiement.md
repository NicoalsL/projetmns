# Déploiement d'EduQuizAI

Procédure pour installer EduQuizAI sur un serveur (ou une machine de démonstration) avec
la configuration proche de la production `docker-compose.prod.yml`. Vérifiée en local le
3 octobre 2026 : stack démarrée, parcours complet dans un navigateur, en-têtes de sécurité
contrôlés.

## 1. Architecture déployée

```
navigateur ──HTTP(S)──> nginx (service front, seul port publié)
                          ├── /            fichiers de l'application React (build Vite)
                          └── /api/...  ──> API Node.js (service back, port 3000 interne)
                                              ├── PostgreSQL (comptes, cours, journaux)
                                              ├── MongoDB (quiz), avec authentification
                                              └── IA : Ollama sur l'hôte, OpenAI ou simulation
```

| | Développement (`docker-compose.yml`) | Production (`docker-compose.prod.yml`) |
|---|---|---|
| Front | serveur Vite, rechargement à chaud | build statique servi par nginx (`Dockerfile.prod`) |
| API | `node --watch`, port 3000 publié | `npm start`, aucun port publié |
| Bases | ports internes, MongoDB sans mot de passe | ports internes, MongoDB avec mot de passe |
| Secrets | `back/.env` | `.env.production` (jamais commité) |
| En-têtes de sécurité | — | CSP, X-Frame-Options, Referrer-Policy… (`front/nginx.conf`) |
| Redémarrage | manuel | automatique (`restart: unless-stopped`) |

## 2. Prérequis

- Docker Engine 24+ avec Docker Compose v2 (`docker compose version`).
- 2 Go de mémoire libre (4 Go et un GPU si Ollama tourne sur la même machine).
- `openssl` pour générer les secrets (présent sous Linux, macOS et Git Bash).

## 3. Première installation

```bash
git clone https://github.com/NicoalsL/projetmns.git
cd projetmns/eduquizai

# 1. Secrets : copier le modèle puis remplir chaque valeur vide.
cp .env.production.example .env.production
openssl rand -hex 24   # -> POSTGRES_MOT_DE_PASSE
openssl rand -hex 24   # -> MONGO_MOT_DE_PASSE
openssl rand -hex 32   # -> JWT_SECRET
chmod 600 .env.production   # lisible par son seul propriétaire

# 2. Construction, démarrage et vérifications.
./scripts/deployer.sh
```

`deployer.sh` refuse de continuer si un secret est vide, construit les images, attend que
chaque service soit sain (`--wait`), puis vérifie que le site répond et que l'API est
joignable à travers nginx (une route protégée doit répondre 401).

Choix du fournisseur d'IA dans `.env.production` :

| `IA_FOURNISSEUR` | À renseigner | Remarque |
|---|---|---|
| `simulation` | rien | démonstration sans IA, gratuite |
| `ollama` | `OLLAMA_URL`, `OLLAMA_MODELE` | Ollama installé sur l'hôte (`ollama pull qwen3:8b`) ; le texte des cours ne quitte pas la machine |
| `openai` | `OPENAI_API_KEY` | plus rapide (objectif < 5 s) ; les cours sont envoyés à OpenAI (à indiquer dans la politique de confidentialité) |

## 4. HTTPS

nginx sert le site en HTTP sur `PORT_PUBLIC` (8080 par défaut). Sur un serveur accessible
depuis Internet, placer devant un proxy qui gère le certificat TLS, par exemple Caddy :

```
eduquizai.exemple.fr {
    reverse_proxy localhost:8080
}
```

Puis renseigner `ORIGINE_FRONT=https://eduquizai.exemple.fr`. Avec ce proxy supplémentaire,
passer `TRUST_PROXY` à `2` dans `docker-compose.prod.yml` (deux proxys devant l'API), pour
que la limitation des tentatives de connexion voie la vraie adresse des clients.

## 5. Vérifier une installation

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps    # 4 services "healthy"
curl -I http://localhost:8080/                  # 200 + en-tête Content-Security-Policy
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/cours   # 401 attendu
```

Puis, dans un navigateur : créer un compte, un cours, générer un quiz, le valider et
l'exporter.

## 6. Mise à jour

```bash
git pull
./scripts/deployer.sh      # reconstruit les images et remplace les conteneurs
```

Les données sont dans des volumes Docker (`postgres_data`, `mongo_data`) : elles sont
conservées. `db:init` est rejoué à chaque démarrage ; il ne fait que des
`CREATE ... IF NOT EXISTS` et ne supprime rien.

## 7. Sauvegarde et retour arrière

Avant chaque mise à jour, sauvegarder les deux bases. Les scripts de `scripts/` visent la
stack de développement ; pour la production, préciser le fichier et le projet :

```bash
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
UTIL=$(grep '^MONGO_UTILISATEUR=' .env.production | cut -d= -f2)
MDP=$(grep '^MONGO_MOT_DE_PASSE=' .env.production | cut -d= -f2)

$COMPOSE exec -T postgres pg_dump -U eduquizai -d eduquizai --clean --if-exists > sauvegarde.sql
$COMPOSE exec -T mongo mongodump --archive --username "$UTIL" --password "$MDP" \
  --authenticationDatabase admin --db eduquizai > sauvegarde.archive
```

Ces deux commandes ont été vérifiées sur la stack de production (dump SQL des 4 tables,
archive MongoDB produite).

Retour à la version précédente en cas de problème :

```bash
git checkout <version-precedente>
./scripts/deployer.sh
# si les données ont été altérées : restaurer sauvegarde.sql et sauvegarde.archive
```

## 8. Arrêt

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down      # garde les données
docker compose -f docker-compose.prod.yml --env-file .env.production down -v   # SUPPRIME les données
```

## 9. Sécurité de la configuration

- Un seul port publié (nginx) ; l'API et les bases ne sont joignables que sur le réseau
  Docker interne.
- Conteneurs sans droits root : `USER node` pour l'API, image `nginx-unprivileged` pour le front.
- Secrets hors du dépôt (`.env.production` ignoré par Git), aléatoires, en hexadécimal.
- En-têtes ajoutés par nginx : `Content-Security-Policy` (aucun script ni ressource
  externe), `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy` ; version de nginx masquée (`server_tokens off`).
- Scan OWASP ZAP (passif) exécuté dans la CI sur l'API, rapport conservé en artefact.
