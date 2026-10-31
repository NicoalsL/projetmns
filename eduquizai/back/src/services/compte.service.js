const Utilisateur = require('../models/utilisateur.modele');
const utilisateurDepot = require('../repositories/utilisateur.depot');
const { ErreurIntrouvable, ErreurAccesRefuse } = require('../utils/erreurs');
const { tracer, EVENEMENTS } = require('./journalSecurite.service');
const { revoquerSessions } = require('./session.service');
const { signalerEvenementSecurite } = require('./alertesSecurite.service');

// Rôle : gérer le compte de l'enseignant connecté (suppression RGPD, déconnexion).

// Supprime le compte et ses données par cascades PostgreSQL (droit à l'effacement).
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

  // PostgreSQL garantit l'effacement atomique des cours, générations et quiz
  // grâce aux clés étrangères ON DELETE CASCADE.
  await utilisateurDepot.supprimer(idUtilisateur);
  await tracer(EVENEMENTS.COMPTE_SUPPRIME, idUtilisateur);
}

// SÉCURITÉ — Déconnexion : tous les jetons du compte deviennent invalides,
// sur tous les appareils. Un jeton volé ne sert plus à rien.
async function deconnecter(idUtilisateur) {
  await revoquerSessions(idUtilisateur);
  signalerEvenementSecurite('session_revoquee');
}

// Profil de l'enseignant connecté (page « Mon compte ») : nom et email uniquement.
async function consulterProfil(idUtilisateur) {
  const ligne = await utilisateurDepot.trouverProfil(idUtilisateur);
  if (!ligne) {
    throw new ErreurIntrouvable('Compte introuvable');
  }
  return new Utilisateur(ligne).versProfilPublic();
}

module.exports = { consulterProfil, supprimerCompte, deconnecter };
