const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LONGUEUR_MAX_NOM = 100; // = VARCHAR(100) dans schema.sql
const LONGUEUR_MAX_EMAIL = 255; // = VARCHAR(255) dans schema.sql
const OCTETS_MAX_MOT_DE_PASSE = 72; // limite de bcrypt
const LONGUEUR_MIN_MOT_DE_PASSE = 8;

const { estObjetJson } = require('../utilitaires/entrees');

// Valide systématiquement le corps des requêtes entrantes avant le contrôleur
// (aucune donnée non vérifiée n'atteint la couche métier).

// Le caractère nul (\0) est refusé par PostgreSQL dans un texte : sans ce
// contrôle, il provoquerait une erreur 500 au lieu d'un refus 400.
function sansCaractereNul(valeur) {
  return !valeur.includes('\0');
}

function emailValide(email) {
  return typeof email === 'string'
    && email.trim().length <= LONGUEUR_MAX_EMAIL
    && sansCaractereNul(email)
    && REGEX_EMAIL.test(email.trim());
}

// Une adresse email ne dépend pas de la casse en pratique : "Prof@x.fr" et
// "prof@x.fr" doivent désigner le même compte (pas de doublon, connexion
// possible quelle que soit la casse saisie).
function normaliserEmail(email) {
  return email.trim().toLowerCase();
}

// bcrypt ignore silencieusement tout ce qui dépasse 72 octets : deux mots de
// passe différents seulement après le 72e octet seraient considérés égaux.
// On compte en octets UTF-8 car "é" en occupe 2.
function motDePasseValide(motDePasse, longueurMinimum) {
  return typeof motDePasse === 'string'
    && motDePasse.length >= longueurMinimum
    && Buffer.byteLength(motDePasse, 'utf8') <= OCTETS_MAX_MOT_DE_PASSE;
}

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
      erreur: 'Le mot de passe doit contenir au moins 8 caractères et au plus 72 octets UTF-8',
    });
  }
  // RGPD : consentement explicite obligatoire. On exige le booléen true (et
  // non une valeur "vraie" comme "oui" ou 1) : la case doit avoir été cochée.
  if (requete.body.consentementRgpd !== true) {
    return reponse.status(400).json({
      erreur: 'Vous devez accepter la politique de confidentialité pour créer un compte',
    });
  }

  // On reconstruit le corps avec les seuls champs attendus : un champ ajouté
  // par le client (ex. "role": "admin") n'atteint jamais le service.
  requete.body = { nom: nom.trim(), email: normaliserEmail(email), motDePasse };
  suite();
}

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

// DELETE /api/compte — corps : { motDePasse } (confirmation de la suppression).
function validerSuppressionCompte(requete, reponse, suite) {
  const motDePasse = estObjetJson(requete.body) ? requete.body.motDePasse : undefined;
  if (!motDePasseValide(motDePasse, 1)) {
    return reponse.status(400).json({ erreur: 'Saisissez votre mot de passe pour confirmer la suppression' });
  }

  requete.body = { motDePasse };
  suite();
}

module.exports = { validerInscription, validerConnexion, validerSuppressionCompte };
