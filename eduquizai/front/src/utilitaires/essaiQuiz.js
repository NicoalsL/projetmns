// Règles du mode « Tester le quiz » : l'enseignant répond au quiz comme un
// élève pour vérifier qu'il fonctionne. Fonctions pures, sans React : testées
// directement (tests/essaiQuiz.test.js).

// reponse : index du choix (QCM), booléen (vrai/faux) ou texte (ouverte).
// Renvoie true / false, ou null pour une question ouverte : une réponse
// rédigée ne se compare pas mot à mot, elle est évaluée par la personne
// (ou proposée à la correction de l'IA).
export function estBonneReponse(question, reponse) {
  if (question.type === 'ouverte') {
    return null
  }
  return reponse === question.bonne_reponse
}

// evaluations : { [numéro de question]: true | false } — résultat retenu pour
// chaque question (calculé pour un QCM / vrai-faux, choisi pour une ouverte).
export function calculerScore(questions, evaluations) {
  const points = questions.filter((_, index) => evaluations[index] === true).length
  return { points, total: questions.length }
}

// Phrase de résultat affichée à la fin de l'essai.
export function messageScore({ points, total }) {
  const pourcentage = total === 0 ? 0 : Math.round((points / total) * 100)
  return `${points} bonne${points > 1 ? 's' : ''} réponse${points > 1 ? 's' : ''} sur ${total} (${pourcentage} %)`
}
