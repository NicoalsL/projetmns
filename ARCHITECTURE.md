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

## IA générative : LLM local (Ollama) ou API OpenAI, interchangeables

Le service métier n'appelle que le module `back/src/ia/genererQuiz.js`, par deux fonctions :
`genererQuiz` (questions d'un quiz, ou une seule question lors d'une régénération) et
`evaluerReponse` (avis sur une réponse rédigée, mode « Tester le quiz »). Le module délègue
à un **fournisseur** choisi par la variable `IA_FOURNISSEUR` :

| Fournisseur | Intérêt | Limite |
|---|---|---|
| `ollama` (modèle `qwen3:8b`) | Gratuit ; le texte des cours ne quitte pas la machine (argument RGPD fort pour des établissements scolaires) | Plus lent : ≈ 20 à 35 s pour 3 à 4 questions sur la carte graphique de développement |
| `openai` (`gpt-4o-mini`) | Rapide, qualité élevée | Payant ; texte des cours transmis à un prestataire hors UE |
| `simulation` | Développement, tests et CI sans IA ni coût | Questions mécaniques, clairement signalées |

Chaque fournisseur expose la même interface (`genererQuestions`, `evaluerReponse`). Les deux
vrais fournisseurs reçoivent les mêmes schémas JSON (`ia/schemaReponse.js`,
`ia/schemaCorrection.js`) et leur réponse passe par la même validation
(`utilitaires/questions.js`) ; chaque citation du cours renvoyée par l'IA est en plus
vérifiée dans le texte du cours. Passer de l'un à l'autre
ne modifie ni le service, ni les routes, ni le front : c'est le patron **Stratégie**, et la
démonstration concrète d'une architecture qui anticipe le changement.

## Authentification : JWT

Standard de l'industrie, sans état côté serveur (pas de session à stocker), explicitement
demandé par le CDC ("Authentification JWT / sécurisation API / RGPD").

Limite d'un JWT : il reste valide jusqu'à son expiration, même volé ou après la suppression
du compte. Compromis retenu : chaque compte porte un numéro `version_jeton`, recopié dans le
jeton. Le middleware le compare à la base à chaque requête (une lecture par clé primaire) ;
« Se déconnecter » l'incrémente, ce qui révoque d'un coup tous les jetons du compte, et un
compte supprimé n'a plus de version. On garde la simplicité du JWT, avec une révocation réelle.

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
