# ROADMAP — EduQuizAI (projet d'examen CDA)

Estimation du 3 octobre 2026 à 20 h : environ 80 % global et 90 % fonctionnel (non recalculée ici).
Cohérence SQL/Mongo (A1), validation des versions (A2) et état de livraison (A3) corrigés et vérifiés sur base réelle.
Le 4 octobre, le commit `9c324d1` est présent et la capture fournie confirme une CI GitHub réussie sur ce commit.
Restent : latence > 5 s avec l'IA locale, audit RGAA complet, démo en ligne, dossiers et diaporama.
Détail initial : `audit/AVANCEMENT_2026-10-03_20H.md` ; preuve CI : `audit/VALIDATION_CI_2026-10-04.md`.

## Objectif de ce document

Construire en parallèle **le code** et **le dossier de projet**, en visant uniquement le
strict nécessaire pour cocher toutes les compétences exigées par le REAC/REV2 (Titre Pro CDA).
On ne cherche pas à livrer l'application complète du cahier des charges MNS : on cherche le
plus petit projet qui coche toutes les cases d'évaluation. Les fonctionnalités "confort"
(export PDF/CSV avancé, éditeur WYSIWYG riche, RGAA poussé...) sont repoussées à la fin, en
bonus si le temps le permet.

Chaque étape ci-dessous a deux colonnes de livrables : le **Code** et le **Dossier** (la
section correspondante à rédiger dans le dossier de projet). On avance étape par étape, pas
en développant tout le code puis en rédigeant tout le dossier à la fin.

## Stack retenue par défaut (ajustable à tout moment)

| Couche | Choix | Pourquoi |
|---|---|---|
| Front | React | proposé par le CDC, écosystème riche, CSS classique par composant |
| Back | Node.js + Express | même langage que le front (JS partout) |
| BDD relationnelle | PostgreSQL | comptes utilisateurs, cours — couvre la compétence "BDD relationnelle" |
| BDD NoSQL | MongoDB | stockage des quiz générés (structure variable) — couvre la compétence "SQL et NoSQL" |
| IA | LLM local Ollama (qwen3:8b) par défaut, API OpenAI en option | gratuit et sans transfert des cours à un tiers (RGPD) ; fournisseur interchangeable |
| Auth | JWT | exigé par le CDC et le REAC (sécurité) |
| Conteneurs | Docker + docker-compose | exigé pour la compétence DevOps |
| CI/CD | GitHub Actions | exigé pour la compétence DevOps |
| Tests | Jest (unitaires + sécurité), Postman (jeu d'essai API) | couvre la compétence "plans de tests" |

## Correspondance étapes ↔ compétences REAC

| Étape | Compétence(s) REAC couverte(s) |
|---|---|
| 0 | Installer et configurer son environnement de travail / Contribuer à la gestion d'un projet informatique |
| 1 | Analyser les besoins et maquetter une application |
| 2 | Définir l'architecture logicielle d'une application |
| 3 | Concevoir et mettre en place une base de données relationnelle |
| 4 | Développer des interfaces utilisateur |
| 5 | Développer des composants métier / Développer des composants d'accès aux données SQL et NoSQL |
| 6 | Préparer et exécuter les plans de tests d'une application |
| 7 | Préparer et documenter le déploiement d'une application / Contribuer à la mise en production dans une démarche DevOps |

Les compétences transversales (*Communiquer en français et en anglais*, *Mettre en œuvre
une démarche de résolution de problème*, *Apprendre en continu*) ne sont pas liées à une
étape précise : elles sont évaluées à travers toutes les compétences pro ci-dessus. D'où
les points de vigilance ci-dessous, à traiter en continu et pas uniquement à la fin.

## Points de vigilance transverses (à ne pas oublier en cours de route)

- [x] **Journal de veille continu** : dès l'étape 0, créer `VEILLE.md` et y ajouter une
      entrée à chaque étape (IA en éducation, RGPD, accessibilité, sécurité) — pas un
      unique paragraphe rédigé à la fin.
- [ ] **Code commenté** au fur et à mesure (UI, API, intégration IA), pas en rattrapage
      final — quelques commentaires clés en anglais valorisent la compétence "communiquer
      en anglais".
- [x] **Au moins un exemple réel de démarche de résolution de problème** (un bug rencontré,
      diagnostic structuré, correction, vérification) à noter dès qu'il se présente — sert
      à la fois pour le dossier de projet et pour le dossier professionnel.
- [ ] **Anglais technique** : prévoir un temps de révision vocabulaire pro avant l'examen
      (le questionnaire professionnel comprend de la doc technique en anglais + 2 questions
      ouvertes à rédiger en anglais).
- [ ] **Comptes rendus** : même en solo, garder une trace écrite courte des échanges avec le
      formateur/tuteur (sert de "compte rendu de réunion" pour la compétence gestion de projet).

---

## Étape 0 — Cadrage & environnement

**Code**
- [x] Structure du repo (`front/`, `back/`, `docs/`)
- [x] `.gitignore`, `README.md`
- [x] Environnement Docker local (postgres, mongo, back, front et initialisation SQL)
- [ ] Outil de suivi de tâches (GitHub Projects ou Trello) avec le backlog ci-dessous
- [x] Créer `VEILLE.md` (voir points de vigilance transverses) et y noter une première entrée

**Dossier**
- [ ] Présentation de l'entreprise et du service (SchoolUp, fictive — reprendre le CDC)
- [ ] Synthèse du cahier des charges / expression des besoins
- [ ] Gestion de projet : planning prévisionnel (reprendre les 5 phases du CDC), outils collaboratifs choisis, objectifs de qualité

---

## Étape 1 — Analyse des besoins & maquettes ✅

**Code**
- [x] Liste des cas d'utilisation : Inscription, Connexion, Créer un cours, Générer un quiz, Éditer un quiz, Supprimer, Exporter un quiz (`docs/cas-utilisation.md`)
- [x] Maquettes basse fidélité : login, dashboard, création de cours, résultat de quiz (`docs/maquettes.md`)
- [x] Schéma d'enchaînement des écrans + diagramme de cas d'utilisation (`docs/diagrammes.md`)

**Dossier**
- [ ] Spécifications fonctionnelles : reprendre `docs/cas-utilisation.md` + `docs/maquettes.md` dans le dossier Word
- [ ] Coller le rendu image des diagrammes Mermaid de `docs/diagrammes.md` dans le dossier Word

---

## Étape 2 — Architecture logicielle ✅

**Code**
- [x] Schéma d'architecture en couches (Router → Contrôleur → Service → Dépôt + module IA), détaillé dans `ARCHITECTURE.md`
- [x] Squelette de dossiers/fichiers dans `back/src/` (routes, controleurs, services, depots, ia, middlewares, config) — fichiers vides avec commentaire d'intention, contenu réel à l'étape 4-5
- [x] Patron Repository pour l'accès aux données (un dépôt par table/collection)

**Dossier**
- [ ] Section architecture logicielle : reprendre `ARCHITECTURE.md` + le schéma en couches dans le dossier Word, rôle de chaque couche, stratégie de sécurité (ANSSI), besoins d'éco-conception

---

## Étape 3 — Conception de la base de données

**Code**
- [x] MCD Merise (utilisateurs, cours) → `docs/base-de-donnees.md`
- [x] MLD + script SQL de création (PostgreSQL) → `back/src/config/schema.sql`, appliqué et vérifié dans le conteneur PostgreSQL
- [x] Jeu d'essai complet (`back/scripts/jeu-essai.js`) + scripts de sauvegarde/restauration des deux bases
      (`scripts/sauvegarder.sh`, `scripts/restaurer.sh`) — restauration vérifiée après un incident simulé

**Dossier**
- [ ] Reprendre `docs/base-de-donnees.md` (MCD, MLD, schéma Mongo) dans le dossier Word
- [ ] Reprendre `back/src/config/schema.sql` en annexe

---

## Étape 4 — Auth + interfaces utilisateur essentielles ✅ (vérifié avec Docker)

**Code**
- [x] Endpoints inscription / connexion (JWT) — `back/src/routes/auth.routes.js` et couches associées
- [x] Écran login/register (React) — `front/src/pages/PageConnexion.jsx` (route `/connexion`)
- [x] Page d'accueil publique — `front/src/pages/PageAccueil.jsx` (route `/`)
- [x] Charte graphique appliquée (`front/src/index.css`, `docs/charte-graphique.md`) : logo, police
      Nunito auto-hébergée, en-tête commun ; adaptation lisibilité (fond blanc, casse normale)
- [x] Audit d'accessibilité (axe-core, clavier, 320 px) et corrections : titres de page, hiérarchie
      des titres, lien d'évitement, focus — `docs/accessibilite.md`
- [x] Écran dashboard (liste des cours) — `front/src/pages/PageDashboard.jsx` (chargement réel des cours du compte connecté)
- [x] Écran "créer un cours" (formulaire texte) — `front/src/pages/PageCreationCours.jsx`
- [x] Diagramme de séquence du cas d'utilisation le plus significatif (génération de quiz) — `docs/diagrammes.md`
- [x] **Test de bout en bout avec Docker lancé** : les 4 conteneurs tournent, schéma SQL appliqué, inscription/connexion/doublon/mot de passe erroné testés contre une vraie base PostgreSQL — tous les cas passent, mot de passe confirmé haché en base

**Dossier**
- [ ] Captures d'écran des interfaces + extraits de code correspondants
- [ ] Diagramme de séquence détaillé

---

## Étape 5 — Composants métier + intégration IA + accès données

**Code**
- [x] Module IA `ia/genererQuiz.js` : fournisseur OpenAI (structured outputs, délai max 30 s) et
      fournisseur de simulation sans IA (`IA_FOURNISSEUR`) ; réponse de l'IA validée par
      `utilitaires/questions.js` — vraie clé OpenAI encore à tester
- [x] Stockage des quiz générés dans MongoDB (NoSQL) — `depots/quiz.depot.js`, filtrage par propriétaire
- [x] Journal `generation_ia` (statut, durée, nombre de questions) — `depots/generationIa.depot.js`
- [x] Cours PostgreSQL : création, liste, consultation et suppression avec contrôle du propriétaire
      (édition hors périmètre de cette étape) ; suppression en cascade des quiz MongoDB
- [x] Endpoints REST quiz : génération, liste par cours, consultation, modification, validation,
      export JSON, suppression ; 10 générations par heure et par enseignant
- [x] Validation systématique des entrées, gestion des erreurs et exceptions (erreurs IA -> 502 générique)
- [x] Écrans : section quiz sur la page du cours, page quiz (relecture, édition, validation, export)
- [x] Modification d'un cours, recherche et tri de « Mes cours »
- [x] Export CSV et PDF, mode « Tester le quiz », régénération d'une question, avis de l'IA sur une
      réponse ouverte, citation du cours vérifiée pour chaque question
- [x] Journal de sécurité (`journal_securite`) des actions sensibles

**Dossier**
- [ ] Extraits de code : composants métier, accès données SQL, accès données NoSQL
- [ ] Présentation des éléments de sécurité (validation des entrées, JWT, permissions)

---

## Étape 6 — Tests

**Code**
- [x] Plan de tests comptes/cours (unitaires, intégration, sécurité) — `eduquizai/docs/plan-tests.md`
- [x] Tests Jest : authentification, validation, cours et permissions
- [x] Tests des sessions front et parcours API avec PostgreSQL réel
- [x] Tests du module IA (OpenAI simulé : succès, délai, refus, JSON invalide), des règles de questions et
      des routes quiz (propriété, journal, brouillon -> validé, export, limitation)
- [x] Parcours quiz sur la vraie API + PostgreSQL + MongoDB — `scripts/verifier-quiz-reel.js` (24 vérifications)
- [x] Tests de sécurité : injection SQL et XSS (Jest + scripts réels), scan OWASP ZAP de la production
      (0 échec, 64 réussis) et dans la CI
- [x] Tests de composants React (Vitest + Testing Library) et parcours navigateur complet sur la production
- [x] Jeu d'essai documenté sur la génération de quiz (entrée → attendu → obtenu) — `eduquizai/docs/plan-tests.md` ; mesure < 5 s à refaire avec une vraie clé OpenAI

**Dossier**
- [ ] Présentation du plan de tests
- [ ] Jeu d'essai de la fonctionnalité la plus représentative + analyse des écarts

---

## Étape 7 — Déploiement & DevOps

**Code**
- [x] Dockerfiles front/back finalisés (`front/Dockerfile.prod` : build + nginx sans root)
- [x] `docker-compose.prod.yml` proche de la production (CSP, secrets, MongoDB authentifié)
- [x] Fichier GitHub Actions : tests, PostgreSQL de test, lint, build et images Docker
- [x] Preuve d’exécution du pipeline sur GitHub : capture fournie le 4 octobre, succès sur `9c324d1`.
- [x] Script et documentation de déploiement (`scripts/deployer.sh`, `docs/deploiement.md`), vérifiés en local

**Dossier**
- [ ] Procédure de déploiement rédigée
- [ ] Section CI/CD (capture du pipeline, script commenté)

---

## Étape 8 — Finalisation

- [ ] Finaliser `VEILLE.md` (déjà alimenté en continu depuis l'étape 0) et en extraire la
      synthèse pour la section "veille" du dossier
- [x] Compléter la documentation utilisateur (guide comptes/cours déjà rédigé ; reste générer un quiz,
      l'éditer, l'exporter)
- [ ] Vérifier que la page/le bloc "mentions légales RGPD" existe (fait : `/confidentialite`) et est référencé dans le dossier
- [ ] Relire que le code est bien commenté (UI, API, intégration IA) avant les captures/extraits
- [ ] Compiler et relire le dossier de projet complet (40-60 pages + annexes 40 pages max —
      à surveiller dès l'étape 5, pas seulement ici)
- [ ] Renseigner le dossier professionnel : 1 à 3 exemples de pratique par activité-type,
      tirés du projet (inclure l'exemple de résolution de problème noté en cours de route)
- [ ] Préparer le diaporama de soutenance (même plan que le dossier)

---

## Hors périmètre du MVP (à ajouter seulement s'il reste du temps)

- Export PDF/CSV avancé des quiz
- Éditeur WYSIWYG riche (Markdown simple suffit)
- Types de questions avancés au-delà de QCM + vrai/faux (questions ouvertes en bonus)
- Audit RGAA complet (mentionner la démarche dans le dossier suffit pour le MVP)
## Corrections prioritaires issues du dernier audit

- [x] Coordonner génération et suppression SQL/Mongo ; nettoyage durable et test de panne (A1).
- [x] Contrôler la version du quiz lors de la modification, régénération et validation (A2).
- [x] Distinguer succès de l’appel IA et persistance du quiz dans le journal (A3).
- [ ] Rejouer des mesures de latence : essai actuel de 17,015 s pour 3 questions, cible < 5 s.
- [x] Résoudre les alertes npm sur les dépendances de développement, puis tester.
- [ ] Compléter la preuve de conformité RGAA demandée au CDC (ne pas la confondre avec axe seul).
- [x] Évolutions versionnées dans `9c324d1` ; succès de la CI distante attesté par la capture fournie.
- [ ] Publier une démo en ligne, sous accord explicite.

Ces tâches complètent les cases fonctionnelles déjà cochées : un parcours nominal réussi ne démontre pas sa fiabilité en concurrence ou en panne.
