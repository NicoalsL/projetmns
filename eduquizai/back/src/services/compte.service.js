const Utilisateur = require('../modeles/utilisateur.modele');
const utilisateurDepot = require('../depots/utilisateur.depot');
const quizDepot = require('../depots/quiz.depot');
const { reprendreNettoyage } = require('./nettoyageQuiz.service');
const { ErreurIntrouvable, ErreurAccesRefuse } = require('../utilitaires/erreurs');
const { tracer, EVENEMENTS } = require('./journalSecurite.service');
const { revoquerSessions } = require('./session.service');
const { signalerEvenementSecurite } = require('./alertesSecurite.service');

// Rôle : gérer le compte de l'enseignant connecté (suppression RGPD, déconnexion).

// Supprime le compte et TOUTES ses données, dans les deux bases (droit à l'effacement).
// SÉCURITÉ — Mot de passe redemandé : un jeton volé (ou un ordinateur resté
// allumé) ne doit pas suffire pour tout effacer.
async function supprimerCompte(idUtilisateur, motDePasse) {
  const ligne = await utilisateurDepot.trouverParId(idUtilisateur);
  if (!ligne) {
    throw new ErreurIntrouvable('Compte introuvable');
  }

  // L'objet Utilisateur garde l'empreinte privée et sait comparer le mot de passe.
  const motDePasseValide = await new Utilisateur(ligne).motDePasseCorrespond(motDePasse);
  if (!motDePasseValide) {
    // 403 et non 401 : la session est bonne, seule la confirmation échoue
    // (un 401 déconnecterait l'enseignant dans l'interface).
    throw new ErreurAccesRefuse('Mot de passe incorrect');
  }

  // 1. PostgreSQL : supprimer le compte supprime aussi ses cours (ON DELETE CASCADE),
  //    et le déclencheur note les quiz à effacer, dans la même transaction.
  // 2. MongoDB : on efface ensuite ces quiz (voir nettoyageQuiz.service.js).
  await utilisateurDepot.supprimer(idUtilisateur);
  await reprendreNettoyage();

  // 3. Filet de sécurité : on efface aussi tout quiz restant de ce compte
  //    (quiz « orphelin » d'un cours supprimé avant l'ajout du déclencheur).
  //    Si MongoDB est en panne, ces quiz restent de toute façon inaccessibles.
  try {
    await quizDepot.supprimerParUtilisateur(idUtilisateur);
  } catch (erreur) {
    console.error('Effacement des quiz du compte différé', { code: erreur.code });
  }
  await tracer(EVENEMENTS.COMPTE_SUPPRIME, idUtilisateur);
}

// SÉCURITÉ — Déconnexion : tous les jetons du compte deviennent invalides,
// sur tous les appareils. Un jeton volé ne sert plus à rien.
async function deconnecter(idUtilisateur) {
  await revoquerSessions(idUtilisateur);
  signalerEvenementSecurite('session_revoquee');
}

module.exports = { supprimerCompte, deconnecter };
