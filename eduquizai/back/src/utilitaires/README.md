# `utilitaires/` — outils partagés

| Fichier | Rôle | Utilisé par |
|---|---|---|
| `questions.js` | Règles sur une **liste** de questions (nombre, répartition des types) ; une question se valide dans sa classe (`modeles/question.modele.js`). | validationQuiz, genererQuiz |
| `csv.js` | Export CSV (séparateur `;`, BOM UTF-8 pour Excel). | quiz.controleur |
| `pdf.js` | Export PDF **balisé** (accessible, RGAA 13.3) avec pdfkit. | quiz.controleur |
| `erreurs.js` | Hiérarchie de classes d'erreur : `ErreurMetier` (abstraite) et ses 6 classes filles (une par statut HTTP), `ErreurIa`. | services, ia, modèles |
| `entrees.js` | `estObjetJson`, `estIdentifiantSql`, `ID_SQL_MAX`. | middlewares |

## Choix de sécurité

- **Même règle pour l'IA et pour l'enseignant** (`questions.js`) : une question est
  reconstruite avec **seulement** les champs prévus pour son type, longueurs
  limitées, index de bonne réponse obligatoirement dans les choix.
- **Injection de formules CSV** (`csv.js`) : une cellule qui commence par
  `=`, `+`, `-`, `@` est préfixée d'une apostrophe, sinon Excel l'exécuterait
  comme une formule (ex. `=HYPERLINK(...)` piégé).
- **Guillemets doublés** (RFC 4180) : un `;` ou un retour à la ligne dans un texte
  ne casse pas le fichier.
- **Erreurs métier** (`erreurs.js`) : seules les classes filles d'`ErreurMetier` sont montrées
  à l'utilisateur (reconnues par `instanceof`) ; tout le reste devient une erreur 500 générique.
