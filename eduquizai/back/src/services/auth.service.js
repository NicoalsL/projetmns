const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const utilisateurDepot = require('../depots/utilisateur.depot');
const Utilisateur = require('../modeles/utilisateur.modele');
const { ErreurConflit, ErreurNonAuthentifie } = require('../utilitaires/erreurs');
const { tracer, EVENEMENTS } = require('./journalSecurite.service');

// Rôle : inscription et connexion. Stocke le mot de passe de façon sûre
// et fabrique le jeton (JWT) qui prouve qui est connecté.

// CHOIX — bcrypt plutôt que SHA-256 : SHA-256 est très rapide, donc un pirate
// peut tester des milliards de mots de passe par seconde. bcrypt est lent
// exprès et ajoute un « sel » (deux mots de passe identiques donnent deux
// empreintes différentes). Version bcryptjs : 100 % JavaScript, rien à compiler.
const TOURS_HACHAGE = 10; // 2^10 tours ≈ 100 ms par calcul : supportable pour un humain, lent pour un pirate

// CHOIX — 2 h : assez pour préparer un cours, assez court pour limiter un jeton volé.
// L'enseignant peut prolonger avant la fin (bouton « Rester connecté »).
const DUREE_JETON_SECONDES = 2 * 60 * 60;
const DUREE_MAX_SESSION_SECONDES = 12 * 60 * 60;

function expirationJetonMs(jeton) {
  return jwt.decode(jeton).exp * 1000;
}

// SÉCURITÉ — Empreinte d'un faux mot de passe, calculée une fois au démarrage.
// Si l'email est inconnu, on la compare quand même : la réponse prend le même
// temps (~100 ms), donc la durée ne trahit pas quels emails ont un compte.
const EMPREINTE_FACTICE = bcrypt.hashSync(randomBytes(16).toString('hex'), TOURS_HACHAGE);

// Fabrique le jeton remis au navigateur, signé avec le secret du serveur :
// le moindre changement le rend invalide.
// SÉCURITÉ — Ni mot de passe ni email dedans : un JWT est signé, pas chiffré,
// donc tout le monde peut lire son contenu.
function genererJeton(utilisateur, debutSession = Math.floor(Date.now() / 1000)) {
  const maintenant = Math.floor(Date.now() / 1000);
  const secondesRestantes = debutSession + DUREE_MAX_SESSION_SECONDES - maintenant;
  if (secondesRestantes <= 0) throw new ErreurNonAuthentifie('Durée maximale de session atteinte. Reconnectez-vous.');
  return jwt.sign(
    {
      id_utilisateur: utilisateur.id_utilisateur,
      role: utilisateur.role,
      version: utilisateur.version_jeton ?? 0,
      debut_session: debutSession, // une déconnexion l'augmente (voir session.service.js)
    },
    process.env.JWT_SECRET,
    { expiresIn: Math.min(DUREE_JETON_SECONDES, secondesRestantes), algorithm: 'HS256' },
  );
}

// Crée le compte et connecte directement l'enseignant.
// (Données déjà vérifiées par le middleware validation.js.)
async function inscrire({ nom, email, motDePasse }) {
  const existant = await utilisateurDepot.trouverParEmail(email);
  if (existant) {
    throw new ErreurConflit('Cet email est déjà utilisé');
  }

  // SÉCURITÉ — On ne stocke jamais le mot de passe, seulement son empreinte,
  // impossible à inverser.
  const motDePasseHache = await bcrypt.hash(motDePasse, TOURS_HACHAGE);
  let utilisateur;
  try {
    utilisateur = new Utilisateur(await utilisateurDepot.creer({ nom, email, motDePasseHache }));
  } catch (erreur) {
    // Deux inscriptions au même instant peuvent passer le test ci-dessus.
    // C'est alors la base qui tranche grâce à UNIQUE (code 23505 = doublon).
    if (erreur.code === '23505' && erreur.constraint === 'utilisateur_email_key') {
      throw new ErreurConflit('Cet email est déjà utilisé');
    }
    throw erreur;
  }

  return { utilisateur, jeton: genererJeton(utilisateur) };
}

// Vérifie l'email et le mot de passe, puis remet un jeton.
async function connecter({ email, motDePasse }) {
  const ligne = await utilisateurDepot.trouverParEmail(email);
  const utilisateur = ligne ? new Utilisateur(ligne) : null;

  // SÉCURITÉ — Même message et même durée, que l'email soit inconnu ou le
  // mot de passe faux : impossible de deviner qui a un compte.
  const motDePasseValide = utilisateur
    ? await utilisateur.motDePasseCorrespond(motDePasse)
    : await bcrypt.compare(motDePasse, EMPREINTE_FACTICE);
  if (!utilisateur || !motDePasseValide) {
    // Échec noté dans le journal de sécurité, avec le compte visé s'il existe :
    // beaucoup d'échecs sur un même compte = attaque par force brute.
    await tracer(EVENEMENTS.CONNEXION_ECHOUEE, utilisateur ? utilisateur.id_utilisateur : null);
    throw new ErreurNonAuthentifie('Email ou mot de passe incorrect');
  }

  await tracer(EVENEMENTS.CONNEXION_REUSSIE, utilisateur.id_utilisateur);
  return { utilisateur, jeton: genererJeton(utilisateur) };
}

module.exports = { inscrire, connecter, genererJeton, expirationJetonMs, DUREE_MAX_SESSION_SECONDES };
