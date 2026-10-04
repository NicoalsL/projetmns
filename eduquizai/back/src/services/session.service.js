const utilisateurDepot = require('../depots/utilisateur.depot');

// Révocation des sessions. Un JWT reste valide jusqu'à son expiration : sans
// contrôle supplémentaire, il serait impossible d'invalider un jeton volé,
// ni celui d'un compte supprimé. Chaque compte porte donc un numéro de
// version (utilisateur.version_jeton), recopié dans chaque jeton émis :
// incrémenter ce numéro invalide d'un coup tous les jetons déjà émis.

// Le jeton est valide si le compte existe encore ET si sa version correspond.
async function sessionEstValide(idUtilisateur, versionJeton) {
  const versionActuelle = await utilisateurDepot.trouverVersionJeton(idUtilisateur);
  return versionActuelle !== null && versionActuelle === versionJeton;
}

// Déconnexion de toutes les sessions du compte (tous les appareils).
async function revoquerSessions(idUtilisateur) {
  await utilisateurDepot.incrementerVersionJeton(idUtilisateur);
}

module.exports = { sessionEstValide, revoquerSessions };
