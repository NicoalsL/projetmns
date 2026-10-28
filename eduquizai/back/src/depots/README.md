# `depots/` — le seul accès aux bases de données

Patron **Dépôt** (*Repository*) : seuls ces fichiers écrivent du SQL ou parlent à
MongoDB. Changer de base ne toucherait que ce dossier.

| Fichier | Base | Contenu |
|---|---|---|
| `depotPostgres.js` | PostgreSQL | **classe mère abstraite** : requête paramétrée, lecture d'une ou plusieurs lignes, transaction |
| `journalPostgres.js` | PostgreSQL | **classe intermédiaire abstraite** des deux journaux : purge RGPD à 6 mois |
| `utilisateur.depot.js` | PostgreSQL | comptes, `version_jeton`, suppression (cascade) |
| `cours.depot.js` | PostgreSQL | CRUD des cours, transaction avec verrou `FOR UPDATE` |
| `generationIa.depot.js` | PostgreSQL | journal des appels à l'IA, purge après 6 mois |
| `journalSecurite.depot.js` | PostgreSQL | journal de sécurité, purge après 6 mois |
| `nettoyageQuiz.depot.js` | PostgreSQL | file des quiz à effacer dans MongoDB |
| `quiz.depot.js` | MongoDB | quiz et questions, `revision` (verrou optimiste) |

## La POO dans ce dossier

```
DepotPostgres (abstraite) : executer(), trouverUne(), trouverToutes(), avecTransaction()
 ├── CoursDepot          (+ avecCoursVerrouille)
 ├── UtilisateurDepot
 ├── NettoyageQuizDepot
 └── JournalPostgres (abstraite) : purgerAnciens()
      ├── GenerationIaDepot
      └── JournalSecuriteDepot
QuizDepot (MongoDB) : pas de classe mère, c'est le seul dépôt de sa famille
```

Chaque fichier exporte **une seule instance** (`module.exports = new CoursDepot()`), partagée
par toute l'application. Les dépôts renvoient les lignes de la base ; les services en font
des objets métier (`new Cours(ligne)`, voir `modeles/`).

## Choix de sécurité

- **Requêtes paramétrées** (`$1`, `$2`) : les valeurs ne sont jamais collées dans le
  texte SQL → **pas d'injection SQL**.
  ```js
  pool.query('SELECT ... FROM cours WHERE id_cours = $1 AND id_utilisateur = $2', [idCours, idUtilisateur]);
  ```
- **Propriétaire dans la requête** : `AND id_utilisateur = $2` sur chaque lecture,
  modification et suppression. Vérifier puis supprimer se fait **en une seule
  requête** : aucun intervalle exploitable entre les deux.
- **MongoDB** : valeurs typées (`new ObjectId(...)`, nombres) → **pas d'injection NoSQL** ;
  chaque filtre contient `id_utilisateur`.
- **Liste des cours sans le texte** (jusqu'à 50 000 caractères) : moins de données
  transférées (éco-conception).
- **RGPD** : purge des journaux après 6 mois (`purgerAnciens()`, héritée de `JournalPostgres`),
  consentement enregistré avec sa date (preuve, article 7).

## À retenir

- `avecCoursVerrouille` : transaction `BEGIN … FOR UPDATE … COMMIT`. Pendant l'écriture
  du quiz, une suppression du cours **attend**, donc pas de quiz orphelin.
- `findOneAndUpdate` avec `revision` + `$inc` : comparer et modifier en une seule
  opération (verrou optimiste).
