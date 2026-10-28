const { createHmac } = require('node:crypto');
const { signalerEvenementSecurite } = require('../services/alertesSecurite.service');

// En complément de la limite par adresse IP : comptes ciblés depuis des IP différentes.
// Une empreinte HMAC évite de conserver l'adresse email en clair en mémoire.
// Limitation fail-only : les authentifications réussies réinitialisent le compteur.
const FENETRE_MS = 15 * 60 * 1000;
const MAX_ECHECS = 10;
const MAX_COMPTES = 10000;
const comptes = new Map();

function cleCompte(email) {
  return createHmac('sha256', process.env.JWT_SECRET)
    .update('limite-connexion-v1:' + email)
    .digest('hex');
}

function nettoyer(maintenant) {
  for (const [cle, etat] of comptes) {
    if (etat.fin <= maintenant) comptes.delete(cle);
  }
}

function verifierTentativesCompte(requete, reponse, suite) {
  const maintenant = Date.now();
  nettoyer(maintenant);
  const cle = cleCompte(requete.body.email);
  const etat = comptes.get(cle);
  if (etat && etat.nombre >= MAX_ECHECS) {
    signalerEvenementSecurite('connexion_limitee');
    reponse.set('Retry-After', String(Math.max(1, Math.ceil((etat.fin - maintenant) / 1000))));
    return reponse.status(429).json({ erreur: 'Trop de tentatives. Réessayez plus tard.' });
  }
  // En cas de saturation, on refuse proprement au lieu de laisser passer.
  if (!etat && comptes.size >= MAX_COMPTES) {
    signalerEvenementSecurite('connexion_limitee');
    reponse.set('Retry-After', '60');
    return reponse.status(429).json({ erreur: 'Trop de tentatives. Réessayez plus tard.' });
  }
  suite();
}

function enregistrerEchecConnexion(email) {
  const maintenant = Date.now();
  nettoyer(maintenant);
  const cle = cleCompte(email);
  const etat = comptes.get(cle);
  if (!etat) {
    if (comptes.size < MAX_COMPTES) {
      comptes.set(cle, { nombre: 1, fin: maintenant + FENETRE_MS });
    }
    return;
  }
  etat.nombre += 1;
}

function reinitialiserTentativesCompte(email) {
  comptes.delete(cleCompte(email));
}

module.exports = { verifierTentativesCompte, enregistrerEchecConnexion, reinitialiserTentativesCompte };
