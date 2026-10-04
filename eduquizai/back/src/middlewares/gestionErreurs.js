// Middleware final Express : transforme toute erreur non gérée en réponse JSON
// propre, sans jamais renvoyer la stack technique au client.
function gestionErreurs(erreur, requete, reponse, suite) {
  // Si la réponse est déjà partie, Express doit gérer lui-même la fermeture.
  if (reponse.headersSent) return suite(erreur);

  // Erreurs du client levées par express.json() : JSON mal formé (400) ou
  // corps trop gros (413). Ce ne sont pas des pannes serveur.
  const statut = erreur.status || erreur.statusCode;

  // Erreurs métier levées volontairement par les services (exposer: true) :
  // leur message a été rédigé pour l'utilisateur, on peut le renvoyer.
  if (erreur.exposer === true && [400, 401, 403, 404, 409, 502].includes(statut)) {
    return reponse.status(statut).json({ erreur: erreur.message });
  }
  if (statut === 400) return reponse.status(400).json({ erreur: 'Requête ou JSON invalide' });
  if (statut === 413) return reponse.status(413).json({ erreur: 'Requête trop volumineuse' });

  // On journalise seulement le type d'erreur : le corps de la requête peut
  // contenir un mot de passe, et le message SQL des détails sur la base.
  console.error('Erreur interne', { type: erreur.name, code: erreur.code });
  return reponse.status(500).json({ erreur: 'Erreur interne du serveur' });
}

module.exports = gestionErreurs;
