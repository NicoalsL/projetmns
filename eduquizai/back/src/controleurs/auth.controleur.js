const authService = require('../services/auth.service');
const { deposerSession } = require('../middlewares/sessionCookie');

// Rôle : inscription et connexion. Traduit la requête HTTP en appel à
// auth.service.js, puis le résultat en réponse HTTP. Aucune règle métier ici.
// CHOIX — Contrôleur séparé du service : le service ne connaît pas HTTP,
// on peut donc le tester (ou le réutiliser) sans serveur web.
// Les refus (email déjà pris : 409, identifiants faux : 401) sont des erreurs
// métier levées par le service, et traduites par gestionErreurs.js.
// Les échecs de connexion sont comptés par limitationCompteConnexion.js.

// Dépose le jeton dans les cookies et prépare le corps de la réponse.
// SÉCURITÉ — Seulement le profil public : jamais l'empreinte du mot de passe
// (champ privé de la classe Utilisateur) ni la version de session.
function ouvrirSession(reponse, utilisateur, jeton) {
  deposerSession(reponse, jeton);
  return {
    utilisateur: utilisateur.versProfilPublic(),
    expiration: authService.expirationJetonMs(jeton),
    id_utilisateur: utilisateur.id_utilisateur,
  };
}

// POST /api/auth/inscription -> 201 (compte créé) ou 409 (email déjà pris).
async function inscription(requete, reponse, suite) {
  try {
    const { utilisateur, jeton } = await authService.inscrire(requete.body);
    reponse.status(201).json(ouvrirSession(reponse, utilisateur, jeton));
  } catch (erreur) {
    suite(erreur); // confiée à gestionErreurs.js
  }
}

// POST /api/auth/connexion -> 200 avec le jeton, ou 401.
// SÉCURITÉ — Même message si l'email est inconnu ou le mot de passe faux :
// impossible de savoir quels emails ont un compte (voir auth.service.js).
async function connexion(requete, reponse, suite) {
  try {
    const { utilisateur, jeton } = await authService.connecter(requete.body);
    reponse.json(ouvrirSession(reponse, utilisateur, jeton));
  } catch (erreur) {
    suite(erreur);
  }
}

module.exports = { inscription, connexion };
