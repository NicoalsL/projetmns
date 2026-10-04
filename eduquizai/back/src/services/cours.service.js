const coursDepot = require('../depots/cours.depot');
const { reprendreNettoyage } = require('./nettoyageQuiz.service');
const { erreurMetier } = require('../utilitaires/erreurs');

// Règles métier des cours : un enseignant ne voit et ne supprime que ses
// propres cours. Le contrôle de propriété est fait dans les requêtes SQL du dépôt.

// Même réponse 404 pour un cours inexistant ET pour le cours d'un autre
// enseignant : un attaquant ne peut pas deviner quels identifiants existent.
function coursIntrouvable() {
  return erreurMetier('Cours introuvable', 404);
}

async function creer(donnees, idUtilisateur) {
  try {
    return await coursDepot.creer({ ...donnees, idUtilisateur });
  } catch (erreur) {
    // 23503 = clé étrangère violée : le compte a été supprimé alors que son
    // jeton est encore valide. On demande une reconnexion plutôt qu'une 500.
    if (erreur.code === '23503' && erreur.constraint === 'cours_id_utilisateur_fkey') {
      throw erreurMetier('Votre compte n’est plus disponible. Reconnectez-vous.', 401);
    }
    throw erreur;
  }
}

function lister(idUtilisateur) {
  return coursDepot.lister(idUtilisateur);
}

async function consulter(idCours, idUtilisateur) {
  const cours = await coursDepot.trouverParId(idCours, idUtilisateur);
  if (!cours) {
    throw coursIntrouvable();
  }
  return cours;
}

// Les quiz déjà générés ne sont pas modifiés : ils restent ceux que
// l'enseignant a relus (et éventuellement validés) sur l'ancien texte.
async function modifier(idCours, idUtilisateur, donnees) {
  const cours = await coursDepot.mettreAJour(idCours, idUtilisateur, donnees);
  if (!cours) {
    throw coursIntrouvable();
  }
  return cours;
}

async function supprimer(idCours, idUtilisateur) {
  // D'abord PostgreSQL : la requête vérifie le propriétaire et supprime en une
  // seule opération. Les lignes generation_ia suivent par ON DELETE CASCADE.
  const supprime = await coursDepot.supprimer(idCours, idUtilisateur);
  if (!supprime) {
    throw coursIntrouvable();
  }

  // Le déclencheur SQL a conservé une demande durable. Les quiz sont déjà
  // inaccessibles (parent absent), même si Mongo nécessite une nouvelle tentative.
  await reprendreNettoyage();
}

module.exports = { creer, lister, consulter, modifier, supprimer };
