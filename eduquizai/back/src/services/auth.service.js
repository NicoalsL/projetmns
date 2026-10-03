const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const utilisateurDepot = require('../depots/utilisateur.depot');

const TOURS_HACHAGE = 10;
const DUREE_JETON = '2h';

function genererJeton(utilisateur) {
  return jwt.sign(
    { id_utilisateur: utilisateur.id_utilisateur, role: utilisateur.role },
    process.env.JWT_SECRET,
    { expiresIn: DUREE_JETON, algorithm: 'HS256' },
  );
}

async function inscrire({ nom, email, motDePasse }) {
  const existant = await utilisateurDepot.trouverParEmail(email);
  if (existant) {
    throw new Error('EMAIL_DEJA_UTILISE');
  }

  // Le mot de passe en clair ne doit jamais atteindre la base : on ne stocke
  // que son empreinte (hash), impossible à inverser.
  const motDePasseHache = await bcrypt.hash(motDePasse, TOURS_HACHAGE);
  let utilisateur;
  try {
    utilisateur = await utilisateurDepot.creer({ nom, email, motDePasseHache });
  } catch (erreur) {
    // Deux inscriptions simultanées peuvent passer toutes les deux la
    // vérification ci-dessus : c'est alors la contrainte UNIQUE de la base
    // qui tranche (code PostgreSQL 23505 = violation d'unicité).
    if (erreur.code === '23505' && erreur.constraint === 'utilisateur_email_key') {
      throw new Error('EMAIL_DEJA_UTILISE');
    }
    throw erreur;
  }

  return { utilisateur, jeton: genererJeton(utilisateur) };
}

async function connecter({ email, motDePasse }) {
  const utilisateur = await utilisateurDepot.trouverParEmail(email);

  // Message d'erreur volontairement identique dans les deux cas (email
  // inconnu ou mot de passe faux) pour ne pas révéler si un email existe.
  if (!utilisateur) {
    throw new Error('IDENTIFIANTS_INVALIDES');
  }
  const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.mot_de_passe_hache);
  if (!motDePasseValide) {
    throw new Error('IDENTIFIANTS_INVALIDES');
  }

  return { utilisateur, jeton: genererJeton(utilisateur) };
}

module.exports = { inscrire, connecter };
