const utilisateurDepot = require('../repositories/utilisateur.depot');
const { genererJeton } = require('./auth.service');

// Rôle : pouvoir annuler les jetons (révocation) et prolonger une session.
// SÉCURITÉ — Un JWT reste valable jusqu'à son expiration : sans ce fichier,
// impossible d'annuler un jeton volé ou celui d'un compte supprimé.
// Solution : chaque compte a un numéro de version (version_jeton), copié dans
// ses jetons. Augmenter ce numéro annule d'un coup tous les anciens jetons.
// CHOIX — Un numéro par compte plutôt qu'une « liste noire » de jetons :
// une seule colonne, rien à nettoyer, et la déconnexion vaut pour tous les appareils.

// Jeton valide = le compte existe encore ET la version correspond.
// Appelé à chaque requête protégée (middleware authentification.js).
async function sessionEstValide(idUtilisateur, versionJeton) {
  const versionActuelle = await utilisateurDepot.trouverVersionJeton(idUtilisateur);
  return versionActuelle !== null && versionActuelle === versionJeton;
}

// Déconnexion partout (tous les appareils) : version + 1.
async function revoquerSessions(idUtilisateur) {
  await utilisateurDepot.incrementerVersionJeton(idUtilisateur);
}

// Prolonge une session encore valide : nouveau jeton, mêmes droits, même version
// (donc toujours annulable par une déconnexion).
// ACCESSIBILITÉ — RGAA 13.1 : on doit pouvoir prolonger une limite de temps
// avant de perdre sa saisie.
function prolongerSession(contenuJeton) {
  return genererJeton({
    id_utilisateur: contenuJeton.id_utilisateur,
    role: contenuJeton.role,
    version_jeton: contenuJeton.version ?? 0,
  }, contenuJeton.debut_session ?? contenuJeton.iat);
}

module.exports = { sessionEstValide, revoquerSessions, prolongerSession };
