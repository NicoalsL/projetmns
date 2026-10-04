const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const utilisateurDepot = require('../depots/utilisateur.depot');
const { tracer, EVENEMENTS } = require('./journalSecurite.service');

const TOURS_HACHAGE = 10;
const DUREE_JETON = '2h';

// Empreinte d'un mot de passe aléatoire, calculée une fois au chargement.
// Sert à faire un vrai calcul bcrypt même quand l'email est inconnu : sinon la
// réponse serait plus rapide (~100 ms) et révélerait quels emails ont un compte.
const EMPREINTE_FACTICE = bcrypt.hashSync(randomBytes(16).toString('hex'), TOURS_HACHAGE);

function genererJeton(utilisateur) {
  return jwt.sign(
    {
      id_utilisateur: utilisateur.id_utilisateur,
      role: utilisateur.role,
      // Version de session du compte : une déconnexion l'incrémente et
      // invalide ce jeton (voir session.service.js).
      version: utilisateur.version_jeton ?? 0,
    },
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
  // Le calcul bcrypt a lieu dans les deux cas : même temps de réponse.
  const empreinte = utilisateur ? utilisateur.mot_de_passe_hache : EMPREINTE_FACTICE;
  const motDePasseValide = await bcrypt.compare(motDePasse, empreinte);
  if (!utilisateur || !motDePasseValide) {
    // Identifiant du compte visé s'il existe (null sinon) : une série d'échecs
    // sur un même compte signale une tentative de force brute.
    await tracer(EVENEMENTS.CONNEXION_ECHOUEE, utilisateur ? utilisateur.id_utilisateur : null);
    throw new Error('IDENTIFIANTS_INVALIDES');
  }

  await tracer(EVENEMENTS.CONNEXION_REUSSIE, utilisateur.id_utilisateur);
  return { utilisateur, jeton: genererJeton(utilisateur) };
}

module.exports = { inscrire, connecter };
