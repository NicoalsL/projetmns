const creerLimiteur = require('./limitationAuth');

// Rôle : quotas sur les routes qui appellent l'IA.
// SÉCURITÉ — Chaque appel coûte (calcul, ou argent avec OpenAI) : sans quota,
// un seul compte pourrait faire exploser la facture.
// CHOIX — Compteur par enseignant (identifiant du jeton), pas par IP :
// c'est le compte qui consomme, quelle que soit sa connexion.
// Créés une seule fois et partagés : régénérer une question consomme le
// MÊME quota que générer un quiz.

const UNE_HEURE_MS = 60 * 60 * 1000;

function cleEnseignant(requete) {
  return 'utilisateur-' + requete.utilisateur.id_utilisateur;
}

// Générer un quiz ou régénérer une question : 10 par heure.
const limiteurGeneration = creerLimiteur({
  maximum: 10,
  fenetreMs: UNE_HEURE_MS,
  obtenirCle: cleEnseignant,
  message: 'Limite de générations atteinte (10 par heure). Réessayez plus tard.',
});

// Corriger une réponse rédigée (« Tester le quiz ») : 30 par heure.
// Appel plus court, donc quota plus large, pour tester un quiz entier.
const limiteurCorrection = creerLimiteur({
  maximum: 30,
  fenetreMs: UNE_HEURE_MS,
  obtenirCle: cleEnseignant,
  message: 'Limite de corrections atteinte (30 par heure). Réessayez plus tard.',
});

module.exports = { limiteurGeneration, limiteurCorrection };
