const bcrypt = require('bcryptjs');
const utilisateurDepot = require('../depots/utilisateur.depot');
const quizDepot = require('../depots/quiz.depot');
const { reprendreNettoyage } = require('./nettoyageQuiz.service');
const { erreurMetier } = require('../utilitaires/erreurs');
const { tracer, EVENEMENTS } = require('./journalSecurite.service');
const { revoquerSessions } = require('./session.service');

// Gestion du compte de l'enseignant connecté : droit à l'effacement (RGPD).

// Supprime le compte et TOUTES ses données dans les deux bases.
// Le mot de passe est redemandé : un jeton volé (ou un ordinateur resté
// ouvert) ne doit pas suffire pour effacer définitivement un compte.
async function supprimerCompte(idUtilisateur, motDePasse) {
  const utilisateur = await utilisateurDepot.trouverParId(idUtilisateur);
  if (!utilisateur) {
    throw erreurMetier('Compte introuvable', 404);
  }

  const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.mot_de_passe_hache);
  if (!motDePasseValide) {
    // 403 et non 401 : la session est valide, c'est la confirmation qui échoue
    // (un 401 déconnecterait l'utilisateur côté interface).
    throw erreurMetier('Mot de passe incorrect', 403);
  }

  // Les cascades SQL effacent les cours et enregistrent leurs demandes de
  // nettoyage Mongo dans la même transaction, même après un arrêt du serveur.
  await utilisateurDepot.supprimer(idUtilisateur);
  await reprendreNettoyage();

  // Droit à l'effacement complet : la file ci-dessus ne connaît que les cours
  // supprimés depuis la création du déclencheur. Un quiz resté orphelin plus
  // tôt (cours déjà disparu) est effacé ici, par son propriétaire. En cas de
  // panne Mongo, ces quiz restent inaccessibles (consulter() exige le cours).
  try {
    await quizDepot.supprimerParUtilisateur(idUtilisateur);
  } catch (erreur) {
    console.error('Effacement des quiz du compte différé', { code: erreur.code });
  }
  await tracer(EVENEMENTS.COMPTE_SUPPRIME, idUtilisateur);
}

// Déconnexion : invalide tous les jetons du compte, sur tous les appareils.
// Un jeton volé devient inutilisable dès que l'enseignant se déconnecte.
async function deconnecter(idUtilisateur) {
  await revoquerSessions(idUtilisateur);
}

module.exports = { supprimerCompte, deconnecter };
