# ARCHITECTURE — choix techniques justifiés

Ce document explique le **pourquoi** de chaque choix technique du projet EduQuizAI, pour
pouvoir le défendre à l'oral (entretien technique) et l'intégrer tel quel dans la section
"architecture logicielle" du dossier de projet.

## Convention de code

- **Noms de variables et de fonctions en français** : candidat et jury sont francophones,
  le code doit rester lisible directement pendant l'entretien technique sans effort de
  traduction mentale.
- **Un commentaire court avant chaque bloc de code critique** (sécurité, logique métier
  sensible, calcul non trivial) qui explique le *pourquoi*, jamais le *quoi* (le code déjà
  lisible dit le quoi). Pas de commentaire sur du code trivial (un simple accesseur, un
  appel direct).
- Le vocabulaire professionnel anglais n'est pas oublié pour autant : il est démontré
  ailleurs (README technique, veille, questionnaire d'examen en anglais) — voir le point
  de vigilance "anglais technique" dans `ROADMAP.md`.

## Back-end : Node.js + Express

Même langage que le front (JavaScript) : un seul écosystème à maîtriser et à présenter à
l'oral, moins de contexte à changer entre les extraits de code du dossier. Express reste
minimaliste (pas de magie cachée), ce qui facilite l'explication de l'architecture en
couches face au jury. Correspond à l'une des deux options proposées par le CDC.

## Front-end : React

Proposé explicitement par le CDC, écosystème très documenté, composants réutilisables
faciles à présenter un par un dans le dossier (captures d'écran + code correspondant). Le
style est géré en CSS classique, par composant, sans dépendance supplémentaire à justifier
à l'oral.

## Base de données relationnelle : PostgreSQL

Les données "utilisateurs" et "cours" ont une structure fixe et des relations claires
(un enseignant a plusieurs cours) : un modèle relationnel classique (MCD/MPD/SQL) est le
choix naturel, et c'est ce que la compétence REAC "Concevoir et mettre en place une base de
données relationnelle" attend explicitement. PostgreSQL est open source, robuste, et
largement utilisé en entreprise.

## Base de données NoSQL : MongoDB

Les quiz générés par l'IA n'ont pas tous la même structure : un QCM a des distracteurs, un
vrai/faux a une explication, une question ouverte a un texte libre. Plutôt que de forcer
ces formats différents dans des tables rigides, ils sont stockés en documents JSON dans
MongoDB. Ce choix n'est pas arbitraire : il couvre directement la compétence REAC
"Développer des composants d'accès aux données SQL et NoSQL", et il correspond à la
suggestion du CDC ("MongoDB, flexible pour les quiz").

## IA générative : API OpenAI

Rapide à intégrer, qualité de génération élevée et documentation abondante : permet de se
concentrer sur l'intégration et la sécurisation de l'appel plutôt que sur l'hébergement d'un
modèle. Le service métier qui appelle l'IA est isolé dans une seule fonction (`genererQuiz`
par exemple), ce qui permettrait de brancher un LLM local (Ollama) sans toucher au reste de
l'application — point mentionné dans la veille et utile à l'oral pour montrer une
architecture qui anticipe le changement.

## Authentification : JWT

Standard de l'industrie, sans état côté serveur (pas de session à stocker), explicitement
demandé par le CDC ("Authentification JWT / sécurisation API / RGPD").

## Conteneurisation : Docker + docker-compose

Reproduire le même environnement en développement et en production, condition posée par la
compétence REAC "Installer et configurer son environnement de travail en fonction du projet"
et par la démarche DevOps. `docker-compose` permet de démarrer front, back, PostgreSQL et
MongoDB en une seule commande — utile aussi pour la démonstration le jour de l'oral.

## CI/CD : GitHub Actions

Intégré nativement au dépôt Git (pas d'outil externe à configurer), gratuit, et le fichier
YAML du pipeline est court à commenter et à inclure dans le dossier de projet. Couvre la
compétence "Contribuer à la mise en production dans une démarche DevOps".

## Tests : Jest + Postman

Jest est le standard de l'écosystème Node.js et permet de simuler ("mocker") l'appel à
l'API OpenAI pour des tests rapides, déterministes et gratuits (pas d'appel réel payant à
chaque exécution des tests). Postman sert à documenter le jeu d'essai sur l'API (entrée /
attendu / obtenu) et les tests de sécurité de base, exigés par le REAC.

## Architecture logicielle en couches

Présentation (React) → Métier (services Express : validation, orchestration) → Accès
données (repositories SQL et NoSQL séparés) → Module IA (isolé derrière une interface pour
rester interchangeable). Le détail (schéma, rôle de chaque couche, stratégie de sécurité) se
construit à l'étape 2 de `ROADMAP.md` et vient enrichir ce document le moment venu.
