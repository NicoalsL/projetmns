const compteService = require('../services/compte.service');
const { prolongerSession } = require('../services/session.service');
const { expirationJetonMs } = require('../services/auth.service');
const { deposerSession, effacerSession } = require('../middlewares/sessionCookie');

// Rôle : traduire les requêtes HTTP sur le compte en appels à compte.service.js.
// L'enseignant concerné est toujours celui du jeton (requete.utilisateur).

// GET /api/compte -> 200 : nom et email de l'enseignant connecté.
async function consulter(requete, reponse, suite) {
  try {
    const profil = await compteService.consulterProfil(requete.utilisateur.id_utilisateur);
    reponse.json(profil);
  } catch (erreur) {
    suite(erreur);
  }
}

// DELETE /api/compte -> 204 : compte et toutes ses données supprimés (droit à l'effacement RGPD).
async function supprimer(requete, reponse, suite) {
  try {
    await compteService.supprimerCompte(requete.utilisateur.id_utilisateur, requete.body.motDePasse);
    effacerSession(reponse);
    reponse.status(204).end(); // 204 : réussi, rien à renvoyer
  } catch (erreur) {
    suite(erreur);
  }
}

// POST /api/compte/deconnexion -> 204 : tous les jetons de ce compte deviennent invalides.
async function deconnecter(requete, reponse, suite) {
  try {
    await compteService.deconnecter(requete.utilisateur.id_utilisateur);
    effacerSession(reponse);
    reponse.status(204).end();
  } catch (erreur) {
    suite(erreur);
  }
}

// POST /api/compte/session : nouveau jeton pour la même session, demandé avant
// l'expiration de l'actuel (bouton « Rester connecté »).
function prolonger(requete, reponse) {
  const jeton = prolongerSession(requete.utilisateur);
  deposerSession(reponse, jeton);
  reponse.json({ expiration: expirationJetonMs(jeton), id_utilisateur: requete.utilisateur.id_utilisateur });
}

function etatSession(requete, reponse) {
  reponse.json({ expiration: requete.utilisateur.exp * 1000, id_utilisateur: requete.utilisateur.id_utilisateur });
}

module.exports = { consulter, supprimer, deconnecter, prolonger, etatSession };
