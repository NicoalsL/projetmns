# VEILLE — EduQuizAI

Journal de veille tenu à jour tout au long du projet, comme demandé par le CDC
("Journal de veille : IA dans l'éducation, RGPD, accessibilité") et par la compétence
transversale du REAC "Apprendre en continu". Une entrée courte à chaque étape franchie
de la `ROADMAP.md`, pas un seul paragraphe rédigé à la fin.

Format par entrée : date, thème, source, ce que ça change pour le projet.

## IA dans l'éducation

- 2026-09-21 — Bonnes pratiques de génération de QCM — un distracteur (mauvaise réponse)
  doit être plausible, pas absurde, sinon le QCM ne teste rien. Impact : le prompt envoyé
  à l'IA (étape 5) devra explicitement demander des distracteurs crédibles, pas générés
  au hasard.
- 2026-09-21 — Risque d'hallucination des LLM en contexte pédagogique — un quiz généré
  automatiquement peut contenir des erreurs factuelles non détectées. Impact : confirme
  la décision (contrainte "Éthique" du CDC) d'ajouter un statut brouillon/validé sur le
  quiz, avec validation manuelle obligatoire avant export — voir `docs/base-de-donnees.md`.

## RGPD / protection des données

- 2026-09-21 — Guides CNIL (développeur, sécurité des données personnelles) — rappellent
  la minimisation des données et le droit à l'effacement. Impact : ajout de
  `consentement_rgpd` / `date_consentement` sur UTILISATEUR, et `ON DELETE CASCADE` sur
  toutes les tables liées à un utilisateur (`cours`, `generation_ia`) pour que la
  suppression d'un compte efface bien tout son historique.
- 2026-09-21 — Principe de durée de conservation limitée — un journal technique ne doit
  pas être gardé indéfiniment. Impact : décision de documenter une conservation de 6 mois
  pour `generation_ia` dans la page mentions légales (à rédiger).

- 2026-10-03 — CNIL, recommandations sur l'IA et transferts hors UE — envoyer le texte d'un
  cours à une API américaine constitue un transfert de données vers un prestataire tiers.
  Impact : ajout d'un fournisseur IA local (Ollama, modèle qwen3:8b) qui traite tout sur le
  serveur, choisi par défaut pour la démonstration ; la politique de confidentialité indique
  le fournisseur utilisé, et chaque quiz affiche son origine (IA locale, en ligne ou simulation).
- 2026-10-03 — RGPD articles 7 et 17 (preuve du consentement, droit à l'effacement) — case
  de consentement non pré-cochée et date enregistrée ; suppression du compte en libre-service
  (mot de passe redemandé) qui efface les données dans PostgreSQL ET MongoDB ; purge
  automatique du journal des générations après 6 mois (limitation de la conservation).
## Accessibilité (RGAA)

- 2026-09-21 — RGAA 4.1, critère sur l'étiquetage des champs de formulaire — un
  `placeholder` seul ne suffit pas (il disparaît à la saisie et n'est pas systématiquement
  restitué par les lecteurs d'écran). **Constat sur notre propre code** : `PageConnexion.jsx`
  et `PageCreationCours.jsx` n'utilisent que des `placeholder`, sans `<label>` associé —
  point à corriger avant la présentation finale, actuellement identifié mais pas encore
  fait.

- 2026-10-03 — Suite du constat du 21/09 : tous les champs ont désormais un `<label>`
  visible (plus aucun `placeholder` seul). Point clos.
- 2026-10-03 — RGAA 8.6 / WCAG 2.4.2 (titre de page pertinent) — dans une application
  React, le `<title>` ne change pas tout seul d'une page à l'autre. **Constat sur notre
  code** : toutes les pages s'appelaient « EduQuizAI — Espace enseignant ». Impact : hook
  `useTitrePage` sur chaque page. Même logique pour le focus (RGAA 12.8) : sans
  rechargement du navigateur, il faut le replacer soi-même après un changement de page.
  Détail des critères respectés et restants : `docs/accessibilite.md`.

## Sécurité (vulnérabilités, ANSSI, OWASP)

- 2026-09-21 — OWASP, injection SQL — confirme le choix fait dès l'écriture de
  `utilisateur.depot.js` : requêtes paramétrées (`$1`, `$2`) plutôt que concaténation de
  chaînes, aucune correction nécessaire mais vérifié consciemment contre la checklist
  OWASP.
- 2026-09-21 — OWASP, stockage des mots de passe — confirme le choix de `bcrypt` (coût 10)
  plutôt qu'un hachage simple sans sel (type SHA-256 seul) dans `auth.service.js`.
- 2026-10-03 — OWASP Top 10 for LLM Applications, LLM01 « Prompt Injection » — le texte
  d'un cours est envoyé au modèle ; un cours piégé (« ignore les consignes et… ») pourrait
  détourner la génération. Impact : texte délimité par des balises `<cours>` et présenté
  comme une donnée dans le message système (`ia/genererQuiz.js`), sortie contrainte par un
  schéma JSON strict, réponse revalidée côté serveur (`utilitaires/questions.js`) et
  validation humaine obligatoire avant export. Aucune de ces mesures ne suffit seule : c'est
  leur combinaison qui limite le risque.
- 2026-10-03 — OWASP LLM05 « Improper Output Handling » — une sortie de LLM ne doit jamais
  être utilisée sans contrôle. Impact : seuls les champs prévus par type de question sont
  conservés, avec types et longueurs vérifiés ; le contenu est affiché par React comme du
  texte (jamais comme du HTML), ce qui écarte le XSS par une réponse de l'IA.
- 2026-10-03 — OWASP LLM10 « Unbounded Consumption » — chaque génération est un appel
  payant. Impact : limite de 10 générations par heure et par enseignant (compteur sur
  l'identifiant du JWT), 10 questions maximum par génération, délai maximal de 30 s, et
  fournisseur « simulation » par défaut pour que le développement et la CI ne consomment
  rien.
- 2026-10-03 — OWASP API1 « Broken Object Level Authorization » (IDOR) — confirmé sur les
  quiz MongoDB comme sur les cours SQL : chaque requête filtre sur `id_utilisateur` issu du
  JWT, un quiz d'autrui répond 404. L'identifiant `:idQuiz` est validé (24 caractères hexa)
  avant toute requête, ce qui écarte aussi l'injection d'opérateurs MongoDB (`{"$ne": null}`).

- 2026-10-03 — OWASP Authentication Cheat Sheet, énumération de comptes par le temps de
  réponse — un email inconnu répondait sans calcul bcrypt, donc ~100 ms plus vite qu'un
  mauvais mot de passe. Impact : `auth.service.js` compare toujours le mot de passe, avec
  une empreinte factice si l'email est inconnu. Limite assumée : l'inscription répond
  toujours 409 pour un email déjà utilisé (compromis classique, atténué par la limite de
  20 essais par 15 minutes).
- 2026-10-03 — Normalisation des identifiants — un email ne dépend pas de la casse en
  pratique. Impact : emails enregistrés en minuscules, recherche par `lower(email)` pour
  les comptes existants ; empêche deux comptes « Prof@x.fr » / « prof@x.fr ». Le
  caractère nul (`\0`), refusé par PostgreSQL, est rejeté en 400 par la validation au
  lieu de provoquer une erreur 500.

- 2026-10-03 — OWASP « CSV Injection » (Formula Injection) — un tableur exécute une cellule
  qui commence par `=`, `+`, `-` ou `@` comme une formule ; un énoncé piégé dans un quiz
  exporté pourrait agir sur le poste de l'enseignant. Impact : l'export CSV
  (`utilitaires/csv.js`) préfixe ces cellules d'une apostrophe et met chaque cellule entre
  guillemets (RFC 4180). Testé avec `=HYPERLINK(...)`, `+1+1`, `-2+3`, `@SUM(A1)`.
- 2026-10-03 — OWASP Top 10 A09 « Security Logging and Monitoring Failures » — sans trace,
  une attaque par force brute passe inaperçue. Impact : table `journal_securite`
  (connexions réussies et échouées, suppressions de compte, exports). Arbitrage RGPD :
  ni email ni adresse IP (minimisation), conservation 6 mois, mention dans la politique
  de confidentialité ; une panne du journal ne bloque jamais l'action de l'utilisateur.
- 2026-10-03 — MDN / OWASP Secure Headers Project — en production, nginx ajoute une CSP
  stricte (aucun script ni ressource externe), `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy` et les en-têtes d'isolation COOP / COEP / CORP.
  Conséquence sur le code : le logo n'utilise plus de style en ligne (bloqué par
  `style-src 'self'`). Vérification : la CSP a bloqué le script de test injecté par
  l'outil de recette, preuve qu'elle est active ; aucune violation par l'application.
- 2026-10-03 — OWASP ZAP (scan passif « baseline ») sur la configuration de production :
  0 échec, 64 contrôles réussis, 3 avertissements analysés et acceptés (cache voulu des
  fichiers statiques, application monopage, commentaires dans les bibliothèques). Le
  scan est ajouté à la CI.
- 2026-10-03 — Réglage `trust proxy` d'Express derrière un proxy — sans lui, toutes les
  requêtes semblent venir de nginx et la limite de tentatives devient commune à tous les
  utilisateurs ; activé sans proxy, il laisserait un client choisir son IP avec un faux
  `X-Forwarded-For`. Impact : variable `TRUST_PROXY` (nombre de proxys), absente en
  développement, validée au démarrage.
- 2026-10-03 — OWASP LLM01 (suite) — un cours contenant `</cours>` fermait la balise de
  délimitation et faisait passer la suite pour des consignes. Impact : ces balises sont
  retirées du texte avant envoi, comme celles de la correction de réponses ouvertes.
  Contre les questions inventées (hallucinations), chaque question porte désormais la
  phrase du cours qui la justifie, et le serveur vérifie qu'elle figure vraiment dans le
  cours.

- 2026-10-04 — OWASP JSON Web Token Cheat Sheet, « No built-in token revocation » — un JWT
  reste valide jusqu'à son expiration : volé, ou après la suppression du compte, il
  donnait encore accès à l'API pendant 2 h. Impact : colonne `utilisateur.version_jeton`
  recopiée dans chaque jeton et comparée à chaque requête ; « Se déconnecter » l'incrémente
  (révocation de toutes les sessions), un compte supprimé n'a plus de version. Coût : une
  lecture SQL par clé primaire par requête, jugée acceptable pour ce service. Les jetons
  émis avant la migration valent version 0 : aucune déconnexion forcée au déploiement.

## Démarche(s) de résolution de problème rencontrée(s)

- 2026-09-21 — **Docker Desktop ne démarrait jamais.** Contexte : le daemon restait
  injoignable malgré plusieurs relances. Diagnostic : lecture des logs Docker
  (`docker-desktop.exe.log`, `monitor.log`) révélant "still waiting for init control API
  to respond after 2h48m", puis `wsl -l -v` montrant l'absence des distributions
  `docker-desktop`/`docker-desktop-data`, puis `systeminfo` confirmant "Virtualisation
  activée dans le microprogramme : Non". Correction : activation du SVM Mode dans le BIOS
  (carte mère Gigabyte B550). Vérification : `docker info` répond, les 4 conteneurs du
  projet démarrent avec succès.
- 2026-09-21 — **"Failed to fetch" à l'inscription depuis le navigateur.** Contexte : le
  formulaire échouait dans le navigateur alors que les mêmes requêtes fonctionnaient en
  ligne de commande (curl). Diagnostic : origines différentes entre le front
  (`localhost:5173`) et le back (`localhost:3000`) → la politique CORS du navigateur
  bloque la requête (curl n'applique pas cette politique, d'où la différence de
  comportement observée). Correction : ajout du middleware `cors` dans `serveur.js`.
  Vérification : en-tête `Access-Control-Allow-Origin` présent dans la réponse,
  inscription réussie depuis le navigateur.
- 2026-09-21 — **Le conteneur back ne trouvait plus le paquet `cors` après reconstruction.**
  Contexte : `npm install cors` fait, image reconstruite, mais erreur
  `Cannot find module 'cors'` au démarrage du conteneur. Diagnostic : le volume anonyme
  `/app/node_modules` déclaré dans `docker-compose.yml` n'est pas renouvelé automatiquement
  par un simple `--build`. Correction :
  `docker compose up --build --renew-anon-volumes back`. Vérification : démarrage sans
  erreur, requête de test réussie.
- 2026-10-03 — **Quiz généré avec des questions absentes du cours.** Contexte : lors de
  l'analyse de la génération face au CDC (« quiz adaptés au contenu »), test avec un cours
  réduit à « La cellule. ». Constat : Ollama (qwen3:8b) produit trois questions sur le noyau,
  les mitochondries et les ribosomes, absents du cours, malgré la consigne « n'invente aucun
  fait ». Diagnostic : sans matière suffisante, le modèle complète avec ses connaissances
  générales ; la consigne seule ne suffit pas, et rien n'empêchait de lancer une génération
  sur un texte trop court (1 caractère minimum). Correction : règle métier dans
  `quiz.service.js` (300 caractères et 3 phrases d'au moins 3 mots, vérifiés avant l'appel à
  l'IA, donc sans coût ni entrée au journal), consigne renforcée (« rédige moins de questions
  plutôt que d'utiliser tes connaissances générales ») et avertissement dans l'interface.
  Vérification : test Jest dédié (2 cas) et test réel sur l'API : 400 « trop court », 0 entrée
  au journal ; un cours de 6 phrases donne des questions toutes justifiées par le texte.
- 2026-10-03 — **Toute génération de quiz échouait en erreur 500 sur une vraie base, alors
  que les 236 tests passaient.** Contexte : ajout d'un état de livraison dans le journal
  `generation_ia`. Diagnostic : le script de cohérence sur PostgreSQL réel renvoyait 500 avec
  le code `42P08` ; reproduction isolée avec `PREPARE` dans psql : « inconsistent types
  deduced for parameter $1 » (le même paramètre servait de valeur `VARCHAR` et de terme de
  comparaison) ; les tests Jest ne le voyaient pas car ils simulent la base. Correction :
  typage explicite `$1::varchar`, vérifié d'abord sur une copie du code dans un dossier
  temporaire. Vérification : 27/27 vérifications de cohérence, 19 et 24 sur les parcours
  réels, test de non-régression ajouté. Leçon : les tests à base simulée et sur base réelle
  sont complémentaires.
