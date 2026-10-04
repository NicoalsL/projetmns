const journalSecuriteDepot = require('../depots/journalSecurite.depot');

// Trace les actions sensibles dans journal_securite (OWASP A09 : sans trace,
// une attaque par force brute ou un abus passe inaperçu).

const EVENEMENTS = {
  CONNEXION_REUSSIE: 'connexion_reussie',
  CONNEXION_ECHOUEE: 'connexion_echouee',
  COMPTE_SUPPRIME: 'compte_supprime',
  QUIZ_EXPORTE: 'quiz_exporte',
};

// idUtilisateur : null quand il est inconnu (connexion avec un email inexistant).
// Ne lève jamais d'erreur : une panne du journal ne doit pas empêcher un
// enseignant de se connecter ou d'exporter. L'incident est seulement signalé
// dans les logs du serveur, sans détail sur l'utilisateur.
async function tracer(typeEvenement, idUtilisateur = null) {
  try {
    await journalSecuriteDepot.enregistrer(typeEvenement, idUtilisateur);
  } catch (erreur) {
    console.error('Journal de sécurité indisponible', { evenement: typeEvenement, code: erreur.code });
  }
}

module.exports = { tracer, EVENEMENTS };
