# FONCTIONNALITES — EduQuizAI

Liste des fonctionnalités du projet, classées en deux niveaux :

- **Essentielles (MVP)** : à développer en premier, c'est ce qui doit exister pour que
  chaque compétence du REAC ait un support concret à présenter (voir `ROADMAP.md`).
- **Additionnelles (bonus)** : fonctionnalités du cahier des charges MNS qui enrichissent
  le projet mais ne sont pas nécessaires pour cocher les cases d'évaluation. À ajouter
  seulement si les étapes 0 à 8 de la ROADMAP sont terminées et qu'il reste du temps.

Regroupées par domaine, comme dans le CDC.

## a. Espace enseignant

**Essentielles**
- [x] Inscription / connexion sécurisée (JWT)
- [x] Créer un cours en collant/saisissant un texte pédagogique
- [x] Lister et consulter ses propres cours
- [x] Lister les quiz générés
- [x] Supprimer son cours après confirmation
- [x] Modifier un cours (les quiz déjà générés ne changent pas)
- [x] Supprimer un quiz
- [x] Modifier un quiz généré (au moins une question) — pour couvrir la compétence
      "accès aux données en consultation, modification, création, suppression"

- [x] Page "mentions légales" / politique de confidentialité RGPD (`/confidentialite`, lien en pied
      de page), consentement obligatoire à l'inscription (enregistré avec sa date), suppression
      du compte et de toutes ses données, purge automatique du journal `generation_ia` après 6 mois

**Additionnelles**
- [x] Import de fichiers texte (.txt, .md) en plus du texte collé — PDF et Word non pris en charge
- [x] Historique avec recherche / tri (« Mes cours » : recherche sans casse ni accents, tri par date ou titre)
- [x] Éditeur Markdown avec aperçu pour la rédaction du cours (react-markdown, HTML brut ignoré)
- [ ] Partage d'un cours ou d'un quiz entre enseignants
- [ ] Gestion de rôles (admin / enseignant)

## b. Module IA

**Essentielles**
- [x] Génération automatique de quiz à partir du texte du cours (appel API OpenAI) — testée avec OpenAI simulé et en mode simulation ; à vérifier avec une vraie clé
- [x] Trois types de questions générées : QCM avec distracteurs, Vrai/Faux avec explication, question ouverte
- [x] Gestion des erreurs de l'appel IA (timeout, réponse invalide)
- [x] Journal des générations (`generation_ia`) : trace chaque appel IA (statut, durée,
      nombre de questions) — sert de preuve du critère de performance CDC (< 5 s) et
      d'historique (affiché sur la page du cours)
- [x] Statut brouillon/validé sur le quiz + validation manuelle obligatoire avant export —
      contrainte "Éthique" du CDC, au même rang que sécurité/performance/accessibilité,
      pas un bonus

**Additionnelles**
- [x] Évaluation des réponses aux questions ouvertes : avis de l'IA dans le mode « Tester le quiz » (l'enseignant décide)
- [x] Citation du cours pour chaque question, vérifiée par le serveur (alerte si introuvable dans le cours)
- [x] Régénération d'une seule question (même type, même cours)
- [x] Fournisseur IA interchangeable (`IA_FOURNISSEUR`) : LLM local Ollama (qwen3:8b, vérifié en réel), OpenAI
      (testé avec API simulée) ou simulation sans IA
- [x] Réglage du nombre de questions (3 à 10), des types de questions, du niveau des élèves et de la difficulté
- [x] Contenu minimal exigé avant génération (300 caractères, 3 phrases) pour éviter les questions inventées
- [x] Limitation de quota d'appels IA par utilisateur (rate limiting)

## c. Back-end

**Essentielles**
- [x] Base de données utilisateurs et cours (PostgreSQL, relationnel)
- [x] Stockage des quiz générés (MongoDB, NoSQL)
- [x] API REST sécurisée reliant front / back / module IA
- [x] Validation systématique des entrées côté serveur

**Additionnelles**
- [x] Export JSON du quiz (celui-ci reste conseillé même en MVP si le temps le permet, sinon en bonus)
- [x] Export CSV (API, protection contre l'injection de formules) et PDF (impression du navigateur)
- [x] Journalisation des actions sensibles (`journal_securite` : connexions, suppressions, exports ; purge 6 mois)
- [ ] Sauvegarde automatique planifiée de la base de données

## d. Front-end

**Essentielles**
- [x] Page d'accueil publique présentant le service (`/`)
- [x] Écran de connexion / inscription (`/connexion`)
- [x] Écran dashboard listant les cours
- [x] Écran de création de cours (formulaire texte simple)
- [x] Écran d'affichage du quiz généré (lecture + édition basique)
- [x] Interface claire et lisible (accessibilité de base : contrastes, labels de formulaire)

**Additionnelles**
- [x] Visualisation dynamique du quiz : mode « Tester le quiz » (une question à la fois, correction, score) et
      encadré animé pendant la génération
- [ ] Conformité RGAA 4.1 complète (audit dédié) — tests automatiques et clavier faits,
      critères respectés / restants dans `eduquizai/docs/accessibilite.md`
- [ ] Thème sombre / clair (styles prêts dans `index.css`, désactivés : fond blanc imposé pour la lisibilité)
- [ ] Interface multilingue

## Sécurité, tests, déploiement (transverses)

**Essentielles**
- [x] Mots de passe hashés, JWT pour les sessions
- [x] Révocation des sessions : déconnexion côté serveur (tous les appareils) et jetons d'un compte supprimé refusés
- [x] Protection basique contre injection SQL / XSS (paramétrage des requêtes, échappement)
- [x] Tests unitaires et HTTP sur l'authentification et les cours
- [x] Tests du service de génération de quiz
- [x] Tests SQL/XSS documentés sur les cours — `eduquizai/docs/plan-tests.md`
- [x] Dockerisation front + back + bases de données
- [x] Pipeline GitHub Actions (lint, tests, build) ; succès sur `9c324d1` visible dans la capture fournie
      le 4 octobre 2026 — `audit/VALIDATION_CI_2026-10-04.md`.

**Additionnelles**
- [x] Scan de sécurité automatisé (OWASP ZAP) intégré à la CI — scan local de la production : 0 échec, 64 réussis
- [ ] Déploiement automatisé (CD) vers un environnement en ligne
- [ ] Tests de charge
- [ ] Monitoring / alerting en production

## Documents transverses (obligatoires, hors code)

Livrables explicitement demandés par le CDC ou le REAC, à ne pas oublier car ils ne sont
pas du "code" et passent facilement à la trappe :

- [x] `VEILLE.md` — journal de veille tenu à jour tout au long du projet (IA en éducation,
      RGPD, accessibilité, sécurité), pas rédigé d'un coup à la fin
- [x] Documentation utilisateur (guide court d'usage de l'application) — `eduquizai/docs/guide-utilisateur.md`
- [x] Au moins un exemple documenté de démarche de résolution de problème (bug rencontré,
      diagnostic, correction, vérification)
## Réserves de validation — audit du 3 octobre 2026

Les cases cochées ci-dessus indiquent une fonctionnalité présente. Les réserves suivantes empêchent de déclarer le CDC entièrement satisfait (voir `audit/AUDIT_COMPLET_SITE_2026-10-03.md`) :

- [x] Effacement des quiz garanti après suppression du cours, y compris panne Mongo ou génération simultanée.
- [x] Validation humaine attachée à la version effectivement relue, avec refus des versions périmées.
- [ ] Génération simple sous 5 secondes sur un environnement mesuré : 17,015 secondes observées avec Ollama.
- [ ] Audit de conformité RGAA complet : exigence du CDC, même si classée auparavant en bonus du MVP.

L’IA locale Ollama a été vérifiée réellement pendant cet audit ; un essai OpenAI réel reste optionnel pour satisfaire le choix « API OpenAI ou LLM local ». Les Word finaux et le diaporama restent à réaliser.
