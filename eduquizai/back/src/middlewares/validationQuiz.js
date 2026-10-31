const Quiz = require('../modeles/quiz.modele');
const { TYPES_QUESTION } = require('../modeles/question.modele');
const { estObjetJson } = require('../utilitaires/entrees');
const { ErreurQuestion } = require('../utilitaires/erreurs');

// Rôle : vérifier tout ce qui touche aux quiz AVANT le contrôleur
// (paramètres de génération, identifiant, version, format d'export,
// numéro de question, modifications). Donnée invalide : réponse 400.

const NOMBRE_QUESTIONS_PAR_DEFAUT = 5;
const NOMBRE_QUESTIONS_MIN = 3;
const NOMBRE_QUESTIONS_MAX = 10;
const LONGUEUR_MAX_TITRE = 200;
const NIVEAUX = ['primaire', 'college', 'lycee', 'superieur'];
const DIFFICULTES = ['facile', 'moyen', 'difficile'];
const LONGUEUR_MAX_REPONSE_DONNEE = 1000;
// ID SQL conservé sur 24 caractères hexadécimaux pour préserver les anciennes URLs.
const REGEX_ID_QUIZ = /^[a-f0-9]{24}$/i;

// Numéro de version du quiz lu par le navigateur, obligatoire pour le modifier.
// Le service refusera si le quiz a changé entre-temps (autre onglet).
function validerRevisionQuiz(requete, reponse, suite) {
  const revision = estObjetJson(requete.body) ? requete.body.revision : undefined;
  if (!Number.isSafeInteger(revision) || revision < 0 || revision >= Number.MAX_SAFE_INTEGER) {
    return reponse.status(400).json({ erreur: 'Rechargez le quiz : sa révision est requise.' });
  }
  requete.revisionQuiz = revision;
  suite();
}

// Paramètres d'une génération, tous facultatifs :
//   nombreQuestions : 3 à 10 (5 par défaut) ;
//   types : "qcm", "vrai_faux", "ouverte" (les trois par défaut) ;
//   niveau : "primaire", "college", "lycee", "superieur" ou null ;
//   difficulte : "facile", "moyen" (par défaut) ou "difficile".
// SÉCURITÉ — Uniquement des listes FERMÉES : aucun texte libre de
// l'utilisateur n'arrive dans les consignes de l'IA (contre l'injection de prompt).
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

  // Au moins un type, que des types connus, sans doublon.
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

  // Types remis dans un ordre fixe : le résultat ne dépend pas de l'ordre
  // dans lequel les cases ont été cochées.
  const typesOrdonnes = TYPES_QUESTION.filter((type) => types.includes(type));
  requete.body = { nombreQuestions: nombre, types: typesOrdonnes, niveau, difficulte };
  suite();
}

// SÉCURITÉ — Identifiant de quiz = 24 caractères hexadécimaux, sinon refus.
// Évite une erreur 500 ; les requêtes SQL utilisent aussi des paramètres.
function validerIdentifiantQuiz(requete, reponse, suite) {
  const valeur = requete.params.idQuiz;
  // Style défensif : on vérifie d'abord que c'est bien du texte (trouvé par le fuzzing).
  if (typeof valeur !== 'string' || !REGEX_ID_QUIZ.test(valeur)) {
    return reponse.status(400).json({ erreur: 'Identifiant de quiz invalide' });
  }
  requete.idQuiz = valeur.toLowerCase();
  suite();
}

// Format d'export : ?format=json (par défaut), csv ou pdf.
const FORMATS_EXPORT = ['json', 'csv', 'pdf'];

function validerFormatExport(requete, reponse, suite) {
  const format = requete.query.format ?? 'json';
  if (!FORMATS_EXPORT.includes(format)) {
    return reponse.status(400).json({ erreur: 'Format d\'export invalide : json, csv ou pdf' });
  }
  requete.formatExport = format;
  suite();
}

// Numéro d'une question dans l'adresse (commence à 0) : 1 ou 2 chiffres,
// et plus petit que le nombre maximal de questions.
function validerNumeroQuestion(requete, reponse, suite) {
  const valeur = requete.params.numero;
  const formatValide = typeof valeur === 'string' && /^[0-9]{1,2}$/.test(valeur);
  if (!formatValide || Number(valeur) >= Quiz.NOMBRE_MAX_QUESTIONS) {
    return reponse.status(400).json({ erreur: 'Numéro de question invalide' });
  }
  requete.numeroQuestion = Number(valeur);
  suite();
}

// Réponse rédigée à une question ouverte, à faire corriger par l'IA (1 à 1 000 caractères).
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

// Modification d'un quiz : un titre et des questions valides.
// Les règles des questions sont dans modeles/quiz.modele.js et question.modele.js.
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
    questionsNettoyees = Quiz.normaliserQuestions(questions);
  } catch (erreur) {
    // On renvoie le numéro et le champ fautifs : l'interface peut
    // entourer en rouge exactement le champ à corriger.
    if (!(erreur instanceof ErreurQuestion)) return reponse.status(400).json({ erreur: 'Question invalide' });
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
