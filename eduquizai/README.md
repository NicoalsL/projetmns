# EduQuizAI

Application pédagogique du projet CDA. Les comptes et les cours sont utilisables : inscription, connexion, création, liste, consultation et suppression de ses propres cours. La génération IA et le cycle de vie des quiz restent à développer.

## Démarrer en local

Prérequis : Node.js 22 ou supérieur et Docker Desktop avec moteur Linux démarré.

Depuis eduquizai/back :

~~~sh
npm run config:init
~~~

Cette commande crée back/.env et génère un secret JWT aléatoire si nécessaire. Un secret valide existant est conservé. Ne jamais versionner .env. Un remplacement du secret invalide les anciennes sessions.

Depuis eduquizai :

~~~sh
docker compose up -d --build --wait
~~~

Le service db-init attend PostgreSQL puis applique le schéma dans une transaction avec verrou d'initialisation, sans suppression de données existantes. Le backend vérifie la présence des tables avant de démarrer. Le front attend son état prêt.

- Application : http://localhost:5173
- Santé du processus API : http://localhost:3000/sante
- Disponibilité PostgreSQL et schéma : http://localhost:3000/pret

PostgreSQL et MongoDB restent sur le réseau Docker. Les ports front/API sont publiés uniquement sur 127.0.0.1. Les identifiants fixes de PostgreSQL et MongoDB sans authentification sont réservés au développement local ; MongoDB n'est pas encore utilisé.

## Utiliser l'application

Créer un compte, puis choisir « Nouveau cours ». Un titre de 1 à 200 caractères et un texte de 1 à 50 000 caractères sont requis. Après l'enregistrement, le détail s'affiche. Le cours reste disponible après déconnexion/reconnexion. La suppression se fait depuis son détail et nécessite une confirmation.

Un enseignant ne peut ni consulter ni supprimer un cours d'un autre compte. L'API répond 404 aussi bien pour un cours absent que non autorisé. La génération de quiz n'est pas encore proposée. Voir docs/guide-utilisateur.md.

## API des cours

Toutes les routes requièrent Authorization: Bearer suivi d'un JWT valide.

| Méthode | Route | Résultat |
|---|---|---|
| POST | /api/cours | 201, cours créé ; corps titre et contenuTexte |
| GET | /api/cours | 200, liste des résumés du propriétaire |
| GET | /api/cours/:id | 200, détail avec contenu_texte ; sinon 404 |
| DELETE | /api/cours/:id | 204 sans contenu ; sinon 404 |

Les erreurs de saisie renvoient 400, les jetons invalides 401 et les requêtes excessives en taille 413. L'auteur est toujours issu du JWT. Le texte est stocké comme texte et rendu par React sans interpréter le HTML. La liste n'est pas encore paginée ; l'édition d'un cours n'est pas incluse dans cette étape.

## Tests

Depuis back :

~~~sh
npm ci
npm test
~~~

Les tests Jest vérifient validation, configuration, authentification HTTP, requêtes SQL paramétrées et contrôle de propriété. Le pool SQL est simulé dans cette suite.

Pour tester sur la vraie stack Docker :

~~~sh
docker compose exec -T back npm run test:reel
~~~

À lancer depuis eduquizai. Le script crée deux comptes synthétiques uniques, vérifie 19 résultats sur l'API et PostgreSQL, puis nettoie uniquement ses comptes et cours, même en cas d'échec. Il vérifie notamment une reconnexion, un texte de plus de 16 ko et le refus des accès entre comptes.

Depuis front :

~~~sh
npm ci
npm test
npm run lint
npm run build
~~~

Les tests de session utilisent une horloge simulée pour contrôler le renouvellement depuis un autre onglet, son expiration et le nettoyage des minuteurs. La CI exécute les suites, initialise un PostgreSQL isolé, lance le parcours réel, vérifie le front et construit les images. Elle ne déploie rien.

## Exploitation de développement

~~~sh
docker compose ps
docker compose logs db-init back front
docker compose exec postgres psql -U eduquizai -d eduquizai
~~~

Réappliquer le schéma : docker compose run --rm db-init. CREATE IF NOT EXISTS ne remplace pas des migrations pour de futures modifications de colonnes. Ne pas supprimer les volumes pour mettre à jour le code.

Les sources sont montées en lecture seule. Le backend utilise node --watch sans option de chargement .env dans Docker : Compose injecte déjà l'environnement. Vite active le polling dans Docker pour détecter les changements de fichiers depuis Windows. Les changements de dépendances, scripts ou configuration nécessitent une reconstruction.

Le Dockerfile backend installe uniquement les dépendances d'exécution ; Jest reste disponible sur l'hôte et dans la CI. Les .dockerignore excluent les secrets, dépendances locales et builds.

## Backend hors Docker

Depuis back, installer les dépendances, exécuter npm run config:init, adapter DATABASE_URL vers une instance PostgreSQL accessible, puis npm run db:init et npm run dev. Le nom d'hôte postgres de l'exemple est interne à Docker. Les scripts locaux chargent .env ; les variables déjà définies restent prioritaires.

Depuis front, npm run dev utilise http://localhost:3000 par défaut. VITE_API_URL et ORIGINE_FRONT doivent correspondre aux adresses utilisées si elles sont modifiées.

## Limites et sécurité

Les mots de passe doivent contenir au moins 8 caractères à l'inscription et ne pas dépasser 72 octets UTF-8. Les emails conservent leur casse pour préserver les comptes existants. Le limiteur d'authentification est en mémoire : 20 requêtes par IP sur 15 minutes. Plusieurs instances nécessiteraient des compteurs partagés et une configuration explicite du proxy.

Les JWT restent en localStorage ; la vérification d'expiration dans le navigateur ne remplace jamais le contrôle serveur. Un changement de compte dans un autre onglet recharge les données affichées. Les cours supprimés emportent leurs générations SQL par cascade ; la future intégration MongoDB devra traiter explicitement les quiz associés.

Cette configuration n'est pas un déploiement de production. Restent notamment HTTPS, secrets propres à l'environnement, sauvegardes/restauration, authentification MongoDB si utilisé et service statique du build front.

Les documents confidentiels dans instructction/, les secrets, caches et dépendances locales sont exclus par .gitignore. Aucun document confidentiel ni secret ne doit être envoyé à un dépôt distant. Le premier commit historique contenait des pièces originales : la présente exclusion ne les efface pas de l'historique.
