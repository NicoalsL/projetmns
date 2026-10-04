const creerLimiteur = require('./limitationAuth');

// Limiteurs des routes qui appellent l'IA (chaque appel peut être payant).
// Créés une seule fois et partagés : une régénération de question (route
// /api/quiz) consomme le MÊME quota que la génération d'un quiz (route
// /api/cours). Compteur par enseignant (identifiant du JWT), pas par adresse IP.

const UNE_HEURE_MS = 60 * 60 * 1000;

function cleEnseignant(requete) {
  return 'utilisateur-' + requete.utilisateur.id_utilisateur;
}

// Génération d'un quiz ou régénération d'une question.
const limiteurGeneration = creerLimiteur({
  maximum: 10,
  fenetreMs: UNE_HEURE_MS,
  obtenirCle: cleEnseignant,
  message: 'Limite de générations atteinte (10 par heure). Réessayez plus tard.',
});

// Correction d'une réponse ouverte (mode « Tester le quiz ») : appel plus
// court, quota plus large pour pouvoir tester un quiz entier.
const limiteurCorrection = creerLimiteur({
  maximum: 30,
  fenetreMs: UNE_HEURE_MS,
  obtenirCle: cleEnseignant,
  message: 'Limite de corrections atteinte (30 par heure). Réessayez plus tard.',
});

module.exports = { limiteurGeneration, limiteurCorrection };
