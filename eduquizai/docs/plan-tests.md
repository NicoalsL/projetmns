# Plan de tests — authentification et cours

Les tests accompagnent le parcours enseignant de cette étape. Les quiz sont couverts par la seconde partie de ce document. La conformité RGAA complète et un déploiement public ne sont pas couverts.

| Niveau | Scénarios | Exécution | Attendu |
|---|---|---|---|
| Backend avec pool simulé | Validation, JWT, erreurs, SQL paramétré et propriétaire | back : npm test | réussite (voir total plus bas) |
| Front, fonctions et composants | Session (horloge simulée), recherche et tri des cours, règles du mode essai ; composants React (lecture d'une question, éditeur, formulaire de cours avec aria-invalid) | front : npm test (Node puis Vitest + jsdom) | 15 + 23 tests réussis |
| API et PostgreSQL réels | Deux comptes, création, reconnexion, liste isolée, accès et suppression interdits, suppression propriétaire | docker compose exec -T back npm run test:reel | 19 vérifications réussies ; données synthétiques nettoyées |
| Build et qualité front | JSX, imports, règles de lint | front : npm run lint puis npm run build | Réussite |
| Navigateur, base réelle | Inscription, création, détail, annulation, reconnexion, changement de compte, confirmation de suppression | Parcours manuel décrit ci-dessous | Résultats visibles cohérents et aucun accès croisé |

## Jeu d'essai représentatif

Le script scripts/verifier-cours-reel.js génère deux adresses uniques sous example.test et un mot de passe aléatoire. Il ne réutilise aucun compte réel. Le cours du compte A contient un titre avec caractères SQL/HTML et un texte de plus de 16 ko.

- Création avec un faux id_utilisateur dans le corps : 201, auteur réel A vérifié directement en base.
- Reconnexion A : 200, texte du cours identique.
- Liste B : vide ; lecture/suppression du cours A avec B : 404.
- Lecture A après tentative B : toujours 200.
- Identifiant injecté, titre blanc ou texte trop long : 400.
- Suppression A : 204, puis lecture 404 et liste vide.

Obtenu localement : les 19 assertions passent sur PostgreSQL 16 dans Docker. Les tests Jest vérifient séparément les requêtes trop volumineuses (413), l'absence de JWT (401), les types invalides et les limites des champs.

## Parcours navigateur de recette

Avec deux comptes A/B, créer un cours contenant des balises script en texte ; vérifier que les balises s'affichent sans exécution. À 320 px de largeur, vérifier l'absence de débordement avec un titre long. Annuler une suppression, se reconnecter et retrouver le cours. Changer le compte dans un autre onglet : les données A ne doivent plus apparaître sous B. Une URL directe du cours A sous B doit afficher une erreur et aucun bouton de suppression. Revenir à A, confirmer la suppression et recharger la liste vide.

Ce parcours a été exécuté automatiquement localement dans Edge sur la vraie stack, puis les deux comptes synthétiques ont été nettoyés. Le script d'audit local utilise le runtime navigateur de l'environnement de travail ; la CI utilise le parcours API reproductible et les tests de session, sans prétendre exécuter cette recette navigateur.

## Précautions de test

Ne jamais supprimer les volumes pour rejouer un test. Le script réel nettoie seulement les adresses aléatoires qu'il vient de générer. La CI utilise une base PostgreSQL éphémère distincte. Les résultats ne constituent pas une mesure de couverture exhaustive du projet.

# Vérification de la génération et du cycle de vie des quiz

| Niveau | Scénarios | Exécution | Attendu |
|---|---|---|---|
| Règles des questions | 3 types acceptés, champs inconnus retirés, 13 formes invalides refusées avec le numéro de la question | back : npm test (questions.test.js) | Réussite |
| Module IA, OpenAI simulé | Clé côté serveur, schéma JSON strict, questions en trop coupées ; délai, réseau, HTTP 429, refus, texte non JSON, JSON non conforme -> erreur codée ; consignes anti-injection | back : npm test (ia.test.js) | Réussite, aucun appel réel |
| Routes quiz, dépôts simulés | 401 sans jeton, brouillon rattaché au JWT, journal succès/échec avec durée, 502 générique, 404 sur cours d'autrui sans appel IA, nombre de questions invalide, limite de 10 générations/heure, id MongoDB invalide ou injecté, modification -> brouillon, export 409 puis 200 | back : npm test (quiz.integration.test.js) | Réussite |
| API, PostgreSQL et MongoDB réels | Cycle complet ci-dessous | docker compose exec -T back npm run test:reel:quiz | 24 vérifications réussies ; données de test nettoyées |

Total back : 8 suites, 174 tests (dont compte, RGPD, fournisseur Ollama simulé, répartition des types, niveau, difficulté et contenu minimal).

## Jeu d'essai représentatif : génération d'un quiz

Fonctionnalité la plus représentative du projet. Script : back/scripts/verifier-quiz-reel.js (fournisseur simulation).

| Étape | Donnée en entrée | Attendu | Obtenu |
|---|---|---|---|
| Génération | Cours « La photosynthèse » (5 phrases), nombreQuestions = 6, compte A | 201, statut brouillon, 6 questions, 3 types présents | Conforme ; durée mesurée 3 ms en simulation |
| Journal SQL | id du cours | 1 ligne generation_ia : succes, 6 questions demandées | Conforme |
| Document MongoDB | id du cours | 1 document, id_utilisateur = A | Conforme |
| Isolation | Lecture du quiz et génération sur le cours de A avec le jeton de B | 404 et 404 | Conforme |
| Export d'un brouillon | GET /export par A | 409 | Conforme |
| Validation puis export | POST /validation puis GET /export | statut valide ; 200, pièce jointe, 6 questions | Conforme |
| Modification | Énoncé de la question 1 corrigé | 200, retour en brouillon, énoncé enregistré | Conforme |
| Suppression du cours | DELETE /api/cours/:id | 204, plus aucun quiz MongoDB pour ce cours | Conforme |

Analyse des écarts : aucun écart sur le parcours simulé. Écart restant à mesurer : le critère « moins de 5 s » du CDC ne peut être évalué qu'avec une vraie clé OpenAI (IA_FOURNISSEUR=openai) ; la durée de chaque appel sera alors lue dans generation_ia.duree_ms.

## Mesures avec l'IA locale (Ollama, qwen3:8b)

| Mesure | Résultat | Écart avec le CDC (< 5 s pour un quiz simple) |
|---|---|---|
| 3 questions, modèle déjà chargé | 20,6 s | +15,6 s |
| 4 questions | 34,8 s | +29,8 s |
| 6 questions, parcours réel complet (24 vérifications réussies) | 57,8 à 59,4 s | +53 s |

Analyse : le critère de 5 s n'est pas atteignable avec un modèle de 8 milliards de paramètres exécuté localement sur le poste de développement. Choix assumé : gratuité et confidentialité des cours (aucun envoi à un tiers) plutôt que vitesse. Pistes : modèle plus petit (qwen3:4b, à évaluer en qualité), serveur avec carte graphique plus puissante, ou fournisseur OpenAI (IA_FOURNISSEUR=openai), dont la durée reste à mesurer avec une vraie clé. Chaque durée réelle est enregistrée dans generation_ia et visible dans l'historique de la page du cours.

Qualité observée : questions pertinentes et réponses exactes sur les cours d'essai ; une faute de frappe produite par le modèle (« proclamatio ») illustre la nécessité de la relecture humaine avant validation.

## Sauvegarde et restauration (incident simulé)

| Étape | Attendu | Obtenu |
|---|---|---|
| Jeu d'essai chargé | 3 cours et 1 quiz de démonstration | 3 et 1 |
| ./scripts/sauvegarder.sh | postgres.sql et mongo.archive non vides | 11,6 ko et 2,7 ko |
| Incident : suppression des cours (SQL) et du quiz (MongoDB) de démonstration | 0 et 0 | 0 et 0 |
| CONFIRMER=oui ./scripts/restaurer.sh <dossier> | 3 cours et 1 quiz ; API toujours prête | 3 et 1 ; /pret répond « pret » |

## Paramètres de génération et contenu minimal (vérification réelle, API + Ollama)

| Cas | Entrée | Attendu | Obtenu |
|---|---|---|---|
| Cours trop court | Cours « La cellule. » | 400, aucun appel IA, rien au journal | 400 « trop court… », 0 entrée au journal |
| Avant correction (pour mémoire) | Même cours, 3 questions | Questions issues du cours | Écart : 3 questions inventées (noyau, mitochondries, ribosomes) absentes du cours |
| Types restreints | Cours de 6 phrases, 4 questions, types [qcm], collège, facile | 4 QCM portant sur le cours | 4 QCM corrects, paramètres stockés ; 42,9 s |
| Combinaison | Même cours, 4 questions, [vrai_faux, ouverte], lycée, difficile | 2 vrai/faux + 2 ouvertes | 2 + 2 ; 31,9 s |
| Paramètres invalides | types vide, inconnu, en double ; niveau ou difficulté hors liste ; texte libre dans niveau | 400 sans appel IA | Couvert par les tests Jest |

Analyse : la répartition est respectée et les réponses sont exactes. Deux limites relevées : avec un modèle de 8 milliards de paramètres, l'effet de la difficulté reste modeste (questions « difficiles » proches de questions de compréhension), et une affirmation vrai/faux extrapolait légèrement le cours (« seule planète à avoir de l'eau liquide »). La relecture humaine avant validation reste donc indispensable.

# Fonctions ajoutées le 3 octobre 2026 (soir)

## Tests automatisés

| Composant | Cas vérifiés | Fichier |
|---|---|---|
| Modification d'un cours | Propriétaire filtré dans la requête UPDATE, cours d'autrui 404, titre vide refusé avant SQL | `back/tests/cours.integration.test.js` |
| Export CSV | En-tête, une ligne par question, bonne réponse en clair, guillemets doublés, **injection de formules neutralisée** (=, +, -, @), format inconnu refusé (400) | `back/tests/csv.test.js`, `quiz.integration.test.js` |
| Citations du cours | Citation retrouvée malgré casse et ponctuation ; citation inventée signalée (`source_trouvee: false`) | `back/tests/ia.test.js` |
| Régénération d'une question | Question remplacée, même type, énoncés existants transmis à l'IA, retour en brouillon, journal à 1 question ; numéro hors du quiz 404 ; numéro mal formé 400 | `back/tests/quiz.integration.test.js` |
| Correction d'une réponse ouverte | Avis renvoyé sans rien enregistrer ; question non ouverte 400 ; réponse vide, absente ou trop longue 400 ; échec de l'IA 502 générique ; balises retirées de la réponse (injection de prompt) ; avis hors format refusé | `ia.test.js`, `quiz.integration.test.js` |
| Journal de sécurité | Requête paramétrée, compte inconnu enregistré à null, panne du journal sans effet sur l'action, purge à 6 mois ; connexions réussies et échouées tracées | `back/tests/journalSecurite.test.js`, `auth.integration.test.js` |
| Configuration | TRUST_PROXY accepté (1) ou refusé (texte, valeur démesurée) | `back/tests/securite.test.js` |
| Prompt | Balises `</cours>` écrites dans un cours retirées | `back/tests/ia.test.js` |

Totaux au 4 octobre 2026 : **back 255 tests** (13 suites, Jest 30), front 15 tests Node + 23 tests de composants (Vitest), tous réussis. Sur base réelle : `test:reel` 19, `test:reel:quiz` 24 et `verifier-coherence-reelle.js` 27 vérifications réussies.

## Vérification de la configuration de production (stack réelle, navigateur)

Stack `docker-compose.prod.yml` démarrée par `scripts/deployer.sh`, puis parcours complet
piloté dans Edge (Playwright), CSP active :

| Étape | Attendu | Obtenu |
|---|---|---|
| Inscription, création et modification d'un cours à travers nginx | Pages fonctionnelles, un seul `<h1>` malgré un « # » dans le Markdown | Conforme |
| Génération (simulation) | Citations affichées et retrouvées dans le cours | Conforme, aucune alerte « citation introuvable » |
| Régénération de la question 1 | Énoncé différent, message de relecture | Conforme |
| Export | Bouton désactivé avant validation, fichier CSV après | Conforme (`quiz-<id>.csv`, en-tête UTF-8) |
| Tester le quiz | Correction immédiate, avis de l'IA sur la question ouverte, score | Conforme (score 4/5) |
| Recherche « PHOTOSYNTHESE » puis « histoire » | 1 cours, puis aucun | Conforme |
| Console du navigateur | Aucune violation de la CSP | Aucune erreur |
| axe-core + identifiants en double | 0 défaut | 0 défaut |

Écart trouvé et corrigé pendant cette vérification : le champ « Contenu du cours » et la zone
de contenu de la page portaient le même identifiant `contenu` ; l'étiquette du champ ne lui
était plus reliée (régression d'accessibilité invisible dans les tests de composants, qui
rendent le formulaire seul). Le champ s'appelle désormais `contenu-cours`, et le parcours
navigateur contrôle les identifiants en double sur chaque page.

## Scan de sécurité OWASP ZAP (passif)

`zap-baseline.py` (image `ghcr.io/zaproxy/zaproxy:stable`) sur la stack de production :

| Passage | Échecs | Réussis | Avertissements |
|---|---:|---:|---:|
| Premier scan | 0 | 63 | 4 |
| Après ajout des en-têtes d'isolation (COOP, COEP, CORP) | **0** | **64** | 3 |

Avertissements restants, analysés et acceptés : « Storable and Cacheable Content » (cache
voulu des fichiers statiques à empreinte), « Modern Web Application » (simple information :
application monopage), « Suspicious Comments » (mots comme *user* dans les bibliothèques
minifiées). Le même scan tourne dans la CI sur l'API, rapport conservé en artefact.

## Vérifications réelles de non-régression

Après ces ajouts, sur la stack de développement : `test:reel` 19 vérifications réussies,
`test:reel:quiz` 24 vérifications réussies (génération Ollama réelle de 6 questions en
32,6 s, au-delà de l'objectif de 5 s du CDC : limite connue de l'IA locale).

## Écart trouvé par un test sur base réelle (3 octobre 2026, soir)

| Entrée | Attendu | Obtenu avant correction | Après correction |
|---|---|---|---|
| Génération d'un quiz (journal `generation_ia` avec état de livraison) | 201, quiz créé | 500 : PostgreSQL refuse la requête (« inconsistent types deduced for parameter $1 ») | 201 ; 27 vérifications de cohérence réussies |

Analyse : le paramètre `$1` servait à la fois de valeur de colonne et de terme de comparaison ;
PostgreSQL ne savait pas quel type lui donner. Les 236 tests Jest passaient, car ils simulent la
base : seul le script sur vraie base l'a révélé. Correction : `$1::varchar`, et un test de
non-régression (`back/tests/generationIa.depot.test.js`). Leçon retenue : un test à base simulée
vérifie la logique, pas la validité SQL ; les deux niveaux de tests sont nécessaires.

## Révocation des sessions et erreurs de l'éditeur (4 octobre 2026)

| Cas | Attendu | Obtenu (API et navigateur réels) |
|---|---|---|
| Deux sessions ouvertes, puis « Se déconnecter » sur l'une | Les deux jetons, non expirés, refusés | 401 et 401 |
| Nouvelle connexion après la déconnexion | Accès rétabli | 200 |
| Compte supprimé, jeton encore non expiré | Refusé | 401 |
| Jeton émis avant la révocation (sans version) | Accepté tant que le compte n'a pas été déconnecté | Testé (`session.test.js`) |
| Base injoignable pendant le contrôle | Erreur 500, pas de déconnexion à tort | Testé (`session.test.js`) |
| Quiz enregistré avec deux choix identiques à la question 2 | Message « Question 2 : … », seuls ces champs marqués et reliés au message | Conforme (Edge) |
