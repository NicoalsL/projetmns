const jwt = require('jsonwebtoken');
const { estIdentifiantSql } = require('../utilitaires/entrees');
const { sessionEstValide } = require('../services/session.service');

const MESSAGE_JETON_REFUSE = 'Jeton invalide ou expiré';

// Vérifie le JWT dans l'en-tête Authorization avant d'atteindre un contrôleur
// protégé ; injecte l'utilisateur décodé dans requete.utilisateur.
async function verifierJeton(requete, reponse, suite) {
  const enTete = requete.headers.authorization;
  if (!enTete || !enTete.startsWith('Bearer ')) {
    return reponse.status(401).json({ erreur: 'Authentification requise' });
  }

  const jeton = enTete.slice('Bearer '.length);
  let contenu;
  try {
    // algorithms imposé : refuse un jeton qui annoncerait un autre algorithme
    // (ex. "none") pour contourner la vérification de signature.
    contenu = jwt.verify(jeton, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return reponse.status(401).json({ erreur: MESSAGE_JETON_REFUSE });
  }

  // Une signature valide ne suffit pas : le jeton doit aussi porter un
  // identifiant utilisable dans les requêtes SQL (entier positif INTEGER).
  if (!estIdentifiantSql(contenu.id_utilisateur)) {
    return reponse.status(401).json({ erreur: MESSAGE_JETON_REFUSE });
  }

  // Révocation : la version de session du jeton doit être celle du compte en
  // base. Un jeton émis avant la déconnexion, ou dont le compte a été
  // supprimé, est refusé même s'il n'a pas expiré. Les jetons émis avant
  // l'ajout de ce contrôle n'ont pas de version : ils comptent comme version 0.
  const version = contenu.version ?? 0;
  if (!Number.isInteger(version) || version < 0) {
    return reponse.status(401).json({ erreur: MESSAGE_JETON_REFUSE });
  }

  let valide;
  try {
    valide = await sessionEstValide(contenu.id_utilisateur, version);
  } catch (erreur) {
    // Base injoignable : erreur 500 générique (gestionErreurs.js), pas un 401
    // qui déconnecterait à tort l'utilisateur.
    return suite(erreur);
  }
  if (!valide) {
    return reponse.status(401).json({ erreur: MESSAGE_JETON_REFUSE });
  }

  requete.utilisateur = contenu;
  suite();
}

module.exports = verifierJeton;
