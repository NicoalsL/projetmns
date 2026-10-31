const journalSecuriteDepot = require('../repositories/journalSecurite.depot');

// Rôle : noter les actions sensibles dans la table journal_securite.
// SÉCURITÉ — Sans trace, une attaque passe inaperçue (OWASP A09).
// RGPD — On note seulement le type, la date et l'enseignant : ni email,
// ni mot de passe, ni adresse IP (minimisation des données).

// Les 4 événements notés (même liste que le CHECK de schema.sql).
const EVENEMENTS = {
  CONNEXION_REUSSIE: 'connexion_reussie',
  CONNEXION_ECHOUEE: 'connexion_echouee',
  COMPTE_SUPPRIME: 'compte_supprime',
  QUIZ_EXPORTE: 'quiz_exporte',
};

// idUtilisateur = null si inconnu (connexion avec un email qui n'existe pas).
// CHOIX — Ne plante jamais : une panne du journal ne doit pas empêcher de se
// connecter ou d'exporter. La panne est seulement signalée dans les logs.
async function tracer(typeEvenement, idUtilisateur = null) {
  try {
    await journalSecuriteDepot.enregistrer(typeEvenement, idUtilisateur);
  } catch (erreur) {
    console.error('Journal de sécurité indisponible', { evenement: typeEvenement, code: erreur.code });
  }
}

module.exports = { tracer, EVENEMENTS };
