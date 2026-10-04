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
const { limiteurGeneration, limiteurCorrection } = require('../middlewares/limiteursIa');
const quizControleur = require('../controleurs/quiz.controleur');

// Endpoints /api/quiz/:idQuiz : consultation, édition, validation, export et
// suppression d'un quiz. La génération est déclarée sous /api/cours/:id/quiz
// (un quiz est toujours généré À PARTIR d'un cours), voir cours.routes.js.
const routeur = express.Router();

// Jeton vérifié avant de lire le corps (même principe que pour les cours).
routeur.use(verifierJeton);
// 20 questions de 500 caractères + choix et explications : 64 ko suffisent.
routeur.use(express.json({ limit: '64kb' }));

routeur.get('/:idQuiz', validerIdentifiantQuiz, quizControleur.consulter);
routeur.put(
  '/:idQuiz',
  validerIdentifiantQuiz,
  validerRevisionQuiz,
  validerModificationQuiz,
  quizControleur.modifier,
);
routeur.post('/:idQuiz/validation', validerIdentifiantQuiz, validerRevisionQuiz, quizControleur.valider);
// Export JSON (par défaut) ou CSV : ?format=csv
routeur.get('/:idQuiz/export', validerIdentifiantQuiz, validerFormatExport, quizControleur.exporter);
routeur.delete('/:idQuiz', validerIdentifiantQuiz, quizControleur.supprimer);

// Appels à l'IA sur une question précise (numéro à partir de 0). Validation
// avant les limiteurs : une requête mal formée ne consomme pas de quota.
routeur.post(
  '/:idQuiz/questions/:numero/regeneration',
  validerIdentifiantQuiz,
  validerNumeroQuestion,
  validerRevisionQuiz,
  limiteurGeneration,
  quizControleur.regenererQuestion,
);
routeur.post(
  '/:idQuiz/questions/:numero/correction',
  validerIdentifiantQuiz,
  validerNumeroQuestion,
  validerReponseDonnee,
  limiteurCorrection,
  quizControleur.corrigerReponse,
);

module.exports = routeur;
