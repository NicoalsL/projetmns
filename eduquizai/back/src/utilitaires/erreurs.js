// Erreurs métier partagées par tous les services.

// Erreur "exposée" : son message a été rédigé pour l'utilisateur, et
// gestionErreurs.js le renvoie tel quel au client avec le statut HTTP donné.
// Toute autre erreur devient un 500 générique, sans détail technique.
function erreurMetier(message, status) {
  return Object.assign(new Error(message), { status, exposer: true });
}

module.exports = { erreurMetier };
