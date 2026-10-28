// Rôle : les règles sur une LISTE de questions (nombre, répartition des types).
// La règle d'UNE question est dans sa classe : voir modeles/question.modele.js.
// Utilisé à deux endroits :
// - pour contrôler la réponse de l'IA (jamais fiable par principe) ;
// - pour contrôler les modifications envoyées par l'enseignant.
// SÉCURITÉ — CHOIX : une seule règle pour les deux, donc aucune porte dérobée.

const { Question, TYPES_QUESTION } = require('../modeles/question.modele');
const { ErreurDonneesInvalides } = require('./erreurs');

const NOMBRE_MAX_QUESTIONS = 20;

// Vérifie une question et renvoie une copie propre (données seules) avec
// SEULEMENT les champs prévus pour son type.
function normaliserQuestion(question, numero) {
  return Question.depuisDonnees(question, numero).versDocument();
}

// Vérifie toutes les questions (enseignant). Erreur dès le premier défaut.
function normaliserQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0 || questions.length > NOMBRE_MAX_QUESTIONS) {
    throw new ErreurDonneesInvalides(`Un quiz doit contenir entre 1 et ${NOMBRE_MAX_QUESTIONS} questions`);
  }
  return questions.map((question, index) => normaliserQuestion(question, index + 1));
}

// Version tolérante, pour l'IA : une question mal formée est écartée au lieu
// de tout refuser (l'appel à l'IA est déjà payé). La liste peut être vide.
function normaliserQuestionsValides(questions) {
  if (!Array.isArray(questions)) {
    throw new ErreurDonneesInvalides('La réponse ne contient pas de liste de questions');
  }

  const valides = [];
  questions.forEach((question, index) => {
    try {
      valides.push(normaliserQuestion(question, index + 1));
    } catch {
      // Question écartée : l'enseignant relira de toute façon les autres.
    }
  });
  return valides.slice(0, NOMBRE_MAX_QUESTIONS);
}

// Répartit les questions entre les types choisis, le plus équitablement possible.
// Exemple : 5 questions, [qcm, vrai_faux, ouverte] -> { qcm: 2, vrai_faux: 2, ouverte: 1 }.
function repartirTypes(nombreQuestions, types) {
  const repartition = {};
  types.forEach((type, index) => {
    const part = Math.floor(nombreQuestions / types.length);
    const reste = index < nombreQuestions % types.length ? 1 : 0;
    repartition[type] = part + reste;
  });
  return repartition;
}

// Combien de questions de chaque type : { qcm: 2, vrai_faux: 1, … }.
function compterTypes(questions) {
  const compte = {};
  for (const question of questions) {
    compte[question.type] = (compte[question.type] || 0) + 1;
  }
  return compte;
}

// Impose la répartition demandée à la réponse de l'IA (qui ne la respecte pas toujours) :
// - une question d'un type NON demandé est écartée ;
// - les questions en trop d'un type servent de réserve, pour compléter un
//   autre type demandé qui manque ;
// - l'ordre d'origine est gardé.
function selectionnerSelonRepartition(questions, repartition) {
  const total = Object.values(repartition).reduce((somme, nombre) => somme + nombre, 0);
  const restants = { ...repartition };
  const retenues = new Set();
  const reserve = [];

  questions.forEach((question, index) => {
    if (!(question.type in repartition)) return;
    if (restants[question.type] > 0) {
      retenues.add(index);
      restants[question.type] -= 1;
    } else {
      reserve.push(index);
    }
  });

  while (retenues.size < total && reserve.length > 0) {
    retenues.add(reserve.shift());
  }

  return questions.filter((_, index) => retenues.has(index));
}

module.exports = {
  normaliserQuestions,
  normaliserQuestionsValides,
  repartirTypes,
  compterTypes,
  selectionnerSelonRepartition,
  TYPES_QUESTION,
  NOMBRE_MAX_QUESTIONS,
};
