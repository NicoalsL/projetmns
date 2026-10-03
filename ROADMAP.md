# ROADMAP — EduQuizAI (projet d'examen CDA)

État actualisé : comptes et cours (création, liste, détail, suppression) opérationnels, avec contrôle du propriétaire. Les tests backend, front et PostgreSQL réel sont décrits dans `eduquizai/docs/plan-tests.md`. Les cases historiques ci-dessous qui regroupent des livrables non terminés restent ouvertes. IA/quiz et dossiers finaux restent à développer.

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
| IA | API OpenAI (chat/completions) | rapide à intégrer ; possibilité de brancher un LLM local (Ollama) mentionnée dans la veille |
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

- [ ] **Journal de veille continu** : dès l'étape 0, créer `VEILLE.md` et y ajouter une
      entrée à chaque étape (IA en éducation, RGPD, accessibilité, sécurité) — pas un
      unique paragraphe rédigé à la fin.
- [ ] **Code commenté** au fur et à mesure (UI, API, intégration IA), pas en rattrapage
      final — quelques commentaires clés en anglais valorisent la compétence "communiquer
      en anglais".
- [ ] **Au moins un exemple réel de démarche de résolution de problème** (un bug rencontré,
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
- [ ] Créer `VEILLE.md` (voir points de vigilance transverses) et y noter une première entrée

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
- [ ] Jeu d'essai complet + script de sauvegarde/restauration de la base de test

**Dossier**
- [ ] Reprendre `docs/base-de-donnees.md` (MCD, MLD, schéma Mongo) dans le dossier Word
- [ ] Reprendre `back/src/config/schema.sql` en annexe

---

## Étape 4 — Auth + interfaces utilisateur essentielles ✅ (vérifié avec Docker)

**Code**
- [x] Endpoints inscription / connexion (JWT) — `back/src/routes/auth.routes.js` et couches associées
- [x] Écran login/register (React) — `front/src/pages/PageConnexion.jsx`
- [x] Écran dashboard (liste des cours) — `front/src/pages/PageDashboard.jsx` (chargement réel des cours du compte connecté)
- [x] Écran "créer un cours" (formulaire texte) — `front/src/pages/PageCreationCours.jsx`
- [ ] Diagramme de séquence du cas d'utilisation le plus significatif (à faire : inscription ou génération de quiz)
- [x] **Test de bout en bout avec Docker lancé** : les 4 conteneurs tournent, schéma SQL appliqué, inscription/connexion/doublon/mot de passe erroné testés contre une vraie base PostgreSQL — tous les cas passent, mot de passe confirmé haché en base

**Dossier**
- [ ] Captures d'écran des interfaces + extraits de code correspondants
- [ ] Diagramme de séquence détaillé

---

## Étape 5 — Composants métier + intégration IA + accès données

**Code**
- [ ] Service métier `generateQuiz` (appel API OpenAI)
- [ ] Stockage des quiz générés dans MongoDB (NoSQL)
- [x] Cours PostgreSQL : création, liste, consultation et suppression avec contrôle du propriétaire (édition hors périmètre de cette étape)
- [ ] Endpoints REST reliant front/back/IA
- [ ] Validation systématique des entrées, gestion des erreurs et exceptions

**Dossier**
- [ ] Extraits de code : composants métier, accès données SQL, accès données NoSQL
- [ ] Présentation des éléments de sécurité (validation des entrées, JWT, permissions)

---

## Étape 6 — Tests

**Code**
- [x] Plan de tests comptes/cours (unitaires, intégration, sécurité) — `eduquizai/docs/plan-tests.md`
- [x] Tests Jest : authentification, validation, cours et permissions
- [x] Tests des sessions front et parcours API avec PostgreSQL réel
- [ ] Tests du service de génération de quiz
- [ ] Tests de sécurité basiques (tentative d'injection SQL, tentative XSS) via Postman ou OWASP ZAP
- [ ] Jeu d'essai complet documenté sur la génération de quiz (donnée en entrée → attendu → obtenu)

**Dossier**
- [ ] Présentation du plan de tests
- [ ] Jeu d'essai de la fonctionnalité la plus représentative + analyse des écarts

---

## Étape 7 — Déploiement & DevOps

**Code**
- [ ] Dockerfiles front/back finalisés
- [ ] `docker-compose.yml` complet (proche prod)
- [x] Fichier GitHub Actions : tests, PostgreSQL de test, lint, build et images Docker
- [ ] Preuve d’exécution du pipeline sur GitHub (aucun push effectué)
- [ ] Script et documentation de déploiement

**Dossier**
- [ ] Procédure de déploiement rédigée
- [ ] Section CI/CD (capture du pipeline, script commenté)

---

## Étape 8 — Finalisation

- [ ] Finaliser `VEILLE.md` (déjà alimenté en continu depuis l'étape 0) et en extraire la
      synthèse pour la section "veille" du dossier
- [ ] Compléter la documentation utilisateur (guide comptes/cours déjà rédigé ; reste générer un quiz,
      l'éditer, l'exporter)
- [ ] Vérifier que la page/le bloc "mentions légales RGPD" existe et est référencé dans le dossier
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
