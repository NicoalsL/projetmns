# Conventions du projet EduQuizAI

Règles communes à toute personne ou tout assistant (Claude Code, Codex…) qui modifie ce
dépôt. Ce projet est un **projet d'examen CDA** : le candidat doit pouvoir lire, expliquer
et défendre chaque ligne devant le jury pendant l'entretien technique. La lisibilité passe
donc avant la concision.

Documents de référence : `ARCHITECTURE.md` (choix techniques), `ROADMAP.md` (étapes),
`FONCTIONNALITES.md` (périmètre), `eduquizai/docs/` (conception, plan de tests).

## Langue et nommage

- Code, variables, fonctions, messages et commentaires **en français** (`requete`,
  `reponse`, `suite`, `utilisateur`…). Garder les noms imposés par les bibliothèques.
- Noms explicites, pas d'abréviations obscures : `numeroTentative` plutôt que `n`,
  `reponse` plutôt que `r` (sauf variables de boucle triviales et `e` dans un `catch`).
- Fichiers back : `<entite>.<couche>.js` (`cours.service.js`). Pages front : `PageXxx.jsx`.

## Style de code

- **Une instruction par ligne.** Interdit : `try { ... } catch { ... }` sur une ligne,
  plusieurs `expect(...)` séparés par `;` sur une même ligne, `if (...) return` suivi
  d'autres instructions sur la même ligne.
- Lignes de **120 caractères maximum** ; au-delà, découper (une condition par ligne,
  un argument par ligne, une requête SQL multi-ligne avec des backticks).
- Espaces normaux autour des opérateurs, après les virgules et dans les objets :
  `{ method: 'GET', body }`, jamais `{method:'GET',body}`.
- Une ligne vide entre deux fonctions et entre les blocs logiques d'une fonction.
- Back (CommonJS) : point-virgule en fin d'instruction. Front (ESM/JSX) : pas de
  point-virgule, comme le reste du front.
- Constantes nommées pour les limites et valeurs magiques, avec leur origine :
  `const LONGUEUR_MAX_TITRE = 200; // = VARCHAR(200) dans schema.sql`.
- JSX : un attribut par ligne dès qu'un élément en a plus de trois ; blocs conditionnels
  sur plusieurs lignes entre parenthèses.

## Commentaires

- Un commentaire court en tête de chaque fichier ou fonction non triviale qui explique
  son **rôle**, et avant chaque bloc critique (sécurité, logique métier, calcul) qui
  explique le **pourquoi**, jamais le quoi.
- Pas de commentaire sur du code évident.
- **Ne jamais supprimer un commentaire existant** lors d'une modification, sauf s'il est
  devenu faux (dans ce cas, le corriger).

## Architecture (ne pas contourner)

```
routes -> middlewares (auth, validation) -> controleurs -> services -> depots -> PostgreSQL / MongoDB
                                                              \-> ia/genererQuiz.js -> ia/fournisseurs/*
```

- **Routes** : déclarent les URL et enchaînent les middlewares, aucune logique.
- **Contrôleurs** : traduisent HTTP <-> service (statut, corps), aucune règle métier.
- **Services** : règles métier, erreurs métier (`Object.assign(new Error(...), { status, exposer: true })`).
- **Dépôts** : seuls fichiers qui parlent SQL ou MongoDB. Requêtes **toujours paramétrées**.
- **Module IA** : seul `ia/genererQuiz.js` est appelé par les services ; le fournisseur
  (OpenAI, Ollama…) reste interchangeable.

## Sécurité (règles non négociables)

- Toute entrée est validée par un middleware avant le contrôleur (type, longueur, format).
- L'identité vient **uniquement** du JWT (`requete.utilisateur.id_utilisateur`), jamais du corps.
- Toute requête sur une ressource d'un utilisateur filtre sur son propriétaire **dans la
  requête SQL elle-même** ; une ressource d'autrui renvoie 404 comme une ressource absente.
- Jamais de secret, de mot de passe ni de détail SQL dans les réponses ou les logs.
- Jamais de clé API ni de `.env` commité.

## Tests

- Tout nouveau composant back a ses tests Jest (cas nominal, entrées invalides, sécurité).
- Tests lisibles : un `describe` par composant, noms de tests en français qui décrivent le
  comportement attendu, structure préparer / agir / vérifier séparée par des lignes vides.
- Les appels réseau payants (API OpenAI) sont **toujours simulés** dans les tests.
- Avant de rendre la main : `npm test` (back et front), `npm run lint` et `npm run build`
  (front) doivent passer.

## Git

- Ne jamais commiter `instructction/` (documents d'examen confidentiels), `.env`,
  `node_modules/`, `dist/`, ni les fichiers techniques de `audit/` (seuls les `.md`).
- Pas de `git add -A` à l'aveugle : vérifier `git status` avant chaque commit.
- Pas de `push`, de `push --force` ni de réécriture d'historique sans accord explicite
  du candidat.
- Messages de commit en français, à l'impératif, décrivant le changement fonctionnel.

## Travail entre assistants

- **Un seul assistant modifie le code à la fois.**
- Avant de modifier un fichier, le relire en entier : un autre assistant a pu le changer.
- Ne pas annuler un choix d'un autre assistant sans le signaler dans le rapport de fin.
- Après chaque livraison : mettre à jour les cases de `ROADMAP.md` et `FONCTIONNALITES.md`,
  et ajouter une entrée dans `VEILLE.md` si une vulnérabilité ou un choix de sécurité est
  concerné.
