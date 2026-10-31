# `models/` — les classes métier

Les objets du domaine d'EduQuizAI, alignés sur le MCD : chaque classe a des **données et un
comportement**. Les services ne recalculent pas une règle : ils la demandent à l'objet.

| Fichier | Classe(s) | Comportement |
|---|---|---|
| `question.modele.js` | `Question` (abstraite) → `QuestionQcm`, `QuestionVraiFaux`, `QuestionOuverte` | se valider (`depuisDonnees`), donner son libellé, ses choix et sa bonne réponse en texte, réparer un vrai/faux mal écrit par l'IA |
| `quiz.modele.js` | `Quiz` | `estExportable()`, `question(numero)`, `libelleOrigine()`, `contenuExport()` ; règles sur la **liste** de questions en méthodes statiques : `Quiz.normaliserQuestions()` (enseignant, stricte), `Quiz.normaliserQuestionsValides()` (IA, tolérante), `Quiz.repartirTypes()`, `Quiz.selectionnerSelonRepartition()` |
| `cours.modele.js` | `Cours` | `nombreDePhrases()`, `estAssezLongPourUnQuiz()` |
| `utilisateur.modele.js` | `Utilisateur` | `motDePasseCorrespond()`, `versProfilPublic()` ; empreinte du mot de passe en champ **privé** `#` |

## La POO dans ce dossier

- **Héritage et polymorphisme** : les 3 types de question héritent de `Question`. Les exports
  CSV et PDF appellent `question.bonneReponseEnTexte()` sans savoir le type : chaque classe
  répond à sa façon. Il n'y a plus de `if (type === 'qcm') … else if …` répété.
- **Classe abstraite** : `new Question()` est refusé ; on crée toujours un type précis.
- **Pas de classe mère pour `Cours`, `Quiz`, `Utilisateur`** : ils n'ont rien en commun. Une
  classe mère « Entité » vide serait de la POO pour la forme.
- Diagramme de classes : `documentation/conception/diagrammes.md`.

## Choix de sécurité

- **Mêmes règles pour l'IA et pour l'enseignant** (`Question.depuisDonnees`, et
  `Quiz.normaliserQuestions` pour la liste) : une question est reconstruite avec seulement
  les champs prévus pour son type, longueurs limitées, index de bonne réponse obligatoirement
  dans les choix, 20 questions au plus.
- **Type de question lu dans une `Map`** : un type piégé (`constructor`, `__proto__`) ne peut
  pas désigner une autre classe que les trois prévues.
- **Empreinte du mot de passe privée** (`#motDePasseHache`) : impossible de l'envoyer par
  erreur au navigateur, `JSON.stringify` ne la voit pas.
