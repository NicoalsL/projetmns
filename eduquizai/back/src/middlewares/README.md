# `middlewares/` — les contrôles avant le traitement

Un middleware est une fonction `(requete, reponse, suite)`. Il laisse passer
(`suite()`) ou bloque (`reponse.status(4xx)`). C'est le dossier **le plus
important pour la sécurité**.

| Fichier | Rôle | Refus |
|---|---|---|
| `authentification.js` | Vérifie le jeton JWT en 4 étapes et range l'identité dans `requete.utilisateur`. | 401 |
| `validation.js` | Inscription, connexion, suppression de compte. | 400 |
| `validationCours.js` | Titre et texte d'un cours, identifiant dans l'adresse. | 400 |
| `validationQuiz.js` | Paramètres de génération, identifiant de quiz, révision, format d'export, modifications. | 400 |
| `limitationAuth.js` | Fabrique de limiteurs (X essais par période). | 429 |
| `limiteursIa.js` | Quotas IA par enseignant : 10 générations/h, 30 corrections/h. | 429 |
| `gestionErreurs.js` | Dernier maillon : transforme toute erreur en réponse JSON propre. | 4xx/500 |

## Choix de sécurité

- **JWT** (`authentification.js`) :
  1. présence de l'en-tête `Bearer` ;
  2. signature et expiration, **algorithme imposé HS256** (refus de l'attaque `alg: none`) ;
  3. identifiant = entier positif ;
  4. **révocation** : la version du jeton doit égaler `version_jeton` en base
     (déconnexion = version + 1 → tous les anciens jetons refusés).
- **Corps reconstruit** : après validation, `requete.body` ne contient QUE les champs
  attendus. Un champ ajouté (`"role": "admin"`, `"id_utilisateur": 7`) disparaît.
- **Listes fermées** pour niveau, difficulté, types, format : aucun texte libre
  n'arrive dans les consignes de l'IA.
- **Caractère nul `\0` refusé** : PostgreSQL le rejette, on évite une erreur 500.
- **Mot de passe ≤ 72 octets** : au-delà, bcrypt ignore la fin.
- **Identifiants** : entier positif pour un cours, 24 caractères hexadécimaux pour
  un quiz → bloque `1 OR 1=1` et `{"$ne": null}` avant la base. Le type « texte » est
  vérifié d'abord (style défensif, ajouté après un plantage trouvé par le fuzzing).
- **Fuzzing** : `tests/fuzzing.test.js` envoie 400 valeurs piégées à chaque contrôle ; aucun ne
  doit planter, et un corps accepté ne contient que les champs prévus.
- **Force brute** : 20 essais / 15 min par adresse IP sur `/api/auth`, réponse 429
  avec `Retry-After`. Garde-fou mémoire (10 000 adresses suivies au maximum).
- **Erreurs** : seules les erreurs métier (`instanceof ErreurMetier`) montrent leur message ;
  les autres deviennent « Erreur interne du serveur », et le journal n'enregistre
  que le type d'erreur (jamais la requête, qui peut contenir un mot de passe).

## Limite connue (à assumer)

Les compteurs des limiteurs sont **en mémoire** : propres à un serveur et remis à
zéro au redémarrage. Avec plusieurs serveurs, il faudrait un stockage partagé (Redis).
