const { genererQuiz, evaluerReponse } = require('../ia/genererQuiz');
const coursDepot = require('../depots/cours.depot');
const quizDepot = require('../depots/quiz.depot');
const generationIaDepot = require('../depots/generationIa.depot');
const { erreurMetier } = require('../utilitaires/erreurs');
const { tracer, EVENEMENTS } = require('./journalSecurite.service');

// Orchestre la génération (ia/genererQuiz.js), l'édition, la validation et
// l'export d'un quiz — appelle depots/quiz.depot.js et depots/generationIa.depot.js.
//
// Cycle de vie (contrainte "Éthique" du CDC) : un quiz généré naît en
// "brouillon" ; l'enseignant le relit, le corrige, puis le "valide". Seul un
// quiz validé peut être exporté, et toute modification le repasse en brouillon.

const STATUT_BROUILLON = 'brouillon';
const STATUT_VALIDE = 'valide';

// Contenu minimal pour générer un quiz. Testé : avec un cours de deux mots,
// le modèle invente des questions hors cours (noyau, mitochondries…) faute de
// matière. Ces seuils réduisent le risque, sans garantir la fidélité au cours.
const LONGUEUR_MIN_COURS = 300;
const PHRASES_MIN_COURS = 3;

// Une "phrase" = un segment terminé par . ! ? ou un retour à la ligne, et
// contenant au moins 3 mots (un titre isolé ou "La cellule." ne compte pas).
function nombreDePhrases(texte) {
  return texte
    .split(/[.!?\n]+/)
    .filter((phrase) => phrase.trim().split(/\s+/).length >= 3)
    .length;
}

function quizIntrouvable() {
  return erreurMetier('Quiz introuvable', 404);
}

function conflitRevision() {
  return erreurMetier('Ce quiz a changé dans un autre onglet. Rechargez-le avant de continuer.', 409);
}

// Le parent est verrouillé seulement pendant la persistance, jamais pendant
// l'IA. Une suppression concurrente attend alors la dernière écriture Mongo.
async function enregistrerResultat(idCours, idUtilisateur, generation, action) {
  try {
    const resultat = await coursDepot.avecCoursVerrouille(idCours, idUtilisateur, async (client) => {
      const quiz = await action();
      await generationIaDepot.marquerLivraison(generation.id_generation, idUtilisateur, 'enregistre', client);
      return quiz;
    });
    if (!resultat) {
      throw erreurMetier('Ce cours a été supprimé pendant la génération.', 404);
    }
    return resultat;
  } catch (erreur) {
    try {
      await generationIaDepot.marquerLivraison(generation.id_generation, idUtilisateur, 'echec');
    } catch (erreurJournal) {
      // Si le compte/cours est supprimé, le journal suit déjà la cascade SQL.
      console.error('État de livraison indisponible', { code: erreurJournal.code });
    }
    throw erreur;
  }
}

// La requête Mongo filtre à la fois le propriétaire et la révision attendue.
async function modifierVersion(idQuiz, idUtilisateur, modifications, revision) {
  const resultat = await quizDepot.mettreAJour(idQuiz, idUtilisateur, modifications, revision);
  if (!resultat) {
    const existe = await quizDepot.trouverParId(idQuiz, idUtilisateur);
    throw existe ? conflitRevision() : quizIntrouvable();
  }
  return resultat;
}

// Vérifie que le cours existe ET appartient à l'enseignant (sinon 404).
async function coursDeLEnseignant(idCours, idUtilisateur) {
  const cours = await coursDepot.trouverParId(idCours, idUtilisateur);
  if (!cours) {
    throw erreurMetier('Cours introuvable', 404);
  }
  return cours;
}

// Appelle l'IA (fonction appel), chronomètre l'appel et le trace dans le
// journal generation_ia, réussi ou non. Partagé par la génération d'un quiz
// et la régénération d'une question.
async function appelerIaJournalisee(journal, appel, messageEchec) {
  // On ne chronomètre que l'appel à l'IA : c'est lui que vise le critère < 5 s.
  const debut = Date.now();
  let resultat;
  try {
    resultat = await appel();
  } catch (erreur) {
    // L'échec est tracé (statut, durée), puis l'utilisateur reçoit un message
    // générique : le détail technique reste dans les logs du serveur.
    console.error('Échec de génération IA', { code: erreur.code });
    try {
      await generationIaDepot.enregistrer({ ...journal, statut: 'echec', dureeMs: Date.now() - debut });
    } catch (erreurJournal) {
      // Une panne du journal ne doit pas masquer l'échec de l'IA, qui reste
      // l'erreur renvoyée à l'utilisateur.
      console.error('Journal des générations indisponible', { code: erreurJournal.code });
    }
    throw erreurMetier(messageEchec, 502);
  }
  const dureeMs = Date.now() - debut;

  let generation;
  try {
    generation = await generationIaDepot.enregistrer({ ...journal, statut: 'succes', dureeMs });
  } catch (erreur) {
    // 23503 = clé étrangère violée : le cours a été supprimé pendant l'appel à l'IA.
    if (erreur.code === '23503') {
      throw erreurMetier('Ce cours a été supprimé pendant la génération.', 404);
    }
    throw erreur;
  }
  return { resultat, dureeMs, generation };
}

// parametres : { nombreQuestions, types, niveau, difficulte } (déjà validés).
async function generer(idCours, idUtilisateur, parametres) {
  const cours = await coursDeLEnseignant(idCours, idUtilisateur);

  // Refusé AVANT d'appeler l'IA : pas de coût, pas d'entrée dans le journal.
  const texte = cours.contenu_texte;
  if (texte.length < LONGUEUR_MIN_COURS || nombreDePhrases(texte) < PHRASES_MIN_COURS) {
    throw erreurMetier(
      `Le cours est trop court pour générer un quiz fiable : au moins ${LONGUEUR_MIN_COURS} caractères `
        + `et ${PHRASES_MIN_COURS} phrases sont nécessaires, sinon l'IA risque d'inventer des questions.`,
      400,
    );
  }

  const { nombreQuestions, types, niveau, difficulte } = parametres;
  const journal = { nombreQuestionsDemandees: nombreQuestions, idUtilisateur, idCours };

  const { resultat, dureeMs, generation } = await appelerIaJournalisee(
    journal,
    () => genererQuiz(texte, { nombreQuestions, types, niveau, difficulte }),
    'La génération du quiz a échoué. Réessayez dans quelques instants.',
  );
  const maintenant = new Date();
  const quiz = await enregistrerResultat(idCours, idUtilisateur, generation, () => quizDepot.creer({
    id_generation: generation.id_generation,
    id_cours: idCours,
    id_utilisateur: idUtilisateur,
    titre: 'Quiz – ' + cours.titre.slice(0, 180),
    statut: STATUT_BROUILLON,
    fournisseur: resultat.fournisseur,
    modele: resultat.modele,
    // Paramètres conservés : l'interface signale si l'IA n'a pas respecté la répartition.
    parametres: { types, niveau, difficulte, repartition_demandee: resultat.repartition },
    questions: resultat.questions,
    date_creation: maintenant,
    date_modification: maintenant,
    date_validation: null,
  }));

  return { ...quiz, duree_ms: dureeMs };
}

async function listerPourCours(idCours, idUtilisateur) {
  await coursDeLEnseignant(idCours, idUtilisateur);
  return quizDepot.listerParCours(idCours, idUtilisateur);
}

// Historique des appels à l'IA pour un cours (journal generation_ia).
async function historiqueGenerations(idCours, idUtilisateur) {
  await coursDeLEnseignant(idCours, idUtilisateur);
  return generationIaDepot.listerParCours(idCours, idUtilisateur);
}

async function consulter(idQuiz, idUtilisateur) {
  const quiz = await quizDepot.trouverParId(idQuiz, idUtilisateur);
  if (!quiz) {
    throw quizIntrouvable();
  }
  // Les documents en attente d'effacement ne doivent plus être accessibles,
  // même avec un JWT encore signé après la suppression du compte.
  const cours = await coursDepot.trouverParId(quiz.id_cours, idUtilisateur);
  if (!cours) {
    throw quizIntrouvable();
  }
  return quiz;
}

// Les questions arrivent déjà vérifiées par le middleware validationQuiz.js.
async function modifier(idQuiz, idUtilisateur, { titre, questions }, revision) {
  const existant = await consulter(idQuiz, idUtilisateur);
  const quiz = await coursDepot.avecCoursVerrouille(existant.id_cours, idUtilisateur, () => modifierVersion(
    idQuiz,
    idUtilisateur,
    {
      titre,
      questions,
      // Un contenu modifié n'a pas été relu dans sa version finale : retour en brouillon.
      statut: STATUT_BROUILLON,
      date_validation: null,
      date_modification: new Date(),
    },
    revision,
  ));
  if (!quiz) {
    throw quizIntrouvable();
  }
  return quiz;
}

// La validation ne touche pas date_modification : le contenu n'a pas changé
// (l'interface s'en sert pour savoir si l'enseignant a modifié le quiz).
async function valider(idQuiz, idUtilisateur, revision) {
  const existant = await consulter(idQuiz, idUtilisateur);
  const quiz = await coursDepot.avecCoursVerrouille(existant.id_cours, idUtilisateur, () => modifierVersion(
    idQuiz,
    idUtilisateur,
    { statut: STATUT_VALIDE, date_validation: new Date() },
    revision,
  ));
  if (!quiz) {
    throw quizIntrouvable();
  }
  return quiz;
}

// Origine du contenu, affichée dans l'export par transparence.
function libelleOrigine(quiz) {
  if (quiz.fournisseur === 'simulation') return 'simulation (sans IA)';
  if (quiz.fournisseur === 'ollama') return `IA locale Ollama (${quiz.modele})`;
  return `IA OpenAI (${quiz.modele})`;
}

// Contenu du fichier JSON exporté : uniquement les données utiles à
// l'enseignant, sans identifiants techniques internes.
async function exporter(idQuiz, idUtilisateur) {
  const quiz = await consulter(idQuiz, idUtilisateur);
  if (quiz.statut !== STATUT_VALIDE) {
    throw erreurMetier('Validez le quiz après l\'avoir relu avant de l\'exporter.', 409);
  }
  await tracer(EVENEMENTS.QUIZ_EXPORTE, idUtilisateur);
  return {
    titre: quiz.titre,
    date_validation: quiz.date_validation,
    genere_par: libelleOrigine(quiz),
    // source_trouvee sert à la relecture dans l'interface : inutile dans le fichier.
    questions: quiz.questions.map((question) => {
      const copie = { ...question };
      delete copie.source_trouvee;
      return copie;
    }),
  };
}

// Remplace UNE question par une nouvelle, générée par l'IA à partir du même
// cours, du même type et avec les mêmes paramètres. Le quiz repasse en
// brouillon : la nouvelle question doit être relue comme les autres.
async function regenererQuestion(idQuiz, idUtilisateur, numero, revision) {
  const quiz = await consulter(idQuiz, idUtilisateur);
  if ((quiz.revision ?? 0) !== revision) {
    throw conflitRevision();
  }
  const ancienneQuestion = quiz.questions[numero];
  if (!ancienneQuestion) {
    throw erreurMetier('Question introuvable', 404);
  }
  const cours = await coursDeLEnseignant(quiz.id_cours, idUtilisateur);
  const parametres = quiz.parametres ?? {};
  const journal = { nombreQuestionsDemandees: 1, idUtilisateur, idCours: quiz.id_cours };

  const { resultat, generation } = await appelerIaJournalisee(
    journal,
    () => genererQuiz(cours.contenu_texte, {
      nombreQuestions: 1,
      types: [ancienneQuestion.type],
      niveau: parametres.niveau ?? null,
      difficulte: parametres.difficulte ?? 'moyen',
      // L'IA reçoit la liste des énoncés existants pour ne pas les reproduire.
      questionsAEviter: quiz.questions.map((question) => question.enonce),
    }),
    'La régénération de la question a échoué. Réessayez dans quelques instants.',
  );

  const questions = [...quiz.questions];
  questions[numero] = resultat.questions[0];
  const quizAJour = await enregistrerResultat(quiz.id_cours, idUtilisateur, generation, () => modifierVersion(
    idQuiz,
    idUtilisateur,
    {
      questions,
      statut: STATUT_BROUILLON,
      date_validation: null,
      date_modification: new Date(),
    },
    revision,
  ));
  if (!quizAJour) {
    throw quizIntrouvable();
  }
  return quizAJour;
}

// Avis de l'IA sur une réponse rédigée à une question ouverte (mode
// « Tester le quiz »). Rien n'est enregistré : c'est une aide ponctuelle,
// l'enseignant reste seul juge de la réponse.
async function corrigerReponse(idQuiz, idUtilisateur, numero, reponseDonnee) {
  const quiz = await consulter(idQuiz, idUtilisateur);
  const question = quiz.questions[numero];
  if (!question) {
    throw erreurMetier('Question introuvable', 404);
  }
  if (question.type !== 'ouverte') {
    throw erreurMetier('Seules les réponses aux questions ouvertes sont corrigées par l\'IA.', 400);
  }

  try {
    return await evaluerReponse({
      enonce: question.enonce,
      reponseAttendue: question.bonne_reponse,
      reponseDonnee,
    });
  } catch (erreur) {
    console.error('Échec de correction IA', { code: erreur.code });
    throw erreurMetier('La correction a échoué. Réessayez dans quelques instants.', 502);
  }
}

async function supprimer(idQuiz, idUtilisateur) {
  const supprime = await quizDepot.supprimer(idQuiz, idUtilisateur);
  if (!supprime) {
    throw quizIntrouvable();
  }
}

module.exports = {
  LONGUEUR_MIN_COURS,
  PHRASES_MIN_COURS,
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
