# `config/` — réglages et connexions aux bases

Tout ce qui doit être prêt **avant** de traiter la première requête.

| Fichier | Rôle |
|---|---|
| `environnement.js` | Vérifie les variables d'environnement au démarrage ; refuse de démarrer si l'une est fausse. |
| `postgres.js` | « Pool » de connexions PostgreSQL partagé par tous les dépôts (délais : 5 s connexion, 10 s requête). |
| `mongo.js` | Connexion MongoDB et accès à la collection `quiz`. |
| `schema.sql` | Création des 5 tables, contraintes, index et déclencheur de nettoyage. |
| `verificationSchema.js` | Vérifie que les 5 tables existent, et que l'API utilise un compte **restreint**. |

## Choix de sécurité

- **Échouer tôt** : une configuration dangereuse arrête le serveur au démarrage
  avec un message clair, plutôt que de tourner en mode dégradé.
- **Secret JWT robuste** : au moins 64 caractères hexadécimaux (généré par
  `npm run config:init`). Un secret faible permettrait de fabriquer de faux jetons.
- **Ollama** : HTTP accepté seulement en local (`localhost`, `host.docker.internal`…) ;
  vers une autre machine, **HTTPS obligatoire**, sinon les cours circuleraient en clair.
- **Clé OpenAI** exigée seulement si `IA_FOURNISSEUR=openai` ; elle vient du `.env`,
  jamais commité.
- **La base se protège elle-même** (`schema.sql`) :
  - `UNIQUE` sur l'email : pas de doublon, même avec deux inscriptions simultanées ;
  - `CHECK` : listes fermées de valeurs (statut, type d'événement, livraison) ;
  - `ON DELETE CASCADE` : supprimer un compte supprime ses cours et son journal IA (RGPD) ;
  - le journal de sécurité ne contient ni email ni adresse IP (minimisation RGPD).

- **Moindre privilège** : l'API se connecte avec `eduquizai_app`, qui peut seulement lire et
  écrire des lignes (ni `DROP`, ni `CREATE`, ni création de compte ; journal de sécurité non
  modifiable). Le compte propriétaire ne sert qu'à `npm run db:init`
  (`scripts/initialiser-base.js`). Au démarrage, l'API refuse en production un compte
  d'administration (`compteApiEstRestreint()`).

## À retenir

- Pourquoi **deux bases** ? PostgreSQL pour les données structurées et liées
  (comptes, cours, journaux : clés étrangères, transactions). MongoDB pour les quiz :
  un quiz est un document avec une liste de questions de formes différentes.
- Le **déclencheur** `suppression_cours_nettoyage` écrit une demande dans
  `nettoyage_quiz` quand un cours est supprimé : les quiz MongoDB seront effacés
  même si MongoDB est en panne à ce moment-là.
