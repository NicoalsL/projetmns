const authService = require('../services/auth.service');

function formaterUtilisateur(utilisateur) {
  return { id_utilisateur: utilisateur.id_utilisateur, nom: utilisateur.nom, email: utilisateur.email };
}

async function inscription(requete, reponse, suite) {
  try {
    const { utilisateur, jeton } = await authService.inscrire(requete.body);
    reponse.status(201).json({ utilisateur: formaterUtilisateur(utilisateur), jeton });
  } catch (erreur) {
    if (erreur.message === 'EMAIL_DEJA_UTILISE') {
      return reponse.status(409).json({ erreur: 'Cet email est déjà utilisé' });
    }
    suite(erreur);
  }
}

async function connexion(requete, reponse, suite) {
  try {
    const { utilisateur, jeton } = await authService.connecter(requete.body);
    reponse.json({ utilisateur: formaterUtilisateur(utilisateur), jeton });
  } catch (erreur) {
    if (erreur.message === 'IDENTIFIANTS_INVALIDES') {
      return reponse.status(401).json({ erreur: 'Email ou mot de passe incorrect' });
    }
    suite(erreur);
  }
}

module.exports = { inscription, connexion };
