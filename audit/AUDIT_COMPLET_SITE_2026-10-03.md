# Audit du site et avancement face aux documents d’instruction

Date : 3 octobre 2026. État audité : fichiers locaux, y compris changements non commités, après le commit a602553.

## Conclusion

**Avancement global estimé : 78 % (77,5 points calculés). Partie fonctionnelle du site : environ 85 %.**

La majorité des parcours existe et fonctionne : comptes, cours, vraie IA locale, quiz, relecture, édition, export et essai. Le projet n’est toutefois pas terminé : défauts de cohérence des données et de validation concurrente, performance supérieure à la cible, conformité d’accessibilité non démontrée intégralement et dossiers d’examen encore à rédiger.

Le pourcentage est une estimation de maturité pondérée, pas une mesure de couverture de tests ni une note du jury. Une variation de quelques points est possible selon la sévérité retenue ; retenir environ 75–80 % plutôt qu’une précision artificielle. Une exigence bloquante reste bloquante même avec un bon total.

## 1. Références et méthode

Documents relus directement dans `instructction/` :

- `CDC - EduQuizzIA - MNS  (1).pdf`, 3 pages : fonctionnalités page 1 ; architecture, sécurité, accessibilité et performance page 2 ; livrables page 3.
- `REAC_CDA_V04_02072024 (1) (1).pdf`, 50 pages : activités et compétences du titre.
- `REV2_CDA_V04_02072024 (2) (1).pdf`, 42 pages : modalités d’évaluation ; dossier et diaporama pages 4–7.
- `dossier projet cda (1) (1).docx` : trame de dossier projet, environ 470 mots extraits, essentiellement des rubriques non renseignées.
- `[CD2IA] Nicolas LEBON - dossier_professionnel_CDA (2) (1).docx` : trame professionnelle, champs de saisie et exemples de pratique non renseignés.

Les originaux n’ont pas été modifiés ni envoyés à un service externe. Leurs extractions techniques restent dans `audit/`, ignorées par Git. Le RE demande notamment un dossier de 40 à 60 pages hors garde, sommaire et annexes ; annexes limitées à 40 pages. Le plan précis dépend du contexte formation/entreprise : ne pas imposer automatiquement le plan entreprise à un projet de formation.

La ROADMAP est un suivi interne : elle ne peut pas transformer une exigence du CDC en bonus. Ainsi, les questions ouvertes et la conformité RGAA figurent bien dans les attentes du CDC. En revanche, les marques d’outils proposées (Postman, OpenAI…) ne constituent pas chacune une fonctionnalité obligatoire : Ollama est explicitement une alternative acceptée à OpenAI. L’absence d’essai OpenAI réel ne suffit donc pas à déclarer l’IA absente.

Audit réalisé : lecture des couches API, services, dépôts, validation et fournisseurs IA ; revue React et configuration Docker/CI ; exécution des tests ; parcours réel dans Edge ; reproductions isolées de pannes/concurrence ; comparaison aux livrables. Il ne s’agit ni d’une certification RGAA, ni d’un pentest exhaustif, ni d’une validation juridique RGPD.

## 2. Calcul détaillé

Même répartition des poids que les précédents rapports, avec scores réévalués sur les preuves actuelles.

| Domaine | Poids | Maturité estimée | Points | Justification principale |
|---|---:|---:|---:|---|
| Analyse, architecture et conception des données | 15 % | 90 % | 13,5 | Besoins, maquettes, diagrammes, modèle relationnel et couches présents ; suivi de projet et formalisation finale incomplets |
| Authentification et protections associées | 10 % | 90 % | 9 | JWT, bcrypt, validation et limitation testés ; révocation et effacement concurrent à consolider |
| Gestion des cours | 15 % | 90 % | 13,5 | CRUD, import texte, Markdown, recherche et tri ; suppression multi-base incomplète en cas de panne |
| IA, quiz, MongoDB et journal | 20 % | 80 % | 16 | Vraie génération et trois types ; édition/validation/export ; concurrence et objectif de latence non résolus |
| Interfaces et accessibilité | 10 % | 85 % | 8,5 | Parcours utilisables, charte et mobile vérifiés ; audit RGAA complet non établi |
| Tests et preuves qualité | 10 % | 85 % | 8,5 | 248 tests passent et scénario réel effectué ; pannes/concurrence manquantes dans la suite, preuve CI distante absente |
| Environnement, Git et déploiement | 10 % | 65 % | 6,5 | Docker local opérationnel, production/scripts/CI présents ; changements non commités, pas de preuve de mise en ligne ni CI distante |
| Dossiers finaux, guide et soutenance | 10 % | 20 % | 2 | Guide et matériau Markdown disponibles ; Word non rédigés, diaporama absent du périmètre inspecté |
| **Total** | **100 %** | | **77,5 / 100** | **Arrondi : 78 %** |

Sous-ensemble fonctionnel : (9 + 13,5 + 16 + 8,5) / (10 + 15 + 20 + 10) = **85,45 %**, arrondi à **85 %**. Les 20 % de la dernière ligne incluent le guide et la matière préparatoire ; ils ne signifient pas que les deux dossiers Word sont rédigés à 20 %.

L’ancien rapport du soir estimait 76,5 % global et 88 % fonctionnel. Des livrables supplémentaires existent désormais (production, exports, tests), mais les défauts reproduits conduisent à réduire certains scores de maturité. Une hausse du nombre de fonctions n’efface pas ces défauts.

## 3. Correspondance aux attentes du CDC

Légende : réalisé = présent avec preuve disponible ; partiel = présent mais limite significative ou preuve manquante ; absent = livrable non trouvé dans le périmètre.

| Attente | État | Preuve et limite |
|---|---|---|
| Inscription/connexion sécurisée | Réalisé | JWT HS256, bcrypt, validation, tests HTTP ; inscription réelle réussie |
| Rédaction et import de texte | Réalisé | Création/édition, fichiers .txt/.md ; PDF/Word non importés, non nécessaires à la seule exigence import texte |
| Sauvegarde personnelle des cours | Réalisé | PostgreSQL, filtre propriétaire dans les requêtes |
| Historique cours/quiz | Réalisé | Tableau de bord, quiz par cours, journal de génération |
| Génération par OpenAI ou LLM local | Réalisé | Ollama réellement sollicité ; OpenAI présent et testé avec réponses simulées |
| QCM avec distracteurs | Réalisé | Génération observée et règles de format testées ; qualité pédagogique à relire |
| Questions ouvertes | Réalisé | Présentes dans le quiz réel et dans le mode essai |
| Vrai/faux avec explication | Réalisé | Présent dans le quiz réel, explication contrôlée |
| Édition des quiz | Réalisé avec réserve | Modification et retour brouillon ; absence de contrôle de version en concurrence |
| Validation humaine | Partiel | Export brouillon refusé, mais validation d’une version périmée possible : constat A2 |
| Export PDF ou JSON | Réalisé | Export JSON vérifié ; CSV présent et testé ; PDF par impression navigateur, pas moteur PDF serveur |
| Stockage utilisateurs/cours/quiz | Partiel | SQL et Mongo opérationnels ; écritures et suppressions non coordonnées : A1/A3 |
| API entre front/back/IA | Réalisé avec réserve | Authentification, formats contrôlés, filtrage propriétaire ; pannes et concurrence à renforcer |
| Éditeur Markdown/WYSIWYG | Réalisé | Markdown avec aperçu ; un WYSIWYG supplémentaire n’est pas requis |
| Visualisation dynamique | Réalisé | Lecture, édition, essai interactif et score |
| Interface claire et accessible | Partiel | Bonne adaptation mobile, focus/labels documentés ; conformité RGAA globale non démontrée |
| Sécurité JWT/API et protection des données | Partiel | Protections présentes ; effacement en panne et configuration publique à finaliser ; pas de certification RGPD |
| Appels IA sécurisés | Réalisé avec réserve | Clé côté serveur, délais, réponses contrôlées ; qualité/robustesse du prompt non garanties par son seul format |
| Génération simple sous 5 s | Non atteint sur l’essai | 17,015 s côté IA, 17,033 s de bout en bout, pour 3 questions |
| Code commenté | Réalisé | Commentaires pédagogiques et couches lisibles ; conventions de style pas uniformes partout |
| Docker et CI/CD | Partiel | Configurations présentes, stack locale saine ; pipeline distant non prouvé, CD public absent |
| Journal de veille | Réalisé | Journal substantiel dans eduquizai/VEILLE.md ; le fichier racine était surtout une trame |
| Documentation utilisateur | Réalisé | Guide comptes, cours, quiz et compte présent |
| Tests automatisés | Réalisé | 217 backend et 31 frontend passants |
| Fiche de test représentative | Partiel | Entrées/attendus/obtenus et écarts disponibles dans le plan ; à intégrer dans le dossier final |
| Dossier projet final | Absent | Matière Markdown présente, Word fourni toujours à remplir |
| Diaporama et oral/démo préparés | Absent/non prouvé | Site démontrable en local ; diaporama non trouvé et répétition non évaluée |
| Démo déployée | Non prouvée | Configuration proche production et traces locales présentes ; pas de preuve d’une démo accessible en ligne |

Les bonus (partage, rôles multiples, thème sombre, interface multilingue) ne sont pas pénalisés comme des obligations du CDC. À l’inverse, une fonctionnalité supplémentaire ne compense pas le critère de performance manquant.

## 4. Constats techniques classés par priorité

### A1 — Priorité haute : quiz orphelins après suppression d’un cours

Fichiers : `eduquizai/back/src/services/cours.service.js:49`, `services/quiz.service.js:106` et `:136`, `depots/quiz.depot.js:44`.

La suppression efface d’abord le cours SQL. Une erreur de suppression Mongo est seulement journalisée, puis l’API annonce une réussite. La consultation d’un quiz ne vérifie pas que le cours parent existe encore. Aucune file durable de nettoyage ni mécanisme de reprise n’a été identifié.

Deux cas reproduits avec les **services réels et les dépôts simulés**, sans provoquer de panne sur les bases de l’utilisateur :

1. Mongo tombe en panne pendant la suppression : le cours disparaît mais le quiz reste consultable par son propriétaire.
2. Une génération a déjà enregistré son journal ; la suppression efface le cours et les quiz existants ; l’insertion Mongo de la génération arrive ensuite : nouveau quiz orphelin consultable.

Cela ne démontre pas un accès aux données d’un autre compte. L’impact confirmé est une suppression incomplète, des données incohérentes et une réponse de succès trompeuse. La suppression de compte présente un risque analogue de concurrence : Mongo est effacé avant SQL, sans verrou commun avec les générations en cours. Le JWT n’est pas révoqué par consultation du compte à chaque appel.

Correction attendue : coordonner génération et suppression, refuser la consultation d’un parent supprimé, conserver une demande de nettoyage durable et rejouable. Tester les pannes et les ordonnancements concurrents. Ne pas prétendre qu’une transaction PostgreSQL seule rend Mongo atomique.

### A2 — Priorité haute : validation humaine sans contrôle de version

Fichiers : `eduquizai/back/src/services/quiz.service.js:145` et `:162`, `depots/quiz.depot.js:51`, `eduquizai/front/src/pages/PageQuiz.jsx`.

Reproduction sur la **vraie API** avec un compte synthétique : lecture de A, modification en B, puis appel de validation comme depuis l’ancien onglet A. Résultat : HTTP 200, version B marquée valide et export autorisé, alors que cet onglet n’a pas reçu B. Aucun numéro de version/ETag n’est exigé. Une sauvegarde ou une régénération tardive peut également écraser une édition plus récente.

Correction attendue : révision du quiz, comparaison atomique en base et réponse 409 en cas de conflit ; recharger et relire avant de valider. Le verrou React contre le double clic ne protège pas plusieurs onglets.

### A3 — Priorité moyenne : succès du journal avant persistance du quiz

Fichier : `eduquizai/back/src/services/quiz.service.js:49` et `:106`.

Le succès de l’appel IA est enregistré avant insertOne. Si Mongo échoue, l’utilisateur reçoit une erreur et aucun quiz n’est disponible, mais le journal reste en succès. Cela peut être cohérent avec un journal strictement limité à l’appel IA ; l’interface doit alors distinguer explicitement « IA réussie » et « quiz enregistré ». Aujourd’hui la livraison complète n’est pas tracée et aucune compensation n’est visible. Constat de lecture, distinct des reproductions A1/A2.

### A4 — Écart explicite au CDC : latence

Essai réel : photosynthèse, 3 questions, Ollama/qwen3:8b, statut 201, trois questions retournées. Temps IA 17 015 ms, temps total 17 033 ms. Dépassement d’environ 12 s, soit 3,4 fois la cible.

Une seule mesure n’est pas un benchmark statistique ; elle prouve néanmoins que ce scénario n’atteint pas les 5 secondes sur ce poste. Prévoir des mesures répétées à chaud/froid et sur plusieurs cours, puis réduire le modèle/la charge ou changer d’infrastructure. Ne pas supposer qu’OpenAI respecterait automatiquement la cible.

### A5 — Dépendances de développement à mettre à jour

`npm audit` backend : 28 entrées de dépendances classées hautes, dans l’arbre d’outillage de test. Ce ne sont pas 28 vulnérabilités indépendantes ni 28 failles exploitables démontrées du site.

Backend `npm audit --omit=dev` : 0 alerte ; frontend : 0 alerte lors de cet audit. Le Dockerfile backend installe seulement les dépendances de production. Prévoir une mise à jour contrôlée de Jest et de son arbre, puis rejouer les tests ; aucun audit fix forcé effectué.

### A6 — Livraison et preuves à terminer

Deux commits seulement dans l’historique local ; de nombreux fichiers modifiés/non suivis portent les évolutions IA, UI, tests et production. Leur présence sur disque ne vaut pas version livrée. Aucun push ni commit réalisé pendant cet audit.

La CI cible ZAP sur `/sante` sans authentification : ce scan ne démontre pas la sécurité des parcours protégés cours/quiz. Un rapport ZAP local sur le port 8080 existe ; ses résultats et ceux de la documentation concernent une exécution précédente. La configuration de production n’a pas été redémarrée pendant cet audit, et aucune preuve de pipeline distant n’a été consultée.

### A7 — Documentation parfois plus affirmative que les preuves

- « application complète » dans la ROADMAP omet les réserves A1–A4.
- Le guide utilisateur est déjà rédigé pour les quiz, malgré une case ancienne indiquant le contraire.
- L’édition des cours existe, malgré une mention de périmètre antérieure.
- 31 tests frontend passent actuellement, contre un total plus ancien indiqué dans le plan.
- Le dossier `instructction/` est maintenant ignoré, mais les documents ont été suivis dans le premier commit : ne pas publier l’historique sans traiter cette confidentialité. Aucun historique réécrit ici.
- La politique de confidentialité utilise une entreprise et une adresse de contact fictives : acceptable comme démonstration explicitement pédagogique, à remplacer avant une exploitation réelle.

## 5. Vérifications exécutées pendant cet audit

| Vérification | Résultat |
|---|---|
| npm test backend | 217 tests réussis, 10 suites |
| npm test frontend | 15 tests Node + 16 tests Vitest = 31 réussis |
| npm run lint frontend | Réussite, aucun avertissement affiché |
| npm run build frontend | Réussite, 206 modules ; JS principal environ 433 ko brut / 134 ko gzip |
| Docker local | API et PostgreSQL healthy, Mongo et front démarrés ; bases non publiées sur l’hôte |
| Inscription réelle | Deux comptes synthétiques créés puis supprimés par l’API |
| Génération réelle Ollama | 201, 3 questions, 17,015 s IA |
| Isolation de lecture quiz | Autre utilisateur : 404 |
| Export brouillon / validé | 409 avant validation, 200 après |
| Modification quiz | 200 ; retour brouillon |
| Suppression nominale cours | 204 puis lecture quiz 404 |
| Régression validation périmée | Défaut A2 reproduit sur vraie API |
| Panne / concurrence multi-base | Défaut A1 reproduit avec services réels et dépôts simulés |
| Navigateur Edge | 10 vues × 2 largeurs (320 et 1280), aucun débordement horizontal ni erreur JavaScript |
| Titres de pages | Un h1 par page chargée dans les neuf routes inspectées |
| Visuel | Capture de l’édition mobile inspectée ; libellés des choix étroits mais champs utilisables |

Vues : accueil, connexion, confidentialité, tableau de bord, nouveau cours, détail cours, modification cours, lecture quiz, essai quiz, édition quiz. La création/édition/validation via API et la navigation UI ont été distinguées : tous les boutons de toutes les pages n’ont pas été cliqués. Axe-core, lecteur d’écran, charge, restauration et production n’ont pas été relancés dans cette passe. Les résultats antérieurs documentés ne sont pas présentés comme réexécutés.

Preuves techniques locales ignorées par Git : `verification-site-actuel.json`, `reproduction-coherence.json`, scripts associés et captures `site-quiz-edition-*.png`. Aucun compte ni cours préexistant supprimé ; aucun appel payant OpenAI effectué.

## 6. Situation face au REAC et au RE

| Compétence / livrable | Support disponible | À consolider |
|---|---|---|
| Environnement | Docker, scripts, configuration | Preuve reproductible du déploiement cible |
| Interfaces | Pages et composants React, charte, tests | Audit accessibilité complet et présentation des choix |
| Métier | Cours/quiz/comptes et fournisseurs IA | Concurrence, effacement, latence |
| Gestion de projet | ROADMAP et backlog en Markdown | Planning suivi, comptes rendus, répartition du travail réelle |
| Besoins et maquettes | Documents de conception | Cohérence entre CDC complet et périmètre MVP annoncé |
| Architecture | Couches et séparation fournisseurs | Explication des compromis SQL/Mongo et correction des pannes |
| Base relationnelle | MCD/MLD, schéma et données d’essai | Illustration et justification dans le dossier |
| Accès SQL/NoSQL | Dépôts PostgreSQL/MongoDB | Cohérence inter-bases et tests de défaillance |
| Tests | Suites et plan/jeux d’essai | Ajouter les régressions trouvées, consolider les preuves |
| Préparer le déploiement | Compose prod, nginx, procédure | Exécution cible et retour arrière démontrés |
| DevOps | Workflow et images | CI distante réellement verte et traçable |
| Dossier projet | Trame + matière Markdown | Rédaction, captures, extraits et argumentation personnelle |
| Dossier professionnel | Trame | Exemples de pratiques réelles, contexte, moyens, résultats |
| Soutenance | Site local démontrable | Diaporama, scénario de démo, répétition et anglais technique |

La présence de code couvre un support de compétence, pas la maîtrise personnelle du candidat. L’oral, les justifications et les preuves restent déterminants.

## 7. Prochaines actions recommandées

1. Corriger A1 et A2 avec des tests de régression ; clarifier A3.
2. Mettre à jour l’outillage de test vulnérable, puis versionner les évolutions en commits relus.
3. Choisir une stratégie pour atteindre les 5 secondes ou documenter explicitement l’écart accepté avec le commanditaire/formateur.
4. Compléter l’audit accessibilité et vérifier la production cible ; obtenir la preuve de CI distante après autorisation de publication et traitement des documents confidentiels historiques.
5. Rédiger le dossier projet et le dossier professionnel à partir de la matière déjà disponible, préparer le diaporama et la démo.

## 8. Modifications réalisées pour cet audit

Uniquement rapports, scripts techniques locaux de diagnostic et mise à jour du suivi documentaire. Aucun code applicatif corrigé, aucune dépendance modifiée, aucun déploiement ni publication. Les choix d’implémentation existants ont été conservés ; les incohérences de suivi sont signalées et les tâches de correction ajoutées sans effacer l’historique.
