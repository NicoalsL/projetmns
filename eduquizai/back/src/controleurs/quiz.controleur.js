const quizService = require('../services/quiz.service');
const { quizEnCsv } = require('../utilitaires/csv');
const { quizEnPdf } = require('../utilitaires/pdf');

// Rôle : traduire les requêtes HTTP sur les quiz en appels à quiz.service.js.
// L'enseignant vient toujours du jeton (requete.utilisateur).
// Les valeurs déjà vérifiées par les middlewares (idCours, idQuiz,
// numeroQuestion, revisionQuiz, formatExport) sont lues telles quelles.

// POST /api/cours/:id/quiz : demande un quiz à l'IA (201 + adresse du nouveau quiz).
async function generer(requete, reponse, suite) {
  try {
    const quiz = await quizService.generer(requete.idCours, requete.utilisateur.id_utilisateur, requete.body);
    reponse.location('/api/quiz/' + quiz.id_quiz).status(201).json(quiz);
  } catch (erreur) {
    suite(erreur);
  }
}

// GET /api/cours/:id/quiz : les quiz d'un cours.
async function listerPourCours(requete, reponse, suite) {
  try {
    const quiz = await quizService.listerPourCours(requete.idCours, requete.utilisateur.id_utilisateur);
    reponse.json(quiz);
  } catch (erreur) {
    suite(erreur);
  }
}

// GET /api/cours/:id/generations : journal des appels à l'IA pour ce cours.
async function historiqueGenerations(requete, reponse, suite) {
  try {
    const generations = await quizService.historiqueGenerations(requete.idCours, requete.utilisateur.id_utilisateur);
    reponse.json(generations);
  } catch (erreur) {
    suite(erreur);
  }
}

// GET /api/quiz/:idQuiz
async function consulter(requete, reponse, suite) {
  try {
    const quiz = await quizService.consulter(requete.idQuiz, requete.utilisateur.id_utilisateur);
    reponse.json(quiz);
  } catch (erreur) {
    suite(erreur);
  }
}

// PUT /api/quiz/:idQuiz : enregistre les corrections de l'enseignant.
// revisionQuiz = version lue par le navigateur (refus si le quiz a changé entre-temps).
async function modifier(requete, reponse, suite) {
  try {
    const quiz = await quizService.modifier(
      requete.idQuiz,
      requete.utilisateur.id_utilisateur,
      requete.body,
      requete.revisionQuiz,
    );
    reponse.json(quiz);
  } catch (erreur) {
    suite(erreur);
  }
}

// POST /api/quiz/:idQuiz/validation : l'enseignant approuve le quiz (export possible).
async function valider(requete, reponse, suite) {
  try {
    const quiz = await quizService.valider(
      requete.idQuiz,
      requete.utilisateur.id_utilisateur,
      requete.revisionQuiz,
    );
    reponse.json(quiz);
  } catch (erreur) {
    suite(erreur);
  }
}

// GET /api/quiz/:idQuiz/export?format=json|csv|pdf : téléchargement d'un quiz validé.
async function exporter(requete, reponse, suite) {
  try {
    const contenu = await quizService.exporter(requete.idQuiz, requete.utilisateur.id_utilisateur);
    // attachment = le navigateur télécharge le fichier au lieu de l'afficher.
    // CHOIX — Trois formats : JSON (réutilisable par un logiciel), CSV (tableur),
    // PDF (impression, accessible).
    if (requete.formatExport === 'csv') {
      reponse.attachment('quiz-' + requete.idQuiz + '.csv');
      reponse.type('text/csv; charset=utf-8').send(quizEnCsv(contenu));
      return;
    }
    if (requete.formatExport === 'pdf') {
      const fichierPdf = await quizEnPdf(contenu);
      reponse.attachment('quiz-' + requete.idQuiz + '.pdf');
      reponse.type('application/pdf').send(fichierPdf);
      return;
    }
    reponse.attachment('quiz-' + requete.idQuiz + '.json').json(contenu);
  } catch (erreur) {
    suite(erreur);
  }
}

// POST /api/quiz/:idQuiz/questions/:numero/regeneration : remplace une seule question.
async function regenererQuestion(requete, reponse, suite) {
  try {
    const quiz = await quizService.regenererQuestion(
      requete.idQuiz,
      requete.utilisateur.id_utilisateur,
      requete.numeroQuestion,
      requete.revisionQuiz,
    );
    reponse.json(quiz);
  } catch (erreur) {
    suite(erreur);
  }
}

// POST /api/quiz/:idQuiz/questions/:numero/correction : l'IA évalue une réponse rédigée.
async function corrigerReponse(requete, reponse, suite) {
  try {
    const avis = await quizService.corrigerReponse(
      requete.idQuiz,
      requete.utilisateur.id_utilisateur,
      requete.numeroQuestion,
      requete.body.reponse,
    );
    reponse.json(avis);
  } catch (erreur) {
    suite(erreur);
  }
}

// DELETE /api/quiz/:idQuiz
async function supprimer(requete, reponse, suite) {
  try {
    await quizService.supprimer(requete.idQuiz, requete.utilisateur.id_utilisateur);
    reponse.status(204).end();
  } catch (erreur) {
    suite(erreur);
  }
}

module.exports = {
  generer,
  listerPourCours,
  historiqueGenerations,
  consulter,
  modifier,
  valider,
  exporter,
  regenererQuestion,
  corrigerReponse,
  supprimer,
};
