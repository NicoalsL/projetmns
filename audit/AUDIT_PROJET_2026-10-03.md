# Audit du projet EduQuizAI

> État historique avant corrections. Plusieurs constats ont été corrigés depuis cet audit ; voir [CORRECTIONS_2026-10-03.md](CORRECTIONS_2026-10-03.md). Le pourcentage ci-dessous n’a pas été recalculé après les corrections.

Date : 3 octobre 2026. Périmètre : copie locale de projetmns, code, configuration, documentation, cahier des charges et contenu textuel des dossiers CDA.

**Avancement global estimé : 26 %, avec une fourchette de jugement de 20 à 30 %.** Le socle de conception et l'authentification existent. Le parcours principal de génération de quiz n'est pas implémenté. Le projet n'est pas prêt pour une livraison ni une démonstration complète.

Ce chiffre est une estimation pondérée de réalisation, pas un taux de couverture de tests, une mesure de temps consommé ou une probabilité de réussite à l'examen. Les pondérations sont celles de cet audit et peuvent être adaptées au périmètre validé avec le formateur.

## Calcul de réalisation

Référence : MVP décrit dans ROADMAP.md et FONCTIONNALITES.md, complété par les livrables de projet. Une intention documentaire et un fichier ne contenant que des commentaires ne comptent pas comme une fonctionnalité implémentée. Les parties non testées en intégration ne sont pas créditées à 100 %.

| Domaine | Poids | Réalisation estimée | Contribution | Justification |
|---|---:|---:|---:|---|
| Analyse, architecture et conception des données | 15 % | 75 % | 11,25 points | Cas d'utilisation, maquettes textuelles, architecture, MCD/MLD, SQL ; incohérences et séquence manquante |
| Authentification et protections associées | 10 % | 70 % | 7 points | Chaîne complète codée, JWT et bcrypt ; validation, secret et protection contre les tentatives répétées à corriger |
| Gestion des cours | 15 % | 10 % | 1,5 point | Table et formulaire présents ; aucune route métier implémentée |
| IA, quiz, MongoDB et journal des générations | 20 % | 0 % | 0 point | Uniquement squelettes, pas de parcours ni de persistance |
| Interfaces et accessibilité | 10 % | 35 % | 3,5 points | Trois pages ; écran quiz absent, formulaires et états d'erreur incomplets |
| Tests et preuves qualité | 10 % | 0 % | 0 point | Aucun test de projet, plan de tests ou collection Postman trouvé ; déclarations historiques seulement |
| Environnement, Git et déploiement | 10 % | 25 % | 2,5 points | Docker de développement et lockfiles présents ; code non suivi, CI et initialisation SQL absentes |
| Dossiers finaux, guide utilisateur et soutenance | 10 % | 5 % | 0,5 point | Trames Word disponibles ; contenu final et diaporama absents |
| **Total** | **100 %** | | **26,25 points** | **Arrondi : 26 %** |

Le sous-ensemble fonctionnel application (authentification, cours, IA/quiz et interfaces) représente 12 points acquis sur 55, soit environ **22 %**. La documentation de conception est créditée séparément pour éviter de la compter comme du code. Le périmètre intégral du CDC est plus large que ce MVP : les 26 % ne signifient pas 26 % de conformité au CDC complet.

## Constats prioritaires

Les niveaux P1 et P2 indiquent l'ordre de traitement ; ils ne constituent pas des scores CVSS. Les points de déploiement décrivent la configuration locale, sans affirmer qu'elle est exposée sur Internet.

### P1 — Corriger ou compléter avant toute livraison

1. **Le code n'est pas versionné.** git status signale eduquizai/ et les documents Markdown comme non suivis. git ls-files ne retourne que les cinq documents PDF/Word ; l'unique commit est 26ffff9. Un clone du dépôt actuel ne contient donc pas l'application. Ajouter les sources et les fichiers de configuration pertinents, vérifier les exclusions, puis créer des commits. L'audit n'a créé aucun commit.

2. **Secret JWT de démonstration utilisé localement.** back/.env contient le même JWT_SECRET que back/.env.example, de longueur 10. Sa valeur n'est pas reproduite ici. La signature et la vérification utilisent directement ce secret (auth.service.js:8 et authentification.js:13). Toute instance utilisant ce secret connu ne peut pas garantir l'authenticité des jetons. Le remplacer par un secret aléatoire propre à l'environnement et refuser au démarrage les secrets absents ou d'exemple. Le .env est bien ignoré par Git ; cela ne corrige pas la faiblesse du secret.

3. **Routes de cours absentes.** serveur.js:21 ne monte que /api/auth. cours.routes.js, cours.controleur.js, cours.service.js et cours.depot.js ne contiennent que des commentaires. PageCreationCours.jsx:20 appelle pourtant POST /api/cours et PageDashboard.jsx:18 appelle GET /api/cours. La création et la liste ne peuvent pas fonctionner avec ce backend. Implémenter le parcours avec validation, contrôle de propriété et persistance PostgreSQL.

4. **Fonction centrale de quiz absente.** Fournisseur IA, orchestration, routes, services, dépôt quiz, connexion Mongo et journal de génération sont vides. Aucun écran de quiz n'existe. Le backend ne déclare pas de pilote MongoDB. L'absence de SDK OpenAI n'est pas un défaut à elle seule, un appel HTTP direct étant possible ; c'est bien l'absence d'implémentation qui bloque. QCM, vrai/faux, édition, suppression, validation humaine et export restent à réaliser.

5. **Entrées d'authentification insuffisamment validées — reproduit.** validation.js:5 accepte un mot de passe numérique ou objet, un email sous forme de tableau et un nom de 101 caractères malgré VARCHAR(100). validerConnexion accepte deux objets. Ces valeurs atteignent les couches métier ; elles peuvent déclencher des erreurs techniques au lieu d'une réponse 400. Valider le corps, les types string, les longueurs, les valeurs vides et une politique cohérente de normalisation des emails avant tout appel aux dépendances.

6. **Recréation de la base non reproductible.** docker-compose.yml ne monte pas schema.sql dans le mécanisme d'initialisation PostgreSQL et ne lance aucune migration. Le README propose seulement docker compose up --build. Sur un volume vierge, les tables applicatives ne sont donc pas créées par cette procédure. Ajouter une initialisation pour base neuve et des migrations pour les volumes existants ; documenter une procédure vérifiable.

7. **Secrets inclus dans le contexte de build Docker.** Le Dockerfile backend utilise COPY . . (ligne 8), le .env existe et aucun .dockerignore n'est présent. Une construction avec le contexte back peut copier le .env dans l'image. Exclure les secrets, node_modules et les fichiers inutiles du contexte. Aucune image existante n'a été inspectée ; aucune fuite effective n'est affirmée.

8. **Configuration de bases réservée au développement.** Compose publie PostgreSQL et MongoDB sur les ports de l'hôte ; PostgreSQL utilise des identifiants fixes et MongoDB n'a pas d'authentification configurée. Restreindre l'écoute locale si nécessaire et préparer une configuration de déploiement avec réseau interne et authentification. L'accessibilité effective dépend aussi de Docker et du pare-feu et n'a pas été mesurée.

9. **Absence de preuves automatisées.** Aucun fichier test/spec, workflow GitHub Actions, plan de tests ou collection Postman trouvé dans l'inventaire initial. Le script jest est déclaré, mais ne constitue pas une suite. Ajouter des tests sur l'authentification, les permissions entre utilisateurs, les cours et les sorties IA invalides, puis une CI qui les exécute.

### P2 — Fiabilité, sécurité et expérience utilisateur

10. **Les erreurs du dashboard sont masquées.** PageDashboard.jsx:20 remplace toute erreur par une liste vide. Une route absente, une erreur serveur ou une session expirée apparaissent comme « Aucun cours ». Afficher un état d'erreur distinct, avec nouvelle tentative, et traiter 401 explicitement.

11. **Cycle de session incomplet.** App.jsx:8 vérifie uniquement la présence d'un jeton ; client.js:16 ne gère pas globalement son expiration. Un jeton quelconque ouvre les écrans locaux. Cela ne prouve pas un contournement d'autorisation API : le middleware serveur doit protéger toutes les futures routes métier. Le JWT est stocké en localStorage et serait accessible à un script injecté ; aucune XSS exploitable n'a été démontrée.

12. **Aucune limitation des tentatives d'authentification.** Les routes publiques exécutent directement la validation et le service. Prévoir une limitation adaptée et des tests d'abus avant exposition publique.

13. **Concurrence à l'inscription.** auth.service.js:17 effectue SELECT puis INSERT ; deux demandes simultanées peuvent franchir le premier contrôle. La contrainte UNIQUE protège les données, mais l'erreur SQL 23505 n'est pas traduite en 409 : elle devient 500. Traiter explicitement ce cas dans la couche adaptée.

14. **Erreurs HTTP mal classées.** gestionErreurs.js:5 transforme toutes les erreurs en 500, y compris celles émises par le parseur JSON. Préserver les statuts clients attendus (400/413) avec un message maîtrisé. Le gestionnaire n'expose pas la stack au client, ce qui est positif.

15. **Démarrage sans validation de configuration.** Aucun contrôle initial du secret JWT, de la connexion SQL ou du schéma. /sante confirme uniquement que le processus répond. Un secret manquant peut provoquer l'échec de génération du JWT après la création du compte. Distinguer disponibilité du processus et aptitude à traiter des requêtes, vérifier la configuration avant écoute.

16. **Accessibilité incomplète.** PageConnexion.jsx:49 et PageCreationCours.jsx:33 n'ont pas de labels persistants associés aux champs. Les messages d'erreur n'ont pas de mécanisme d'annonce dédié ; le dashboard imbrique un bouton dans un lien. index.html indique lang=en pour une interface française et un titre générique « front ». La carte de connexion a une largeur fixe à vérifier sur mobile. Aucun audit RGAA complet, test lecteur d'écran ou mesure de contraste n'a été effectué.

17. **Soumissions multiples possibles.** Les formulaires ne désactivent pas le bouton pendant la requête et n'affichent pas d'état d'envoi. Ajouter cet état et éviter les demandes concurrentes accidentelles.

18. **Docker de développement uniquement.** npm install au lieu de npm ci, commandes dev/watch, volumes de code, absence de healthchecks, de stratégie de redémarrage et de procédure de sauvegarde/restauration. Préparer une cible de production distincte, un build front statique et un démarrage serveur maîtrisé. Importer serveur.js ouvre immédiatement un port : séparer création de l'application et écoute facilitera les tests.

### P2 — Documentation et cohérence du projet

19. **Dossiers finaux non rédigés.** Le dossier projet Word contient des titres et champs tels que « Nom Prenom » et « [Date] ». Le dossier professionnel contient les instructions et champs à remplir, sans exemples personnels rédigés. L'existence de ces fichiers ne prouve pas la réalisation des livrables. Le constat porte sur le texte extrait ; aucune validation de mise en page n'a été réalisée.

20. **Le MVP réduit explicitement le CDC.** FONCTIONNALITES.md classe en bonus l'export JSON, les questions ouvertes, l'éditeur riche et la conformité RGAA complète alors que le CDC contient des attentes correspondantes. Le CDC demande une possibilité de vérification humaine ; l'obligation de bloquer tout export avant validation est un choix interne plus strict. Formaliser le périmètre retenu avec les critères d'acceptation ; ne pas annoncer la conformité intégrale au CDC sur la seule base du MVP.

21. **Conception des données à corriger.** Dans docs/base-de-donnees.md, les cardinalités Merise de CONTIENT sont inversées par rapport à la phrase descriptive ; le Mermaid de GENERATION_IA/QUIZ inverse l'optionalité attendue. Le paragraphe affirmant qu'une seule base est interrogée par requête ne décrit pas correctement la future génération : lecture du cours/journal SQL et écriture du quiz Mongo. Prévoir contrôle de propriété, cohérence des écritures et suppression des quiz lors de la suppression d'un cours. Une cascade SQL n'effacera pas les documents MongoDB.

22. **Suivi dispersé.** FONCTIONNALITES.md laisse toutes les cases décochées, ROADMAP.md annonce certaines vérifications Docker sans résultats réexécutables joints ; VEILLE.md racine est une trame alors que eduquizai/VEILLE.md contient des entrées utiles et trois résolutions d'incidents. Désigner un document de référence, ajouter les liens exacts des sources et relier chaque tâche à une preuve. Aucun diagramme de séquence ni guide utilisateur final trouvé.

23. **Fonctions de confidentialité prévues mais absentes.** Pas de page de politique de confidentialité, de parcours de suppression de compte ni de purge du journal implémentés. Les champs de consentement SQL ne sont pas alimentés par l'inscription. Il s'agit d'écarts aux intentions du projet, pas d'un avis juridique ni d'une affirmation qu'une case de consentement suffit à établir la conformité.

## Ce qui est déjà solide

- Séparation routes, contrôleurs, services et dépôts lisible et effectivement appliquée à l'authentification.
- Requêtes utilisateur paramétrées ; aucune concaténation de saisies dans les requêtes lues.
- Hachage bcrypt, expiration JWT de deux heures, message de connexion générique et réponse utilisateur sans hash.
- Schéma SQL avec clés étrangères, unicité email, contraintes et index sur les relations principales.
- Deux lockfiles cohérents avec les dépendances directes des manifests et exclusion Git du .env confirmée.
- Cas d'utilisation, maquettes, justification de stack et notes de résolution d'incidents réutilisables dans le dossier.

Ces points sont confirmés par lecture ; ils ne remplacent pas des tests d'intégration.

## Vérifications et limites

Inventaire initial : 59 fichiers hors Git et dépendances. Les 21 fichiers JavaScript backend ont été analysés syntaxiquement sans erreur ; **12 ne contiennent que des commentaires**. Les fichiers front, SQL, Docker et Markdown ont été lus. Les lockfiles ont été parsés, sans audit de vulnérabilités.

Six contrôles directs du middleware de validation ont été exécutés en mémoire : un cas nominal accepté et cinq cas invalides acceptés à tort. Résultats dans audit/constats-techniques.json. Ce sont des reproductions de défauts et non cinq tests de sécurité réussis. Aucun compte ni donnée métier n'a été créé.

Git a été interrogé réellement (status, ls-files, log et check-ignore). Les trois PDF ont été extraits localement ; le CDC complet et les sections pertinentes du référentiel d'évaluation ont été examinés. Les deux DOCX ont été extraits en texte sans modification des originaux. Aucun contenu n'a été envoyé à un service externe pour cette lecture.

L'outil terminal initial ne pouvait pas démarrer ; Node a permis la lecture et certains contrôles locaux. Les tentatives npm ci ont laissé des dépendances locales incomplètes : les points d'entrée Vite, Oxlint et Jest restent introuvables. **Build, lint et suite Jest non validés.** Aucun échec de compilation du code ne peut être déduit de cette absence d'outils. Docker n'a pas pu être vérifié, sa configuration étant inaccessible. Les assertions historiques de réussite dans ROADMAP.md ne sont donc pas reconfirmées. Aucune mesure de performance IA, aucun pentest, aucun scan de dépendances ni audit RGAA complet n'a été réalisé.

L'audit n'a modifié aucun fichier source applicatif, aucun document d'origine, aucun lockfile intentionnellement et aucun historique Git. Il a ajouté les livrables dans audit/ et tenté une installation de dépendances ignorées par Git.

## Ordre de travail proposé

1. **Sécuriser le socle et la reprise du projet** : versionner les sources, remplacer le secret JWT, ajouter les .dockerignore, rendre la base neuve initialisable, renforcer la validation. Critère de fin : une copie neuve démarre et les entrées invalides retournent 400.
2. **Terminer les cours** : création, liste, consultation et suppression avec propriété côté serveur. Critère de fin : un enseignant retrouve son cours après reconnexion et ne peut pas accéder à celui d'un autre compte.
3. **Livrer un parcours IA complet** : génération de QCM/vrai-faux, validation de structure, timeout, journal, MongoDB, écran résultat, édition et suppression. Critère de fin : un cours produit un quiz persistant ; les erreurs IA donnent un résultat maîtrisé sans incohérence entre bases.
4. **Valider et exporter** : statut brouillon/validé, règles de révision après modification et export JSON selon le périmètre retenu. Mesurer la génération simple pour confronter le résultat à l'objectif CDC inférieur à cinq secondes.
5. **Prouver la qualité et préparer la livraison** : tests unitaires/intégration/sécurité, CI, accessibilité, procédures de déploiement et restauration. Ne pas compter les tests diagnostiques de cet audit comme la suite du projet.
6. **Rédiger les dossiers en parallèle** : réutiliser la conception existante, documenter les réalisations effectives, joindre captures et résultats reproductibles, produire le guide utilisateur et le diaporama. Les dossiers Word actuels sont le point de départ, pas le livrable final.

## Sources locales

- ROADMAP.md, FONCTIONNALITES.md, ARCHITECTURE.md ; eduquizai/docs/* ; les deux VEILLE.md.
- Ensemble des sources sous eduquizai/back/src et eduquizai/front/src, manifests/lockfiles et configuration Docker.
- CDC - EduQuizzIA - MNS  (1).pdf, pages 1 à 3 : besoins, contraintes et livrables.
- REV2_CDA_V04_02072024 (2) (1).pdf, pages 4 à 7 : présentation, compétences et dossiers ; distinguer les prescriptions pour titre complet et celles des CCP dans les pages suivantes. L'audit se réfère au document fourni, sans certifier son actualité réglementaire.
- REAC_CDA_V04_02072024 (1) (1).pdf : texte extrait disponible pour traçabilité ; pas de certification exhaustive de chaque compétence.
- Les deux trames DOCX présentes à la racine au début de la lecture, puis dans instructction/ au contrôle final.

## Reproduire les défauts de validation

Depuis la racine : `node audit/diagnostic-validation.cjs`. Le diagnostic attend des réponses 400 pour les cinq cas invalides et sort actuellement avec le code 1 : cinq écarts reproduits. Aucun serveur ni aucune base ne sont nécessaires.

## Évolution du dossier pendant la vérification

Le contrôle Git final montre que les cinq documents initialement à la racine se trouvent désormais dans instructction/ : leurs anciens chemins sont marqués supprimés et le nouveau dossier est non suivi. Aucun déplacement de ces fichiers n’a été effectué par les commandes de cet audit. Les constats documentaires reposent sur la lecture effectuée avant ce déplacement. Le code applicatif reste non suivi. Un dossier non suivi nommé %SystemDrive%/ProgramData est aussi apparu pendant les vérifications ; son origine n’a pas été établie. Il n’a pas été supprimé ni ajouté à Git. Examiner ces chemins avant tout ajout global au dépôt.
