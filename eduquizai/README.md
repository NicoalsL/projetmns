# EduQuizAI

Application pédagogique du projet CDA. Les comptes et les cours sont utilisables : inscription, connexion, création, liste, consultation et suppression de ses propres cours. Les quiz sont générés à partir d'un cours (QCM, vrai/faux, questions ouvertes), relus, modifiés, validés par l'enseignant puis exportés en JSON. La génération utilise un modèle d'IA local (Ollama), OpenAI ou un mode simulation sans IA.

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
- Disponibilité PostgreSQL (avec schéma) et MongoDB : http://localhost:3000/pret

PostgreSQL et MongoDB restent sur le réseau Docker. Les ports front/API sont publiés uniquement sur 127.0.0.1. Les identifiants fixes de PostgreSQL et MongoDB sans authentification sont réservés au développement local.

## Utiliser l'application

Créer un compte, puis choisir « Nouveau cours ». Le texte peut être saisi en Markdown (aperçu intégré) ou importé depuis un fichier .txt ou .md (lu dans le navigateur, 200 ko maximum). Un titre de 1 à 200 caractères et un texte de 1 à 50 000 caractères sont requis. Après l'enregistrement, le détail s'affiche. Le cours reste disponible après déconnexion/reconnexion. La suppression se fait depuis son détail et nécessite une confirmation.

Un enseignant ne peut ni consulter ni supprimer un cours d'un autre compte. L'API répond 404 aussi bien pour un cours absent que non autorisé. Depuis le détail d'un cours, « Générer un quiz » crée un brouillon de 3 à 10 questions. L'enseignant le relit, le modifie si besoin, le valide, puis l'exporte en JSON. Toute modification repasse le quiz en brouillon. Voir docs/guide-utilisateur.md.

## API des cours

Toutes les routes requièrent Authorization: Bearer suivi d'un JWT valide.

| Méthode | Route | Résultat |
|---|---|---|
| POST | /api/cours | 201, cours créé ; corps titre et contenuTexte |
| GET | /api/cours | 200, liste des résumés du propriétaire |
| GET | /api/cours/:id | 200, détail avec contenu_texte ; sinon 404 |
| PUT | /api/cours/:id | 200, titre et contenuTexte remplacés (mêmes règles qu'à la création) ; sinon 404 |
| DELETE | /api/cours/:id | 204 sans contenu ; sinon 404 |

Les erreurs de saisie renvoient 400, les jetons invalides 401 et les requêtes excessives en taille 413. L'auteur est toujours issu du JWT. Le texte est stocké comme texte et rendu par React sans interpréter le HTML. La liste n'est pas paginée ; la recherche et le tri de « Mes cours » se font dans le navigateur (titres et dates seulement). Modifier un cours ne change pas les quiz déjà générés.

## Génération des quiz par IA

Le fournisseur est choisi par IA_FOURNISSEUR dans back/.env :

| Valeur | Effet |
|---|---|
| simulation (défaut) | Questions fabriquées à partir des phrases du cours, sans IA ni coût. Les quiz sont marqués « simulation » dans l'interface et l'export. |
| ollama | Modèle local servi par Ollama sur la machine hôte (OLLAMA_URL, défaut http://host.docker.internal:11434 ; OLLAMA_MODELE, défaut qwen3:8b). Gratuit, aucun texte envoyé à un tiers. Prérequis : Ollama démarré et `ollama pull qwen3:8b`. Mesuré : environ 20 à 35 s pour 3 à 4 questions, 58 s pour 6 (premier appel plus long : chargement du modèle). |
| openai | Appel à l'API OpenAI (chat/completions, sortie JSON imposée par schéma). Exige OPENAI_API_KEY ; modèle réglable par OPENAI_MODELE (gpt-4o-mini par défaut). |

Après modification de .env : docker compose up -d back. La clé OpenAI reste côté serveur et n'est jamais envoyée au navigateur. Chaque appel est tracé dans la table generation_ia (statut, durée, nombre de questions). La réponse de l'IA est contrôlée par back/src/utilitaires/questions.js avant tout enregistrement ; une réponse non conforme est traitée comme un échec (502).

## Données utilisées pour générer un quiz

| Donnée | Source | Rôle |
|---|---|---|
| Texte du cours | Base PostgreSQL (jamais envoyé par le client) | Seule source autorisée des questions ; 300 caractères et 3 phrases minimum, sinon l'IA invente hors cours |
| Nombre de questions | Formulaire (3 à 10) | Borne le coût et la durée |
| Types de questions | Cases à cocher | Répartition calculée côté serveur (ex. 5 sur 3 types : 2 QCM, 2 vrai/faux, 1 ouverte), imposée à l'IA puis appliquée à sa réponse ; un type non choisi n'est jamais conservé |
| Niveau des élèves | Liste fermée, facultatif | Adapte vocabulaire et complexité |
| Difficulté | Liste fermée | Restitution (facile), compréhension (moyenne), raisonnement (difficile) |

Les listes fermées empêchent d'injecter du texte libre dans les consignes de l'IA. Les paramètres sont conservés dans le quiz ; si l'IA n'a pas respecté la répartition, la page du quiz l'indique.

## API des quiz

Toutes les routes requièrent un JWT. Un quiz d'un autre enseignant répond 404.

| Méthode | Route | Résultat |
|---|---|---|
| POST | /api/cours/:id/quiz | 201, brouillon généré ; corps facultatif : nombreQuestions (3 à 10, défaut 5), types (liste parmi qcm, vrai_faux, ouverte ; défaut les trois), niveau (primaire, college, lycee, superieur ou null), difficulte (facile, moyen, difficile ; défaut moyen) ; 400 si le cours fait moins de 300 caractères ou 3 phrases ; 502 si l'IA échoue ; 429 au-delà de 10 générations par heure |
| GET | /api/cours/:id/quiz | 200, résumés des quiz du cours |
| GET | /api/quiz/:idQuiz | 200, quiz complet |
| PUT | /api/quiz/:idQuiz | 200, titre et questions remplacés ; retour en brouillon ; 400 avec le numéro de la question invalide |
| POST | /api/quiz/:idQuiz/validation | 200, statut valide |
| GET | /api/quiz/:idQuiz/export | 200, fichier JSON (ou CSV avec ?format=csv) ; 409 tant que le quiz n'est pas validé |
| POST | /api/quiz/:idQuiz/questions/:numero/regeneration | 200, la question n° numero (à partir de 0) est remplacée par une nouvelle du même type ; retour en brouillon ; compte dans les 10 générations par heure |
| POST | /api/quiz/:idQuiz/questions/:numero/correction | 200, avis de l'IA { appreciation, commentaire } sur une réponse rédigée ; corps { reponse } ; questions ouvertes uniquement ; 30 par heure ; rien n'est enregistré |
| DELETE | /api/quiz/:idQuiz | 204 |

La suppression d'un cours supprime aussi ses quiz MongoDB. GET /api/cours/:id/generations renvoie les 20 dernières entrées du journal generation_ia du cours.

Chaque question générée porte une citation du cours (`source`) qui justifie sa réponse. Le serveur vérifie qu'elle figure vraiment dans le cours (`source_trouvee`) ; si ce n'est pas le cas, l'interface demande à l'enseignant de vérifier la question en priorité. L'export CSV (séparateur « ; », encodage UTF-8 lisible par Excel) neutralise les cellules qui commenceraient par une formule (=, +, -, @). Le PDF s'obtient par « Imprimer ou enregistrer en PDF » : la feuille d'impression n'imprime que le quiz.

L'enseignant peut aussi **tester son quiz** (/quiz/:id/essai) : une question à la fois, correction immédiate, score final ; pour une question ouverte, il s'évalue lui-même, avec l'avis facultatif de l'IA.

## Compte et RGPD

- L'inscription exige consentementRgpd: true (case à cocher, jamais pré-cochée) ; la date du consentement est enregistrée.
- DELETE /api/compte avec le corps { motDePasse } supprime le compte, ses cours, son journal (cascade SQL) et ses quiz (MongoDB) : 204 ; 403 si le mot de passe est faux ; 5 essais par quart d'heure.
- POST /api/compte/deconnexion révoque toutes les sessions du compte (tous les appareils) : 204. Le bouton « Se déconnecter » l'appelle avant de vider la session du navigateur.
- Le journal generation_ia et le journal de sécurité (connexions réussies ou échouées, suppressions de compte, exports ; ni email ni adresse IP) sont purgés au démarrage puis chaque jour au-delà de 6 mois.
- La page /confidentialite (lien en pied de page) détaille données, finalités, durées, destinataires et droits.

## Jeu d'essai, sauvegarde et restauration

Depuis eduquizai, stack démarrée :

~~~sh
docker compose exec -T back node scripts/jeu-essai.js   # données de démonstration, rejouable
./scripts/sauvegarder.sh                                # PostgreSQL + MongoDB -> sauvegardes/AAAA-MM-JJ_HHMMSS/
./scripts/restaurer.sh sauvegardes/AAAA-MM-JJ_HHMMSS    # demande confirmation
~~~

Compte de démonstration : claire.martin@demo.eduquizai.test / Demo-EduQuizAI-2026 (développement uniquement). Le jeu d'essai ne touche qu'aux comptes en @demo.eduquizai.test. Les sauvegardes contiennent des données personnelles : le dossier sauvegardes/ est exclu de Git. La restauration a été vérifiée en supprimant les cours et quiz de démonstration puis en restaurant la sauvegarde (3 cours et 1 quiz retrouvés).

## Tests

Depuis back :

~~~sh
npm ci
npm test
~~~

Les tests Jest vérifient validation, configuration, authentification HTTP, requêtes SQL paramétrées, contrôle de propriété, module IA (API OpenAI simulée : jamais d'appel réel) et cycle de vie des quiz. Les bases sont simulées dans cette suite.

Pour tester sur la vraie stack Docker :

~~~sh
docker compose exec -T back npm run test:reel
docker compose exec -T back npm run test:reel:quiz
~~~

À lancer depuis eduquizai. Le script crée deux comptes synthétiques uniques, vérifie 19 résultats sur l'API et PostgreSQL, puis nettoie uniquement ses comptes et cours, même en cas d'échec. Il vérifie notamment une reconnexion, un texte de plus de 16 ko et le refus des accès entre comptes. Le second script vérifie 24 résultats sur le cycle complet d'un quiz (génération, journal SQL, document MongoDB, isolation, export refusé puis autorisé, modification, suppression en cascade).

Depuis front (fonctions sans React avec le lanceur de Node, puis composants React avec Vitest et jsdom) :

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

Les mots de passe doivent contenir au moins 8 caractères à l'inscription et ne pas dépasser 72 octets UTF-8. Les emails sont enregistrés en minuscules et recherchés sans tenir compte de la casse (les comptes créés avant restent accessibles). La connexion exécute toujours bcrypt, même pour un email inconnu : le temps de réponse ne révèle pas quels comptes existent. Le limiteur d'authentification est en mémoire : 20 requêtes par IP sur 15 minutes ; derrière nginx, TRUST_PROXY lui donne la vraie adresse du client. Plusieurs instances de l'API nécessiteraient des compteurs partagés (Redis par exemple).

Les JWT restent en localStorage ; la vérification d'expiration dans le navigateur ne remplace jamais le contrôle serveur. Chaque requête protégée compare la version de session du jeton à celle du compte : un jeton est refusé après une déconnexion ou la suppression du compte, même s'il n'a pas expiré. Un changement de compte dans un autre onglet recharge les données affichées. Les cours supprimés emportent leurs générations SQL par cascade et leurs quiz MongoDB ; sans transaction commune aux deux bases, un échec MongoDB à cette étape est journalisé et les quiz restent rattachés à leur propriétaire.

Le texte d'un cours est transmis à l'IA comme une donnée délimitée, avec consigne d'ignorer les instructions qu'il contiendrait (injection de prompt) ; les balises de délimitation écrites dans le cours sont retirées. Cette précaution ne suffit pas seule : la réponse est validée strictement (une question non conforme est écartée), chaque citation du cours est vérifiée, et tout quiz doit être relu et validé par l'enseignant avant export. La génération réelle avec OpenAI n'a été vérifiée qu'avec une API simulée ; elle reste à tester avec une vraie clé, notamment le critère de moins de 5 secondes.

`docker-compose.yml` est une configuration de développement. La configuration proche de la production est `docker-compose.prod.yml` (build statique servi par nginx, CSP, secrets propres, MongoDB authentifié, aucune base exposée) ; le HTTPS se place devant, par un proxy comme Caddy (voir `docs/deploiement.md`).

Les documents confidentiels dans instructction/, les secrets, caches et dépendances locales sont exclus par .gitignore. Aucun document confidentiel ni secret ne doit être envoyé à un dépôt distant. Le premier commit historique contenait des pièces originales : la présente exclusion ne les efface pas de l'historique.

## Déploiement (configuration de production)

`docker-compose.prod.yml` sert le front construit par nginx (seul port publié, en-têtes de
sécurité dont une CSP stricte), l'API sans rechargement automatique et MongoDB protégé par
mot de passe. Secrets dans `.env.production` (modèle : `.env.production.example`).

~~~sh
cp .env.production.example .env.production   # puis remplir les secrets (openssl rand -hex 32)
./scripts/deployer.sh                        # construit, démarre, attend les healthchecks, vérifie
~~~

Procédure complète (HTTPS, mise à jour, sauvegarde, retour arrière) : `docs/deploiement.md`.
