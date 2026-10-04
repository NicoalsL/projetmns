// Règles de structure d'une question de quiz, utilisées à deux endroits :
// - pour contrôler la réponse de l'IA (une sortie de LLM n'est jamais fiable
//   par principe : format faux, champ manquant, réponse hors des choix…) ;
// - pour contrôler les modifications envoyées par l'enseignant.
//
// Format retenu (document MongoDB, voir docs/base-de-donnees.md) :
//   qcm       : choix (2 à 6 textes) + bonne_reponse = index du bon choix
//   vrai_faux : bonne_reponse = booléen + explication obligatoire
//   ouverte   : bonne_reponse = réponse attendue (texte) + explication facultative

const TYPES_QUESTION = ['qcm', 'vrai_faux', 'ouverte'];
const NOMBRE_MAX_QUESTIONS = 20;
const LONGUEUR_MAX_ENONCE = 500;
const LONGUEUR_MAX_CHOIX = 200;
const LONGUEUR_MAX_REPONSE = 1000;
const LONGUEUR_MAX_EXPLICATION = 1000;
const LONGUEUR_MAX_SOURCE = 500;
const NOMBRE_MIN_CHOIX = 2;
const NOMBRE_MAX_CHOIX = 6;

// Erreur levée quand une question ne respecte pas le format : le message
// précise la question fautive pour aider l'enseignant à corriger.
// champ : partie de la question en cause ('enonce', 'choix', 'bonne_reponse'
// ou 'explication'). Renvoyé à l'interface avec le numéro de la question pour
// marquer précisément le champ fautif (RGAA 11.10 : erreur rattachée au champ).
function erreurQuestion(numero, message, champ) {
  return Object.assign(new Error(`Question ${numero} : ${message}`), { code: 'QUESTION_INVALIDE', numero, champ });
}

function texteValide(valeur, longueurMax) {
  return typeof valeur === 'string' && valeur.trim().length > 0 && valeur.trim().length <= longueurMax;
}

function normaliserChoix(choix, numero) {
  if (!Array.isArray(choix) || choix.length < NOMBRE_MIN_CHOIX || choix.length > NOMBRE_MAX_CHOIX) {
    throw erreurQuestion(
      numero,
      `un QCM doit proposer entre ${NOMBRE_MIN_CHOIX} et ${NOMBRE_MAX_CHOIX} choix`,
      'choix',
    );
  }
  if (!choix.every((choixPossible) => texteValide(choixPossible, LONGUEUR_MAX_CHOIX))) {
    throw erreurQuestion(numero, `chaque choix doit contenir entre 1 et ${LONGUEUR_MAX_CHOIX} caractères`, 'choix');
  }

  const choixNettoyes = choix.map((choixPossible) => choixPossible.trim());
  // Deux choix identiques rendraient la question ambiguë.
  const sansDoublon = new Set(choixNettoyes.map((choixPossible) => choixPossible.toLowerCase()));
  if (sansDoublon.size !== choixNettoyes.length) {
    throw erreurQuestion(numero, 'les choix doivent être tous différents', 'choix');
  }
  return choixNettoyes;
}

// Vérifie une question et renvoie une copie propre ne contenant QUE les
// champs prévus pour son type (un champ inattendu est ignoré, jamais stocké).
function normaliserQuestion(question, numero) {
  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    throw erreurQuestion(numero, 'format invalide', 'enonce');
  }
  if (!TYPES_QUESTION.includes(question.type)) {
    throw erreurQuestion(numero, 'le type doit être qcm, vrai_faux ou ouverte', 'enonce');
  }
  if (!texteValide(question.enonce, LONGUEUR_MAX_ENONCE)) {
    throw erreurQuestion(numero, `l'énoncé doit contenir entre 1 et ${LONGUEUR_MAX_ENONCE} caractères`, 'enonce');
  }

  const explication = typeof question.explication === 'string' ? question.explication.trim() : '';
  if (explication.length > LONGUEUR_MAX_EXPLICATION) {
    throw erreurQuestion(
      numero,
      `l'explication ne doit pas dépasser ${LONGUEUR_MAX_EXPLICATION} caractères`,
      'explication',
    );
  }

  const base = { type: question.type, enonce: question.enonce.trim(), explication };

  // Citation du cours qui justifie la réponse (facultative) : tronquée plutôt
  // que refusée, ce n'est qu'une aide à la relecture. source_trouvee est
  // calculé par genererQuiz.js (la citation figure-t-elle vraiment dans le cours ?).
  const source = typeof question.source === 'string' ? question.source.trim().slice(0, LONGUEUR_MAX_SOURCE) : '';
  if (source) {
    base.source = source;
    if (typeof question.source_trouvee === 'boolean') {
      base.source_trouvee = question.source_trouvee;
    }
  }

  if (question.type === 'qcm') {
    const choix = normaliserChoix(question.choix, numero);
    const index = question.bonne_reponse;
    if (!Number.isInteger(index) || index < 0 || index >= choix.length) {
      throw erreurQuestion(numero, 'la bonne réponse doit désigner un des choix proposés', 'bonne_reponse');
    }
    return { ...base, choix, bonne_reponse: index };
  }

  if (question.type === 'vrai_faux') {
    if (typeof question.bonne_reponse !== 'boolean') {
      throw erreurQuestion(numero, 'la réponse d\'un vrai/faux doit être vrai ou faux', 'bonne_reponse');
    }
    // Le CDC exige une explication pour chaque vrai/faux.
    if (!explication) {
      throw erreurQuestion(numero, 'un vrai/faux doit être accompagné d\'une explication', 'explication');
    }
    return { ...base, bonne_reponse: question.bonne_reponse };
  }

  // Question ouverte : la "bonne réponse" est la réponse attendue, en texte.
  if (!texteValide(question.bonne_reponse, LONGUEUR_MAX_REPONSE)) {
    throw erreurQuestion(
      numero,
      `la réponse attendue doit contenir entre 1 et ${LONGUEUR_MAX_REPONSE} caractères`,
      'bonne_reponse',
    );
  }
  return { ...base, bonne_reponse: question.bonne_reponse.trim() };
}

// Vérifie une liste complète de questions. Lève une erreur au premier défaut.
function normaliserQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0 || questions.length > NOMBRE_MAX_QUESTIONS) {
    throw Object.assign(
      new Error(`Un quiz doit contenir entre 1 et ${NOMBRE_MAX_QUESTIONS} questions`),
      { code: 'QUESTION_INVALIDE' },
    );
  }
  return questions.map((question, index) => normaliserQuestion(question, index + 1));
}

// Variante tolérante, pour la réponse de l'IA : une question mal formée est
// écartée au lieu de faire échouer toute la génération (l'appel à l'IA a déjà
// été payé et compté dans le quota). Les questions restantes sont renvoyées,
// dans la limite de NOMBRE_MAX_QUESTIONS ; la liste peut être vide.
function normaliserQuestionsValides(questions) {
  if (!Array.isArray(questions)) {
    throw Object.assign(new Error('La réponse ne contient pas de liste de questions'), { code: 'QUESTION_INVALIDE' });
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

// Répartit le nombre de questions entre les types choisis par l'enseignant,
// le plus équitablement possible, dans l'ordre des types.
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

function compterTypes(questions) {
  const compte = {};
  for (const question of questions) {
    compte[question.type] = (compte[question.type] || 0) + 1;
  }
  return compte;
}

// Applique la répartition demandée à la réponse de l'IA, qui ne la respecte
// pas toujours exactement :
// - une question d'un type NON demandé est toujours écartée ;
// - au-delà du quota d'un type, les questions sont gardées en réserve et ne
//   servent qu'à compléter si un autre type demandé est en manque ;
// - l'ordre d'origine des questions est conservé.
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
