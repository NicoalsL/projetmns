const { genererQuiz, evaluerReponse } = require('../ia/genererQuiz');
const coursDepot = require('../depots/cours.depot');
const quizDepot = require('../depots/quiz.depot');
const generationIaDepot = require('../depots/generationIa.depot');
const Cours = require('../modeles/cours.modele');
const Quiz = require('../modeles/quiz.modele');
const {
  ErreurConflit,
  ErreurDonneesInvalides,
  ErreurIntrouvable,
  ErreurServiceIa,
} = require('../utilitaires/erreurs');
const { tracer, EVENEMENTS } = require('./journalSecurite.service');

// Rôle : le cœur métier du projet. Générer (via ia/genererQuiz.js), modifier,
// valider, exporter un quiz.
// Chaque fonction vérifie d'abord que le quiz (ou le cours) est à l'enseignant
// connecté : sinon 404, comme s'il n'existait pas.
//
// Cycle de vie : brouillon -> l'enseignant relit et corrige -> validé -> export.
// Toute modification le remet en brouillon.
// CHOIX — Validation humaine obligatoire (« Éthique » du CDC) : l'IA peut se
// tromper, l'enseignant reste responsable de ce qu'il distribue.
// CHOIX — POO : les règles propres à un cours ou à un quiz sont dans leurs classes
// (modeles/cours.modele.js, modeles/quiz.modele.js) ; ce service orchestre :
// il vérifie la propriété, appelle l'IA et les dépôts, et lève les erreurs métier.

function normaliserPourCitation(texte) {
  return texte.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// Erreurs réutilisées : 404 (absent ou pas à lui) et 409 (conflit de version).
function quizIntrouvable() {
  return new ErreurIntrouvable('Quiz introuvable');
}

function conflitRevision() {
  return new ErreurConflit('Ce quiz a changé dans un autre onglet. Rechargez-le avant de continuer.');
}

// Enregistre le quiz et son état de livraison dans la même transaction SQL.
// Pourquoi ? Si le cours est supprimé au même moment, la suppression attend :
// pas de quiz orphelin ; la clé étrangère assure aussi l'intégrité.
// Le blocage dure seulement l'écriture, jamais l'appel à l'IA (plusieurs secondes).
async function enregistrerResultat(idCours, idUtilisateur, generation, action) {
  try {
    const resultat = await coursDepot.avecCoursVerrouille(idCours, idUtilisateur, async (client) => {
      const quiz = await action(client);
      await generationIaDepot.marquerLivraison(generation.id_generation, idUtilisateur, 'enregistre', client);
      return quiz;
    });
    if (!resultat) {
      throw new ErreurIntrouvable('Ce cours a été supprimé pendant la génération.');
    }
    return resultat;
  } catch (erreur) {
    try {
      await generationIaDepot.marquerLivraison(generation.id_generation, idUtilisateur, 'echec');
    } catch (erreurJournal) {
      // Compte ou cours supprimé : la ligne du journal a déjà disparu (cascade SQL).
      console.error('État de livraison indisponible', { code: erreurJournal.code });
    }
    throw erreur;
  }
}

// Verrou optimiste : on écrit seulement si le quiz est encore dans la version
// lue par l'enseignant. Sinon (modifié dans un autre onglet) -> 409, recharger.
// CHOIX — « Optimiste » : on ne bloque rien à l'avance, on vérifie au moment
// d'écrire. Simple, et les conflits sont rares (un seul enseignant par quiz).
async function modifierVersion(idQuiz, idUtilisateur, modifications, revision, client) {
  const resultat = await quizDepot.mettreAJour(idQuiz, idUtilisateur, modifications, revision, client);
  if (!resultat) {
    const existe = await quizDepot.trouverParId(idQuiz, idUtilisateur);
    throw existe ? conflitRevision() : quizIntrouvable();
  }
  return new Quiz(resultat);
}

// Vérifie que le cours existe ET appartient à l'enseignant (sinon 404),
// et le renvoie sous forme d'objet Cours.
async function coursDeLEnseignant(idCours, idUtilisateur) {
  const ligne = await coursDepot.trouverParId(idCours, idUtilisateur);
  if (!ligne) {
    throw new ErreurIntrouvable('Cours introuvable');
  }
  return new Cours(ligne);
}

// Appelle l'IA, chronomètre l'appel et le note dans le journal generation_ia
// (réussi ou non). Sert à la génération d'un quiz et d'une seule question.
async function appelerIaJournalisee(journal, appel, messageEchec) {
  // On chronomètre seulement l'IA : c'est elle que vise le critère « < 5 s » du CDC.
  const debut = Date.now();
  let resultat;
  try {
    resultat = await appel();
  } catch (erreur) {
    // Échec noté (statut, durée). L'utilisateur reçoit un message simple ;
    // le détail technique reste dans les logs du serveur.
    console.error('Échec de génération IA', { code: erreur.code });
    try {
      await generationIaDepot.enregistrer({ ...journal, statut: 'echec', dureeMs: Date.now() - debut });
    } catch (erreurJournal) {
      // Une panne du journal ne doit pas cacher l'échec de l'IA.
      console.error('Journal des générations indisponible', { code: erreurJournal.code });
    }
    throw new ErreurServiceIa(messageEchec);
  }
  const dureeMs = Date.now() - debut;

  let generation;
  try {
    generation = await generationIaDepot.enregistrer({ ...journal, statut: 'succes', dureeMs });
  } catch (erreur) {
    // 23503 = clé étrangère violée : le cours a été supprimé pendant l'appel.
    if (erreur.code === '23503') {
      throw new ErreurIntrouvable('Ce cours a été supprimé pendant la génération.');
    }
    throw erreur;
  }
  return { resultat, dureeMs, generation };
}

// Génère un quiz à partir d'un cours, en 4 étapes :
// 1. le cours est-il à l'enseignant ? 2. assez long ? 3. appel à l'IA ;
// 4. enregistrement en « brouillon ».
// parametres : { nombreQuestions, types, niveau, difficulte } (déjà validés).
async function generer(idCours, idUtilisateur, parametres) {
  const cours = await coursDeLEnseignant(idCours, idUtilisateur);

  // Refusé AVANT d'appeler l'IA : aucun coût. La règle est portée par le cours.
  if (!cours.estAssezLongPourUnQuiz()) {
    throw new ErreurDonneesInvalides(
      `Le cours est trop court pour générer un quiz fiable : au moins ${Cours.LONGUEUR_MIN_POUR_QUIZ} caractères `
        + `et ${Cours.PHRASES_MIN_POUR_QUIZ} phrases sont nécessaires, sinon l'IA risque d'inventer des questions.`,
    );
  }
  const texte = cours.contenu_texte;

  const { nombreQuestions, types, niveau, difficulte } = parametres;
  const journal = { nombreQuestionsDemandees: nombreQuestions, idUtilisateur, idCours };

  const { resultat, dureeMs, generation } = await appelerIaJournalisee(
    journal,
    () => genererQuiz(texte, { nombreQuestions, types, niveau, difficulte }),
    'La génération du quiz a échoué. Réessayez dans quelques instants.',
  );
  const maintenant = new Date();
  const quiz = await enregistrerResultat(idCours, idUtilisateur, generation, (client) => quizDepot.creer({
    id_generation: generation.id_generation,
    id_cours: idCours,
    id_utilisateur: idUtilisateur,
    titre: 'Quiz – ' + cours.titre.slice(0, 180),
    statut: Quiz.STATUT_BROUILLON,
    fournisseur: resultat.fournisseur,
    modele: resultat.modele,
    // Gardés pour que l'interface signale si l'IA n'a pas respecté la répartition.
    parametres: { types, niveau, difficulte, repartition_demandee: resultat.repartition },
    questions: resultat.questions,
    date_creation: maintenant,
    date_modification: maintenant,
    date_validation: null,
  }, client));

  return new Quiz({ ...quiz, duree_ms: dureeMs });
}

// Les quiz d'un cours (le cours doit appartenir à l'enseignant).
async function listerPourCours(idCours, idUtilisateur) {
  await coursDeLEnseignant(idCours, idUtilisateur);
  return quizDepot.listerParCours(idCours, idUtilisateur);
}

// Historique des appels à l'IA pour un cours (journal generation_ia).
async function historiqueGenerations(idCours, idUtilisateur) {
  await coursDeLEnseignant(idCours, idUtilisateur);
  return generationIaDepot.listerParCours(idCours, idUtilisateur);
}

// Lit un quiz de l'enseignant. Appelée au début de presque toutes les fonctions
// suivantes : c'est le contrôle de propriété commun.
async function consulter(idQuiz, idUtilisateur) {
  const document = await quizDepot.trouverParId(idQuiz, idUtilisateur);
  if (!document) {
    throw quizIntrouvable();
  }
  const quiz = new Quiz(document);
  // SÉCURITÉ — Défense supplémentaire : confirmer que le cours appartient
  // toujours à l'enseignant, en plus de la contrainte de clé étrangère SQL.
  const cours = await coursDepot.trouverParId(quiz.id_cours, idUtilisateur);
  if (!cours) {
    throw quizIntrouvable();
  }
  return quiz;
}

// Enregistre les corrections de l'enseignant (déjà vérifiées par validationQuiz.js).
async function modifier(idQuiz, idUtilisateur, { titre, questions }, revision) {
  const existant = await consulter(idQuiz, idUtilisateur);
  const cours = await coursDeLEnseignant(existant.id_cours, idUtilisateur);
  const texteCours = normaliserPourCitation(cours.contenu_texte);
  const questionsVerifiees = questions.map((question) => {
    if (!question.source) return question;
    const citation = normaliserPourCitation(question.source);
    return { ...question, source_trouvee: Boolean(citation && texteCours.includes(citation)) };
  });
  const quiz = await coursDepot.avecCoursVerrouille(existant.id_cours, idUtilisateur, (client) => modifierVersion(
    idQuiz,
    idUtilisateur,
    {
      titre,
      questions: questionsVerifiees,
      // Contenu modifié = pas encore relu dans sa version finale : retour en brouillon.
      statut: Quiz.STATUT_BROUILLON,
      date_validation: null,
      date_modification: new Date(),
    },
    revision,
    client,
  ));
  if (!quiz) {
    throw quizIntrouvable();
  }
  return quiz;
}

// L'enseignant confirme avoir relu : le quiz passe « validé » et devient exportable.
// date_modification ne bouge pas : le contenu, lui, n'a pas changé.
async function valider(idQuiz, idUtilisateur, revision) {
  const existant = await consulter(idQuiz, idUtilisateur);
  const quiz = await coursDepot.avecCoursVerrouille(existant.id_cours, idUtilisateur, (client) => modifierVersion(
    idQuiz,
    idUtilisateur,
    { statut: Quiz.STATUT_VALIDE, date_validation: new Date() },
    revision,
    client,
  ));
  if (!quiz) {
    throw quizIntrouvable();
  }
  return quiz;
}

// Prépare le contenu exporté (le contrôleur le convertit en CSV ou PDF si besoin).
// Refusé (409) tant que le quiz n'est pas validé : la règle est portée par le quiz.
async function exporter(idQuiz, idUtilisateur) {
  const quiz = await consulter(idQuiz, idUtilisateur);
  if (!quiz.estExportable()) {
    throw new ErreurConflit('Validez le quiz après l\'avoir relu avant de l\'exporter.');
  }
  await tracer(EVENEMENTS.QUIZ_EXPORTE, idUtilisateur);
  return quiz.contenuExport();
}

// Remplace UNE question par une nouvelle (même cours, même type, mêmes réglages).
// Le quiz repasse en brouillon : la nouvelle question doit être relue.
async function regenererQuestion(idQuiz, idUtilisateur, numero, revision) {
  const quiz = await consulter(idQuiz, idUtilisateur);
  if (quiz.revision !== revision) {
    throw conflitRevision();
  }
  const ancienneQuestion = quiz.question(numero);
  if (!ancienneQuestion) {
    throw new ErreurIntrouvable('Question introuvable');
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
      // Les questions existantes, pour que l'IA ne les répète pas.
      questionsAEviter: quiz.questions.map((question) => question.enonce),
    }),
    'La régénération de la question a échoué. Réessayez dans quelques instants.',
  );

  const questions = [...quiz.questions];
  questions[numero] = resultat.questions[0];
  const quizAJour = await enregistrerResultat(quiz.id_cours, idUtilisateur, generation, (client) => modifierVersion(
    idQuiz,
    idUtilisateur,
    {
      questions,
      statut: Quiz.STATUT_BROUILLON,
      date_validation: null,
      date_modification: new Date(),
    },
    revision,
    client,
  ));
  if (!quizAJour) {
    throw quizIntrouvable();
  }
  return quizAJour;
}

// Avis de l'IA sur une réponse rédigée (mode « Tester le quiz »).
// Rien n'est enregistré : c'est une simple aide, l'enseignant reste seul juge.
async function corrigerReponse(idQuiz, idUtilisateur, numero, reponseDonnee) {
  const quiz = await consulter(idQuiz, idUtilisateur);
  const question = quiz.question(numero);
  if (!question) {
    throw new ErreurIntrouvable('Question introuvable');
  }
  if (question.type !== 'ouverte') {
    throw new ErreurDonneesInvalides('Seules les réponses aux questions ouvertes sont corrigées par l\'IA.');
  }

  try {
    return await evaluerReponse({
      enonce: question.enonce,
      reponseAttendue: question.bonne_reponse,
      reponseDonnee,
    });
  } catch (erreur) {
    console.error('Échec de correction IA', { code: erreur.code });
    throw new ErreurServiceIa('La correction a échoué. Réessayez dans quelques instants.');
  }
}

// Supprime un quiz (la requête filtre sur le propriétaire, sinon 404).
async function supprimer(idQuiz, idUtilisateur) {
  const supprime = await quizDepot.supprimer(idQuiz, idUtilisateur);
  if (!supprime) {
    throw quizIntrouvable();
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
