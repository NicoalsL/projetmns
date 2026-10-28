# `src/` — le code du serveur (API)

Architecture **en couches**. Chaque requête traverse les couches dans l'ordre, et
chaque couche a un seul métier :

```
navigateur
   │  HTTP (JSON)
   ▼
app.js ──► routes/ ──► middlewares/ ──► controleurs/ ──► services/ ──► depots/ ──► PostgreSQL / MongoDB
 (assemble)  (adresses)  (contrôles)     (HTTP <-> métier)  (règles)       (requêtes)
                                                               │
                                                               ├──► modeles/ (Cours, Quiz, Question, Utilisateur)
                                                               └──► ia/genererQuiz.js ──► ia/fournisseurs/*
```

Image : un restaurant. La **route** est la porte d'entrée, le **middleware** est le
vigile (il vérifie l'identité et la commande), le **contrôleur** est le serveur
(il prend la commande et rapporte l'assiette), le **service** est le chef
(il applique les recettes), le **dépôt** est le magasinier (seul à entrer dans
la réserve = la base de données).

| Dossier / fichier | Rôle en une phrase |
|---|---|
| `serveur.js` | Démarre le processus : vérifie la configuration, la base, puis ouvre le port. |
| `app.js` | Assemble l'application Express : sécurité globale, routes, gestion des erreurs. |
| [`config/`](config/README.md) | Connexions aux bases, schéma SQL, vérification des réglages au démarrage. |
| [`routes/`](routes/README.md) | Liste des adresses de l'API et ordre des contrôles pour chacune. |
| [`middlewares/`](middlewares/README.md) | Contrôles avant le contrôleur : jeton, validation des données, limites. |
| [`controleurs/`](controleurs/README.md) | Traduit HTTP en appel de service, puis le résultat en réponse HTTP. |
| [`services/`](services/README.md) | Orchestration : propriété, appels à l'IA et aux dépôts, erreurs métier. |
| [`modeles/`](modeles/README.md) | Classes métier alignées sur le MCD : `Cours`, `Quiz`, `Question` (+ 3 types), `Utilisateur`. |
| [`depots/`](depots/README.md) | Seuls fichiers qui écrivent du SQL ou parlent à MongoDB. |
| [`ia/`](ia/README.md) | Consignes envoyées à l'IA, choix du fournisseur, contrôle de la réponse. |
| [`utilitaires/`](utilitaires/README.md) | Outils partagés : règles d'une question, export CSV et PDF, erreurs. |

## Les grands choix de sécurité (vue d'ensemble)

1. **Identité = jeton uniquement.** L'enseignant est reconnu par son JWT signé ;
   un identifiant envoyé par le navigateur est toujours ignoré.
2. **Tout est validé à l'entrée** (middlewares) : type, longueur, format, listes fermées.
3. **Propriété vérifiée dans la requête elle-même** (`WHERE ... AND id_utilisateur = $2`) :
   la ressource d'un autre renvoie **404**, comme si elle n'existait pas.
4. **Requêtes paramétrées** partout : pas d'injection SQL ni NoSQL, et **moindre privilège** :
   l'API utilise un compte de base qui ne peut ni supprimer ni créer de table.
5. **L'IA n'est jamais crue sur parole** : réponse revalidée, citations vérifiées,
   relecture humaine obligatoire avant export.
6. **Aucun détail technique** dans les réponses ni dans les journaux (`gestionErreurs.js`).
7. **Limites de débit** : force brute sur la connexion, abus de l'IA.

## Programmation orientée objet

Quatre hiérarchies, chacune avec une classe mère abstraite :

| Hiérarchie | Classe mère → classes filles |
|---|---|
| Questions | `Question` → `QuestionQcm`, `QuestionVraiFaux`, `QuestionOuverte` |
| Erreurs | `ErreurMetier` → `ErreurDonneesInvalides` (→ `ErreurQuestion`), `ErreurNonAuthentifie`, `ErreurAccesRefuse`, `ErreurIntrouvable`, `ErreurConflit`, `ErreurServiceIa` |
| Dépôts | `DepotPostgres` → `CoursDepot`, `UtilisateurDepot`, `NettoyageQuizDepot`, `JournalPostgres` (→ `GenerationIaDepot`, `JournalSecuriteDepot`) |
| Fournisseurs d'IA | `FournisseurIa` → `FournisseurDistant` (→ `FournisseurOpenai`, `FournisseurOllama`), `FournisseurSimulation` |

Règle : une classe mère seulement pour une vraie relation « est un ». `Cours`, `Quiz` et
`Utilisateur` n'ont rien en commun : pas de classe mère forcée. Diagrammes UML :
`documentation/conception/diagrammes.md`.

Repère dans le code : les blocs importants pour la sécurité commencent par
`// SÉCURITÉ —`. Pour les retrouver tous : `grep -rn "SÉCURITÉ" src`.
