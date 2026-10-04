const { normaliserQuestions, TYPES_QUESTION, NOMBRE_MAX_QUESTIONS } = require('../utilitaires/questions');
const { estObjetJson } = require('../utilitaires/entrees');

const NOMBRE_QUESTIONS_PAR_DEFAUT = 5;
const NOMBRE_QUESTIONS_MIN = 3;
const NOMBRE_QUESTIONS_MAX = 10;
const LONGUEUR_MAX_TITRE = 200;
const NIVEAUX = ['primaire', 'college', 'lycee', 'superieur'];
const DIFFICULTES = ['facile', 'moyen', 'difficile'];
const LONGUEUR_MAX_REPONSE_DONNEE = 1000;
// Un identifiant MongoDB (ObjectId) = 24 caractères hexadécimaux.
const REGEX_ID_QUIZ = /^[a-f0-9]{24}$/i;

// Révision effectivement lue par le navigateur, exigée avant toute mutation.
function validerRevisionQuiz(requete, reponse, suite) {
  const revision = estObjetJson(requete.body) ? requete.body.revision : undefined;
  if (!Number.isSafeInteger(revision) || revision < 0 || revision >= Number.MAX_SAFE_INTEGER) {
    return reponse.status(400).json({ erreur: 'Rechargez le quiz : sa révision est requise.' });
  }
  requete.revisionQuiz = revision;
  suite();
}

// POST /api/cours/:id/quiz — tous les champs sont facultatifs :
//   { nombreQuestions: 3..10 (5), types: ["qcm", "vrai_faux", "ouverte"] (les trois),
//     niveau: "primaire" | "college" | "lycee" | "superieur" | null (non précisé),
//     difficulte: "facile" | "moyen" | "difficile" ("moyen") }
// Les listes fermées empêchent d'injecter du texte libre dans les consignes de l'IA.
function validerGeneration(requete, reponse, suite) {
  const corps = estObjetJson(requete.body) ? requete.body : {};
  const nombre = corps.nombreQuestions ?? NOMBRE_QUESTIONS_PAR_DEFAUT;
  const types = corps.types ?? TYPES_QUESTION;
  const niveau = corps.niveau ?? null;
  const difficulte = corps.difficulte ?? 'moyen';

  if (!Number.isInteger(nombre) || nombre < NOMBRE_QUESTIONS_MIN || nombre > NOMBRE_QUESTIONS_MAX) {
    return reponse.status(400).json({
      erreur: `Le nombre de questions doit être un entier entre ${NOMBRE_QUESTIONS_MIN} et ${NOMBRE_QUESTIONS_MAX}`,
    });
  }

  const typesValides = Array.isArray(types)
    && types.length > 0
    && types.every((type) => TYPES_QUESTION.includes(type))
    && new Set(types).size === types.length;
  if (!typesValides) {
    return reponse.status(400).json({ erreur: 'Choisissez au moins un type de question : qcm, vrai_faux ou ouverte' });
  }

  if (niveau !== null && !NIVEAUX.includes(niveau)) {
    return reponse.status(400).json({ erreur: 'Niveau invalide' });
  }
  if (!DIFFICULTES.includes(difficulte)) {
    return reponse.status(400).json({ erreur: 'Difficulté invalide' });
  }

  // Types remis dans l'ordre de référence : la répartition ne dépend pas de
  // l'ordre des cases cochées.
  const typesOrdonnes = TYPES_QUESTION.filter((type) => types.includes(type));
  requete.body = { nombreQuestions: nombre, types: typesOrdonnes, niveau, difficulte };
  suite();
}

// Paramètre :idQuiz — refusé avant tout accès à MongoDB s'il n'a pas le
// format d'un ObjectId (sinon new ObjectId() lèverait une erreur 500).
function validerIdentifiantQuiz(requete, reponse, suite) {
  const valeur = requete.params.idQuiz;
  if (!REGEX_ID_QUIZ.test(valeur)) {
    return reponse.status(400).json({ erreur: 'Identifiant de quiz invalide' });
  }
  requete.idQuiz = valeur.toLowerCase();
  suite();
}

// GET /api/quiz/:idQuiz/export?format=json|csv — json par défaut.
const FORMATS_EXPORT = ['json', 'csv'];

function validerFormatExport(requete, reponse, suite) {
  const format = requete.query.format ?? 'json';
  if (!FORMATS_EXPORT.includes(format)) {
    return reponse.status(400).json({ erreur: 'Format d\'export invalide : json ou csv' });
  }
  requete.formatExport = format;
  suite();
}

// Paramètre :numero (position d'une question, à partir de 0) : un ou deux
// chiffres, et moins que le nombre maximal de questions d'un quiz.
function validerNumeroQuestion(requete, reponse, suite) {
  const valeur = requete.params.numero;
  if (!/^[0-9]{1,2}$/.test(valeur) || Number(valeur) >= NOMBRE_MAX_QUESTIONS) {
    return reponse.status(400).json({ erreur: 'Numéro de question invalide' });
  }
  requete.numeroQuestion = Number(valeur);
  suite();
}

// POST /api/quiz/:idQuiz/questions/:numero/correction — corps : { reponse }.
function validerReponseDonnee(requete, reponse, suite) {
  const texte = estObjetJson(requete.body) ? requete.body.reponse : undefined;
  const valide = typeof texte === 'string'
    && texte.trim().length > 0
    && texte.trim().length <= LONGUEUR_MAX_REPONSE_DONNEE
    && !texte.includes('\0');
  if (!valide) {
    return reponse.status(400).json({ erreur: 'La réponse doit contenir entre 1 et 1 000 caractères' });
  }
  requete.body = { reponse: texte.trim() };
  suite();
}

// PUT /api/quiz/:idQuiz — corps : { titre, questions }.
function validerModificationQuiz(requete, reponse, suite) {
  if (!estObjetJson(requete.body)) {
    return reponse.status(400).json({ erreur: 'Un titre et des questions sont requis' });
  }

  const { titre, questions } = requete.body;
  if (typeof titre !== 'string' || !titre.trim() || titre.trim().length > LONGUEUR_MAX_TITRE) {
    return reponse.status(400).json({ erreur: 'Le titre doit contenir entre 1 et 200 caractères', champ: 'titre' });
  }

  let questionsNettoyees;
  try {
    questionsNettoyees = normaliserQuestions(questions);
  } catch (erreur) {
    // Message précis ("Question 3 : …") pour que l'enseignant sache quoi corriger,
    // avec le numéro et le champ en cause pour que l'interface marque ce champ.
    return reponse.status(400).json({ erreur: erreur.message, question: erreur.numero, champ: erreur.champ });
  }

  requete.body = { titre: titre.trim(), questions: questionsNettoyees };
  suite();
}

module.exports = {
  validerRevisionQuiz,
  validerGeneration,
  validerIdentifiantQuiz,
  validerModificationQuiz,
  validerFormatExport,
  validerNumeroQuestion,
  validerReponseDonnee,
};
