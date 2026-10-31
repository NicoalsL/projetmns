const { ErreurMetier } = require('../utils/erreurs');

// Rôle : dernier maillon de la chaîne. Reçoit toute erreur non traitée et
// renvoie une réponse JSON propre.
// SÉCURITÉ — Jamais de détail technique (message SQL, pile d'appels) au
// navigateur : ce serait offrir un plan du serveur à un attaquant (OWASP A05).
function gestionErreurs(erreur, requete, reponse, suite) {
  // Réponse déjà partie : on laisse Express fermer la connexion.
  if (reponse.headersSent) return suite(erreur);

  // Statut de l'erreur. Peut venir d'Express : JSON mal formé (400) ou
  // requête trop grosse (413), deux fautes du client.
  const statut = erreur.status || erreur.statusCode;

  // Erreur « métier » (une classe fille d'ErreurMetier : ErreurIntrouvable…),
  // créée exprès par un service : son message est écrit pour l'utilisateur
  // (« Cours introuvable »), on le montre avec son statut.
  // CHOIX — On reconnaît l'erreur à sa CLASSE (instanceof), pas à une propriété
  // qu'on pourrait oublier ou ajouter par erreur.
  if (erreur instanceof ErreurMetier) {
    return reponse.status(erreur.status).json({ erreur: erreur.message });
  }
  if (statut === 400) return reponse.status(400).json({ erreur: 'Requête ou JSON invalide' });
  if (statut === 413) return reponse.status(413).json({ erreur: 'Requête trop volumineuse' });

  // Tout le reste = panne interne : message générique pour l'utilisateur.
  // Dans les journaux, seulement le type d'erreur : la requête pouvait
  // contenir un mot de passe, et un message SQL des détails sur la base.
  console.error('Erreur interne', { type: erreur.name, code: erreur.code });
  return reponse.status(500).json({ erreur: 'Erreur interne du serveur' });
}

module.exports = gestionErreurs;
