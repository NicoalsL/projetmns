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

## Accessibilité (RGAA)

- 2026-09-21 — RGAA 4.1, critère sur l'étiquetage des champs de formulaire — un
  `placeholder` seul ne suffit pas (il disparaît à la saisie et n'est pas systématiquement
  restitué par les lecteurs d'écran). **Constat sur notre propre code** : `PageConnexion.jsx`
  et `PageCreationCours.jsx` n'utilisent que des `placeholder`, sans `<label>` associé —
  point à corriger avant la présentation finale, actuellement identifié mais pas encore
  fait.

## Sécurité (vulnérabilités, ANSSI, OWASP)

- 2026-09-21 — OWASP, injection SQL — confirme le choix fait dès l'écriture de
  `utilisateur.depot.js` : requêtes paramétrées (`$1`, `$2`) plutôt que concaténation de
  chaînes, aucune correction nécessaire mais vérifié consciemment contre la checklist
  OWASP.
- 2026-09-21 — OWASP, stockage des mots de passe — confirme le choix de `bcrypt` (coût 10)
  plutôt qu'un hachage simple sans sel (type SHA-256 seul) dans `auth.service.js`.

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
