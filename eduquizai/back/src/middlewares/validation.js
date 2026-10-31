const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // forme simple : texte@texte.texte
const LONGUEUR_MAX_NOM = 100; // = VARCHAR(100) dans schema.sql
const LONGUEUR_MAX_EMAIL = 255; // = VARCHAR(255) dans schema.sql
const OCTETS_MAX_MOT_DE_PASSE = 72; // limite de bcrypt
// SÉCURITÉ — 12 caractères minimum à l'inscription, comme le recommande
// l'OWASP ASVS (V2.1.1). Les comptes plus anciens se connectent toujours.
const LONGUEUR_MIN_MOT_DE_PASSE = 12;

const { estObjetJson } = require('../utils/entrees');

// Rôle : vérifier les données du compte (inscription, connexion, suppression)
// AVANT le contrôleur. Donnée invalide : réponse 400 avec un message clair.
//
// CHOIX — Validation écrite à la main plutôt qu'avec une bibliothèque (Joi, Zod) :
// peu de champs, aucune dépendance en plus, et chaque règle se lit et s'explique.

// Le caractère nul (\0) est refusé par PostgreSQL : on le bloque ici (400)
// plutôt que de laisser la base planter (500).
function sansCaractereNul(valeur) {
  return !valeur.includes('\0');
}

function emailValide(email) {
  return typeof email === 'string'
    && email.trim().length <= LONGUEUR_MAX_EMAIL
    && sansCaractereNul(email)
    && REGEX_EMAIL.test(email.trim());
}

// Email en minuscules : « Prof@x.fr » et « prof@x.fr » = le même compte.
function normaliserEmail(email) {
  return email.trim().toLowerCase();
}

// SÉCURITÉ — bcrypt ignore tout ce qui dépasse 72 octets : deux mots de passe
// identiques sur leurs 72 premiers octets seraient vus comme égaux.
// On compte en octets, pas en caractères : « é » prend 2 octets.
function motDePasseValide(motDePasse, longueurMinimum) {
  return typeof motDePasse === 'string'
    && motDePasse.length >= longueurMinimum
    && Buffer.byteLength(motDePasse, 'utf8') <= OCTETS_MAX_MOT_DE_PASSE;
}

// Inscription : nom, email, mot de passe (12 caractères minimum) et consentement.
function validerInscription(requete, reponse, suite) {
  if (!estObjetJson(requete.body)) {
    return reponse.status(400).json({ erreur: 'Corps de requête invalide' });
  }

  const { nom, email, motDePasse } = requete.body;
  const nomValide = typeof nom === 'string'
    && nom.trim().length > 0
    && nom.trim().length <= LONGUEUR_MAX_NOM
    && sansCaractereNul(nom);
  if (!nomValide) {
    return reponse.status(400).json({ erreur: 'Le nom doit contenir entre 1 et 100 caractères' });
  }
  if (!emailValide(email)) {
    return reponse.status(400).json({ erreur: 'Email invalide (255 caractères maximum)' });
  }
  if (!motDePasseValide(motDePasse, LONGUEUR_MIN_MOT_DE_PASSE)) {
    return reponse.status(400).json({
      erreur: `Le mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères `
        + 'et au plus 72 octets UTF-8',
    });
  }
  // RGPD — Consentement obligatoire : exactement true (case cochée),
  // pas une valeur « à peu près vraie » comme "oui" ou 1.
  if (requete.body.consentementRgpd !== true) {
    return reponse.status(400).json({
      erreur: 'Vous devez accepter la politique de confidentialité pour créer un compte',
    });
  }

  // SÉCURITÉ — On reconstruit le corps avec SEULEMENT les champs attendus :
  // un champ ajouté par un pirate (ex. "role": "admin") disparaît ici.
  requete.body = { nom: nom.trim(), email: normaliserEmail(email), motDePasse };
  suite();
}

// Connexion : email et mot de passe (au moins 1 caractère).
function validerConnexion(requete, reponse, suite) {
  if (!estObjetJson(requete.body)) {
    return reponse.status(400).json({ erreur: 'Corps de requête invalide' });
  }

  const { email, motDePasse } = requete.body;
  if (!emailValide(email) || !motDePasseValide(motDePasse, 1)) {
    return reponse.status(400).json({ erreur: 'Email ou format du mot de passe invalide' });
  }

  requete.body = { email: normaliserEmail(email), motDePasse };
  suite();
}

// Suppression du compte : le mot de passe est redemandé pour confirmer.
function validerSuppressionCompte(requete, reponse, suite) {
  const motDePasse = estObjetJson(requete.body) ? requete.body.motDePasse : undefined;
  if (!motDePasseValide(motDePasse, 1)) {
    return reponse.status(400).json({ erreur: 'Saisissez votre mot de passe pour confirmer la suppression' });
  }

  requete.body = { motDePasse };
  suite();
}

module.exports = { validerInscription, validerConnexion, validerSuppressionCompte };
