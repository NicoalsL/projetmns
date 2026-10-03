const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LONGUEUR_MAX_NOM = 100; // = VARCHAR(100) dans schema.sql
const LONGUEUR_MAX_EMAIL = 255; // = VARCHAR(255) dans schema.sql
const OCTETS_MAX_MOT_DE_PASSE = 72; // limite de bcrypt
const LONGUEUR_MIN_MOT_DE_PASSE = 8;

// Valide systématiquement le corps des requêtes entrantes avant le contrôleur
// (aucune donnée non vérifiée n'atteint la couche métier).

// Le corps doit être un objet JSON : null, un tableau ou une chaîne seraient
// acceptés par express.json() mais feraient planter la déstructuration.
function corpsValide(corps) {
  return corps !== null && typeof corps === 'object' && !Array.isArray(corps);
}

function emailValide(email) {
  return typeof email === 'string'
    && email.trim().length <= LONGUEUR_MAX_EMAIL
    && REGEX_EMAIL.test(email.trim());
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
  if (!corpsValide(requete.body)) {
    return reponse.status(400).json({ erreur: 'Corps de requête invalide' });
  }

  const { nom, email, motDePasse } = requete.body;
  if (typeof nom !== 'string' || nom.trim().length === 0 || nom.trim().length > LONGUEUR_MAX_NOM) {
    return reponse.status(400).json({ erreur: 'Le nom doit contenir entre 1 et 100 caractères' });
  }
  if (!emailValide(email)) {
    return reponse.status(400).json({ erreur: 'Email invalide (255 caractères maximum)' });
  }
  if (!motDePasseValide(motDePasse, LONGUEUR_MIN_MOT_DE_PASSE)) {
    return reponse.status(400).json({ erreur: 'Le mot de passe doit contenir au moins 8 caractères et au plus 72 octets UTF-8' });
  }

  // On reconstruit le corps avec les seuls champs attendus : un champ ajouté
  // par le client (ex. "role": "admin") n'atteint jamais le service.
  requete.body = { nom: nom.trim(), email: email.trim(), motDePasse };
  suite();
}

function validerConnexion(requete, reponse, suite) {
  if (!corpsValide(requete.body)) {
    return reponse.status(400).json({ erreur: 'Corps de requête invalide' });
  }

  const { email, motDePasse } = requete.body;
  if (!emailValide(email) || !motDePasseValide(motDePasse, 1)) {
    return reponse.status(400).json({ erreur: 'Email ou format du mot de passe invalide' });
  }

  requete.body = { email: email.trim(), motDePasse };
  suite();
}

module.exports = { validerInscription, validerConnexion };
