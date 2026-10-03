# Corrections du socle EduQuizAI

Les défauts du code existant identifiés dans l'audit ont été corrigés sans développer le module cours/quiz/IA. Le code applicatif et les documents d'origine restent dans le dépôt local ; aucun commit ni publication n'a été effectué.

## Corrections réalisées

- Validation explicite des corps, types, champs vides et longueurs ; limite UTF-8 des mots de passe pour éviter la troncature bcrypt ; suppression des champs supplémentaires avant le service.
- Remplacement du secret JWT local de démonstration par 32 octets aléatoires, sans affichage de sa valeur. Configuration contrôlée avant démarrage, signature et vérification limitées à HS256. Les sessions existantes sont invalidées.
- Inscription concurrente : l'erreur d'unicité email PostgreSQL est traduite en 409 ; aucun contournement de la contrainte SQL.
- Limitation des tentatives d'authentification par IP, compteur mémoire borné et réponse 429 avec Retry-After. Ce mécanisme devra utiliser un stockage partagé en cas de déploiement multi-instance.
- Erreurs 400/413 conservées, erreurs internes sans détail SQL ni corps de requête dans les logs, routes inconnues en JSON 404.
- Séparation de l'application Express et de l'écoute HTTP ; vérification des tables au démarrage, endpoint /pret pour la disponibilité SQL, délais de connexion/requête et arrêt gracieux.
- Initialisation SQL transactionnelle et idempotente, avec verrou pour les démarrages concurrents ; Compose attend son succès. Elle crée les tables manquantes, sans supprimer les données. Les futures modifications de colonnes nécessiteront des migrations.
- Docker : npm ci, utilisateur non privilégié avec droits sur les fichiers nécessaires, .dockerignore excluant les secrets, suppression des ports BDD publiés et écoute front/API limitée à 127.0.0.1.
- Front : gestion d'expiration de session et des 401, erreurs réseau affichées, aucune fausse liste vide, labels associés, indications de saisie, annonces d'erreur, garde contre double soumission, affichage adapté aux petits écrans et document HTML français.
- Le formulaire de cours non implémenté est explicitement désactivé ; l'utilisateur ne peut plus tenter une sauvegarde vouée à échouer.
- Cardinalités et description du fonctionnement SQL/Mongo corrigées dans la conception. README réécrit avec commandes de démarrage, limites et procédure de tests.
- Ajout de tests Jest et d'un workflow CI pour tests, lint, build et construction des images. La CI n'a pas été exécutée sur GitHub.

## Vérifications effectuées

| Contrôle | Résultat |
|---|---|
| npm test dans back | 3 suites, 41 tests réussis |
| Diagnostic des défauts initiaux | 6 cas conformes, 0 écart restant |
| npm run lint dans front | Réussi |
| npm run build dans front | Réussi |
| docker compose config --quiet | Réussi |
| Navigateur Edge sans interface, API simulée | Labels, largeur 320 px, soumission unique, 404 explicite, formulaire désactivé, erreur réseau, déconnexion sur 401 et refus d'un jeton mal formé vérifiés ; aucune erreur JavaScript |

Les tests HTTP utilisent Express, bcrypt et JWT réels, avec dépôts et PostgreSQL simulés. Le test de navigateur utilise une API simulée. Le moteur Docker était arrêté ; le démarrage des images, l'application du SQL et la conservation des données avec une vraie base n'ont pas été exécutés. Une validation de syntaxe Compose ne prouve pas le fonctionnement de toute la stack.

## Commandes utiles

Depuis eduquizai/back : npm run config:init, npm ci, npm test.
Depuis eduquizai/front : npm ci, npm run lint, npm run build.
Depuis eduquizai, avec Docker Desktop démarré : docker compose up --build.

Voir eduquizai/README.md pour les URL, la procédure SQL et le mode sans Docker.

## Reste à réaliser

La gestion des cours, les quiz et l'IA, MongoDB, les tests avec une vraie base, la page de confidentialité et les autres livrables métier/documentaires restent à réaliser. Le stockage du jeton reste en localStorage : une injection JavaScript pourrait toujours l'exposer. Aucun audit RGAA complet ni scan de dépendances n'a été réalisé. Compose reste une configuration de développement ; la sécurité et l'exploitation en production nécessitent un travail distinct.

Le versionnement reste à finaliser : les sources étaient non suivies au début de l'intervention et aucun commit n'a été créé. Ne pas effectuer un ajout Git global sans examiner les documents déplacés et les fichiers locaux parasites. Les fichiers .env, node_modules, dist et caches sont exclus.
