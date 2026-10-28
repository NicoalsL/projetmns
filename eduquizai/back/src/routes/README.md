# `routes/` — les adresses de l'API

Chaque fichier déclare des adresses et la **liste des étapes** à traverser.
Aucune logique ici : seulement l'ordre des contrôles.

| Fichier | Préfixe | Adresses |
|---|---|---|
| `auth.routes.js` | `/api/auth` | `POST /inscription`, `POST /connexion` |
| `compte.routes.js` | `/api/compte` | `DELETE /` (supprimer son compte), `POST /deconnexion`, `POST /session` (prolonger) |
| `cours.routes.js` | `/api/cours` | CRUD des cours, `GET /:id/quiz`, `GET /:id/generations`, `POST /:id/quiz` (générer) |
| `quiz.routes.js` | `/api/quiz` | lire, modifier, valider, exporter, supprimer, régénérer ou corriger une question |

Exemple de lecture d'une route :

```js
routeur.post('/:id/quiz', validerIdentifiantCours, validerGeneration, limiteurGeneration, quizControleur.generer);
//           adresse      1. id valide ?          2. paramètres ?     3. quota ?          4. traitement
```

## Choix de sécurité

- **Jeton vérifié en premier** (`routeur.use(verifierJeton)`) sur cours, quiz et
  compte, **avant même de lire le corps** : un inconnu ne fait pas travailler le serveur.
- **Taille maximale du corps** adaptée à chaque famille : 16 ko (auth, compte),
  64 ko (quiz), 512 ko (cours). Bloque les requêtes géantes.
- **Validation avant les limiteurs** : une demande mal formée est refusée sans
  consommer le quota d'IA de l'enseignant.
- **Suppression de compte** : limiteur dédié + mot de passe redemandé.
