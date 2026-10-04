const quizService = require('../services/quiz.service');
const { quizEnCsv } = require('../utilitaires/csv');

// Traduit les requêtes HTTP sur les quiz en appels à quiz.service.js.
// L'identifiant de l'enseignant vient toujours du JWT (requete.utilisateur).

async function generer(requete, reponse, suite) {
  try {
    const quiz = await quizService.generer(requete.idCours, requete.utilisateur.id_utilisateur, requete.body);
    reponse.location('/api/quiz/' + quiz.id_quiz).status(201).json(quiz);
  } catch (erreur) {
    suite(erreur);
  }
}

async function listerPourCours(requete, reponse, suite) {
  try {
    const quiz = await quizService.listerPourCours(requete.idCours, requete.utilisateur.id_utilisateur);
    reponse.json(quiz);
  } catch (erreur) {
    suite(erreur);
  }
}

async function historiqueGenerations(requete, reponse, suite) {
  try {
    const generations = await quizService.historiqueGenerations(requete.idCours, requete.utilisateur.id_utilisateur);
    reponse.json(generations);
  } catch (erreur) {
    suite(erreur);
  }
}

async function consulter(requete, reponse, suite) {
  try {
    const quiz = await quizService.consulter(requete.idQuiz, requete.utilisateur.id_utilisateur);
    reponse.json(quiz);
  } catch (erreur) {
    suite(erreur);
  }
}

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

async function exporter(requete, reponse, suite) {
  try {
    const contenu = await quizService.exporter(requete.idQuiz, requete.utilisateur.id_utilisateur);
    // Content-Disposition: attachment -> le navigateur propose d'enregistrer le fichier.
    if (requete.formatExport === 'csv') {
      reponse.attachment('quiz-' + requete.idQuiz + '.csv');
      reponse.type('text/csv; charset=utf-8').send(quizEnCsv(contenu));
      return;
    }
    reponse.attachment('quiz-' + requete.idQuiz + '.json').json(contenu);
  } catch (erreur) {
    suite(erreur);
  }
}

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
