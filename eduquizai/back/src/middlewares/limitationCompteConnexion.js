const { createHmac } = require('node:crypto');
const { signalerEvenementSecurite } = require('../services/alertesSecurite.service');

// En complément de la limite par adresse IP : comptes ciblés depuis des IP différentes.
// Une empreinte HMAC évite de conserver l'adresse email en clair en mémoire.
// Limitation fail-only : les authentifications réussies réinitialisent le compteur.
// CHOIX — Tout se passe dans ce middleware : il regarde le statut de la réponse
// une fois envoyée (401 = échec, 2xx = réussite). Le contrôleur n'a donc aucune
// règle de sécurité à appliquer, il traduit seulement HTTP <-> service.
const FENETRE_MS = 15 * 60 * 1000;
const MAX_ECHECS = 10;
const MAX_COMPTES = 10000;
const STATUT_IDENTIFIANTS_FAUX = 401;
const comptes = new Map();

function cleCompte(email) {
  return createHmac('sha256', process.env.JWT_SECRET)
    .update('limite-connexion-v1:' + email)
    .digest('hex');
}

function nettoyer(maintenant) {
  for (const [cle, etat] of comptes) {
    if (etat.fin <= maintenant) {
      comptes.delete(cle);
    }
  }
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

// Compte le résultat de la connexion quand la réponse est partie.
function suivreResultat(email, reponse) {
  reponse.on('finish', () => {
    if (reponse.statusCode === STATUT_IDENTIFIANTS_FAUX) {
      enregistrerEchecConnexion(email);
    } else if (reponse.statusCode < 300) {
      reinitialiserTentativesCompte(email);
    }
  });
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
  suivreResultat(requete.body.email, reponse);
  suite();
}

module.exports = { verifierTentativesCompte, enregistrerEchecConnexion, reinitialiserTentativesCompte };
