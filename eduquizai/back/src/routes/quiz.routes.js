const express = require('express');
const verifierJeton = require('../middlewares/authentification');
const {
  validerIdentifiantQuiz,
  validerModificationQuiz,
  validerFormatExport,
  validerNumeroQuestion,
  validerReponseDonnee,
  validerRevisionQuiz,
} = require('../middlewares/validationQuiz');
const { limiteurGeneration, limiteurCorrection } = require('../middlewares/limiteurs');
const quizControleur = require('../controllers/quiz.controleur');

// Rôle : adresses /api/quiz/:idQuiz, lire, modifier, valider, exporter et supprimer un quiz.
// La CRÉATION d'un quiz est ailleurs, sous /api/cours/:id/quiz (cours.routes.js),
// car un quiz est toujours généré à partir d'un cours.
const routeur = express.Router();

routeur.use(verifierJeton); // jeton vérifié avant de lire le corps, comme pour les cours
routeur.use(express.json({ limit: '64kb' })); // 20 questions avec choix et explications : 64 ko suffisent

routeur.get('/:idQuiz', validerIdentifiantQuiz, quizControleur.consulter); // lire un quiz
// Modifier un quiz. validerRevisionQuiz : on doit envoyer la version qu'on a lue,
// pour ne pas écraser une modification faite dans un autre onglet.
routeur.put(
  '/:idQuiz',
  validerIdentifiantQuiz,
  validerRevisionQuiz,
  validerModificationQuiz,
  quizControleur.modifier,
);
// Valider le quiz après relecture (même contrôle de version que pour modifier).
// CHOIX — Validation humaine obligatoire avant export : l'IA peut se tromper,
// l'enseignant reste responsable du contenu (exigence « Éthique » du CDC).
routeur.post('/:idQuiz/validation', validerIdentifiantQuiz, validerRevisionQuiz, quizControleur.valider);
// Exporter : ?format=json (par défaut), csv ou pdf. Refusé tant que le quiz n'est pas validé.
routeur.get('/:idQuiz/export', validerIdentifiantQuiz, validerFormatExport, quizControleur.exporter);
routeur.delete('/:idQuiz', validerIdentifiantQuiz, quizControleur.supprimer); // supprimer

// Appels à l'IA sur UNE question (numéro à partir de 0).
// Les validations passent avant les limiteurs : une demande mal formée ne consomme pas de quota.
// Régénérer une question : compte dans les 10 générations par heure.
routeur.post(
  '/:idQuiz/questions/:numero/regeneration',
  validerIdentifiantQuiz,
  validerNumeroQuestion,
  validerRevisionQuiz,
  limiteurGeneration,
  quizControleur.regenererQuestion,
);
// Demander à l'IA son avis sur une réponse rédigée (mode « Tester le quiz ») : 30 par heure.
routeur.post(
  '/:idQuiz/questions/:numero/correction',
  validerIdentifiantQuiz,
  validerNumeroQuestion,
  validerReponseDonnee,
  limiteurCorrection,
  quizControleur.corrigerReponse,
);

module.exports = routeur;
