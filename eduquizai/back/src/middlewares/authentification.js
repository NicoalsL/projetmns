const jwt = require('jsonwebtoken');

// Vérifie le JWT dans l'en-tête Authorization avant d'atteindre un contrôleur
// protégé ; injecte l'utilisateur décodé dans requete.utilisateur.
function verifierJeton(requete, reponse, suite) {
  const enTete = requete.headers.authorization;
  if (!enTete || !enTete.startsWith('Bearer ')) {
    return reponse.status(401).json({ erreur: 'Authentification requise' });
  }

  const jeton = enTete.slice('Bearer '.length);
  try {
    requete.utilisateur = jwt.verify(jeton, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!Number.isInteger(requete.utilisateur.id_utilisateur) || requete.utilisateur.id_utilisateur <= 0 || requete.utilisateur.id_utilisateur > 2147483647) {
      return reponse.status(401).json({ erreur: 'Jeton invalide ou expiré' });
    }
    suite();
  } catch {
    reponse.status(401).json({ erreur: 'Jeton invalide ou expiré' });
  }
}

module.exports = verifierJeton;
