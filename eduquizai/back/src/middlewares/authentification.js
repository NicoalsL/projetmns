const jwt = require('jsonwebtoken');
const { estIdentifiantSql } = require('../utils/entrees');
const { sessionEstValide } = require('../services/session.service');
const { cookies, NOM_SESSION } = require('./sessionCookie');

const MESSAGE_JETON_REFUSE = 'Jeton invalide ou expiré';
const { DUREE_MAX_SESSION_SECONDES } = require('../services/auth.service');

// Rôle : laisser passer uniquement un enseignant connecté.
// Son jeton (JWT) est vérifié en 4 étapes. Si tout est bon, son identité est
// rangée dans requete.utilisateur. Sinon : 401, et la requête s'arrête ici.
//
// CHOIX — JWT plutôt qu'une session stockée sur le serveur : le serveur n'a
// rien à mémoriser pour savoir qui est connecté (API « sans état »).
// Point faible du JWT : on ne peut pas l'annuler avant son expiration.
// Réponse à ce point faible : l'étape 4 (numéro de version du compte).
async function verifierJeton(requete, reponse, suite) {
  // 1. Jeton présent ? Format attendu : « Authorization: Bearer <jeton> ».
  const enTete = requete.headers.authorization;
  const jetonCookie = cookies(requete)[NOM_SESSION];
  if (!jetonCookie && (!enTete || !enTete.startsWith('Bearer '))) {
    return reponse.status(401).json({ erreur: 'Authentification requise' });
  }

  // 2. Jeton authentique et pas expiré ? (signature vérifiée avec le secret du serveur)
  const jeton = enTete?.startsWith('Bearer ') ? enTete.slice('Bearer '.length) : jetonCookie; // enlève « Bearer »
  let contenu;
  try {
    // SÉCURITÉ — Algorithme imposé (HS256). Sinon, un faux jeton qui annonce
    // « alg: none » (aucune signature) pourrait être accepté.
    contenu = jwt.verify(jeton, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return reponse.status(401).json({ erreur: MESSAGE_JETON_REFUSE });
  }

  const debut = contenu.debut_session ?? contenu.iat;
  const maintenant = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(debut) || debut > maintenant || maintenant >= debut + DUREE_MAX_SESSION_SECONDES) {
    return reponse.status(401).json({ erreur: MESSAGE_JETON_REFUSE });
  }

  // 3. Identifiant valide ? (entier positif : il servira dans les requêtes SQL)
  if (!estIdentifiantSql(contenu.id_utilisateur)) {
    return reponse.status(401).json({ erreur: MESSAGE_JETON_REFUSE });
  }

  // 4. Session encore active ?
  // Chaque compte a un numéro de version, copié dans ses jetons.
  // Déconnexion = numéro + 1 : les anciens jetons ne correspondent plus.
  // Compte supprimé = plus de numéro : ses jetons sont refusés aussi.
  const version = contenu.version ?? 0; // vieux jeton sans version = version 0
  if (!Number.isInteger(version) || version < 0) {
    return reponse.status(401).json({ erreur: MESSAGE_JETON_REFUSE });
  }

  let valide;
  try {
    valide = await sessionEstValide(contenu.id_utilisateur, version);
  } catch (erreur) {
    // Base en panne : erreur 500 et non 401, pour ne pas déconnecter
    // l'enseignant à cause d'une panne du serveur.
    return suite(erreur);
  }
  if (!valide) {
    return reponse.status(401).json({ erreur: MESSAGE_JETON_REFUSE });
  }

  // SÉCURITÉ — L'identité vient du jeton, jamais de ce qu'envoie le navigateur.
  requete.utilisateur = contenu;
  suite(); // étape suivante : validation, puis contrôleur
}

module.exports = verifierJeton;
