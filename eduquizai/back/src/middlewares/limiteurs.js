const creerLimiteur = require('./limiteurRequetes');

// Rôle : TOUS les quotas de l'API, réunis ici pour les voir et les régler d'un
// coup d'œil. Le mécanisme (compteurs, réponse 429) est dans limiteurRequetes.js ;
// la limite des échecs de connexion par compte est dans limitationCompteConnexion.js.
// Chaque limiteur est créé une seule fois et partagé par les routes qui l'utilisent.

const QUINZE_MINUTES_MS = 15 * 60 * 1000;
const UNE_HEURE_MS = 60 * 60 * 1000;

// SÉCURITÉ — Anti force brute : 20 essais par 15 minutes et par adresse IP
// sur /api/auth (inscription et connexion).
const limiteurAuthentification = creerLimiteur({
  maximum: 20,
  fenetreMs: QUINZE_MINUTES_MS,
});

// SÉCURITÉ — Supprimer son compte redemande le mot de passe. On limite les essais
// (5 par quart d'heure et par compte) : un voleur de jeton ne peut pas deviner
// le mot de passe en essayant des milliers de combinaisons.
const limiteurConfirmationCompte = creerLimiteur({
  maximum: 5,
  fenetreMs: QUINZE_MINUTES_MS,
  obtenirCle: (requete) => 'compte-' + requete.utilisateur.id_utilisateur,
});

// Quotas sur les routes qui appellent l'IA.
// SÉCURITÉ — Chaque appel coûte (calcul, ou argent avec OpenAI) : sans quota,
// un seul compte pourrait faire exploser la facture.
// CHOIX — Compteur par enseignant (identifiant du jeton), pas par IP :
// c'est le compte qui consomme, quelle que soit sa connexion.
// Créés une seule fois et partagés : régénérer une question consomme le
// MÊME quota que générer un quiz.
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

module.exports = {
  limiteurAuthentification,
  limiteurConfirmationCompte,
  limiteurGeneration,
  limiteurCorrection,
};
