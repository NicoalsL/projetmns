const depot = require('../depots/cours.depot');

function introuvable() {
  // Même réponse pour un identifiant absent ou appartenant à un autre enseignant.
  return Object.assign(new Error('Cours introuvable'), { status: 404, exposer: true });
}
async function creer(donnees, idUtilisateur) {
  try { return await depot.creer({ ...donnees, idUtilisateur }); }
  catch (erreur) {
    if (erreur.code === '23503' && erreur.constraint === 'cours_id_utilisateur_fkey') {
      throw Object.assign(new Error('Votre compte n’est plus disponible. Reconnectez-vous.'), { status: 401, exposer: true });
    }
    throw erreur;
  }
}
function lister(idUtilisateur) { return depot.lister(idUtilisateur); }
async function consulter(idCours, idUtilisateur) {
  const cours = await depot.trouverParId(idCours, idUtilisateur);
  if (!cours) throw introuvable();
  return cours;
}
async function supprimer(idCours, idUtilisateur) {
  if (!(await depot.supprimer(idCours, idUtilisateur))) throw introuvable();
  // Les générations SQL suivent la cascade. Les quiz MongoDB ne sont pas encore
  // implémentés ; leur suppression coordonnée devra accompagner ce futur module.
}
module.exports = { creer, lister, consulter, supprimer };
