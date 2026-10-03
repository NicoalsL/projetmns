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
- [ ] Lister les quiz générés
- [x] Supprimer son cours après confirmation
- [ ] Supprimer un quiz
- [ ] Modifier un quiz généré (au moins une question) — pour couvrir la compétence
      "accès aux données en consultation, modification, création, suppression"

- [ ] Page "mentions légales" / politique de confidentialité RGPD — explicitement exigée
      par le REAC (compétence "Développer des interfaces utilisateur"), simple page statique.
      Doit préciser la durée de conservation du journal `generation_ia` (ex : 6 mois)

**Additionnelles**
- [ ] Import de fichiers (PDF, Word) en plus du texte collé
- [ ] Historique avec recherche / filtres / tri
- [ ] Éditeur de texte riche (Markdown ou WYSIWYG) pour la rédaction du cours
- [ ] Partage d'un cours ou d'un quiz entre enseignants
- [ ] Gestion de rôles (admin / enseignant)

## b. Module IA

**Essentielles**
- [ ] Génération automatique de quiz à partir du texte du cours (appel API OpenAI)
- [ ] Au moins 2 types de questions générées : QCM avec distracteurs + Vrai/Faux avec explication
- [ ] Gestion des erreurs de l'appel IA (timeout, réponse invalide)
- [ ] Journal des générations (`generation_ia`) : trace chaque appel IA (statut, durée,
      nombre de questions) — sert de preuve du critère de performance CDC (< 5 s) et
      d'historique visible par l'enseignant
- [ ] Statut brouillon/validé sur le quiz + validation manuelle obligatoire avant export —
      contrainte "Éthique" du CDC, au même rang que sécurité/performance/accessibilité,
      pas un bonus

**Additionnelles**
- [ ] Type de question "question ouverte" avec évaluation automatique
- [ ] Choix du modèle IA (bascule OpenAI / LLM local type Ollama)
- [ ] Réglage du nombre de questions / niveau de difficulté
- [ ] Limitation de quota d'appels IA par utilisateur (rate limiting)

## c. Back-end

**Essentielles**
- [x] Base de données utilisateurs et cours (PostgreSQL, relationnel)
- [ ] Stockage des quiz générés (MongoDB, NoSQL)
- [ ] API REST sécurisée reliant front / back / module IA
- [ ] Validation systématique des entrées côté serveur

**Additionnelles**
- [ ] Export JSON du quiz (celui-ci reste conseillé même en MVP si le temps le permet, sinon en bonus)
- [ ] Export PDF / CSV du quiz
- [ ] Journalisation (logs) des actions sensibles
- [ ] Sauvegarde automatique planifiée de la base de données

## d. Front-end

**Essentielles**
- [x] Écran de connexion / inscription
- [x] Écran dashboard listant les cours
- [x] Écran de création de cours (formulaire texte simple)
- [ ] Écran d'affichage du quiz généré (lecture + édition basique)
- [ ] Interface claire et lisible (accessibilité de base : contrastes, labels de formulaire)

**Additionnelles**
- [ ] Visualisation dynamique avancée (animations, aperçu en temps réel pendant la génération)
- [ ] Conformité RGAA 4.1 complète (audit dédié)
- [ ] Thème sombre / clair
- [ ] Interface multilingue

## Sécurité, tests, déploiement (transverses)

**Essentielles**
- [x] Mots de passe hashés, JWT pour les sessions
- [ ] Protection basique contre injection SQL / XSS (paramétrage des requêtes, échappement)
- [x] Tests unitaires et HTTP sur l'authentification et les cours
- [ ] Tests du service de génération de quiz
- [x] Tests SQL/XSS documentés sur les cours — `eduquizai/docs/plan-tests.md`
- [x] Dockerisation front + back + bases de données
- [x] Fichier de pipeline GitHub Actions (lint, tests, build) ; exécution distante encore à vérifier

**Additionnelles**
- [ ] Scan de sécurité automatisé (OWASP ZAP) intégré à la CI
- [ ] Déploiement automatisé (CD) vers un environnement en ligne
- [ ] Tests de charge
- [ ] Monitoring / alerting en production

## Documents transverses (obligatoires, hors code)

Livrables explicitement demandés par le CDC ou le REAC, à ne pas oublier car ils ne sont
pas du "code" et passent facilement à la trappe :

- [ ] `VEILLE.md` — journal de veille tenu à jour tout au long du projet (IA en éducation,
      RGPD, accessibilité, sécurité), pas rédigé d'un coup à la fin
- [ ] Documentation utilisateur (guide court d'usage de l'application)
- [ ] Au moins un exemple documenté de démarche de résolution de problème (bug rencontré,
      diagnostic, correction, vérification)
