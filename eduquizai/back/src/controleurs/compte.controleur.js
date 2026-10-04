const compteService = require('../services/compte.service');

// Traduit les requêtes HTTP sur le compte en appels à compte.service.js.

async function supprimer(requete, reponse, suite) {
  try {
    await compteService.supprimerCompte(requete.utilisateur.id_utilisateur, requete.body.motDePasse);
    reponse.status(204).end();
  } catch (erreur) {
    suite(erreur);
  }
}

async function deconnecter(requete, reponse, suite) {
  try {
    await compteService.deconnecter(requete.utilisateur.id_utilisateur);
    reponse.status(204).end();
  } catch (erreur) {
    suite(erreur);
  }
}

module.exports = { supprimer, deconnecter };
