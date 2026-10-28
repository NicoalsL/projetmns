const coursDepot = require('../depots/cours.depot');
const { reprendreNettoyage } = require('./nettoyageQuiz.service');
const Cours = require('../modeles/cours.modele');
const { ErreurIntrouvable, ErreurNonAuthentifie } = require('../utilitaires/erreurs');

// Rôle : règles métier des cours. Un enseignant ne voit, ne modifie et ne
// supprime que SES cours (contrôle fait dans les requêtes SQL du dépôt).

// SÉCURITÉ — Même 404 pour un cours absent ET pour le cours d'un autre :
// impossible de deviner quels numéros de cours existent (OWASP A01).
// CHOIX — 404 plutôt que 403 : un 403 avouerait « ce cours existe, mais pas pour toi ».
function coursIntrouvable() {
  return new ErreurIntrouvable('Cours introuvable');
}

// L'auteur est l'enseignant du jeton, jamais une valeur envoyée par le navigateur.
async function creer(donnees, idUtilisateur) {
  try {
    return new Cours(await coursDepot.creer({ ...donnees, idUtilisateur }));
  } catch (erreur) {
    // 23503 = clé étrangère violée : le compte vient d'être supprimé mais le
    // jeton est encore là. On demande de se reconnecter plutôt qu'une erreur 500.
    if (erreur.code === '23503' && erreur.constraint === 'cours_id_utilisateur_fkey') {
      throw new ErreurNonAuthentifie('Votre compte n’est plus disponible. Reconnectez-vous.');
    }
    throw erreur;
  }
}

// Seulement les cours de cet enseignant (filtre dans la requête SQL).
// La liste ne contient pas le texte des cours (voir cours.depot.js).
async function lister(idUtilisateur) {
  const lignes = await coursDepot.lister(idUtilisateur);
  return lignes.map((ligne) => new Cours(ligne));
}

// Cherche le cours ET vérifie son propriétaire en une requête :
// rien trouvé = absent ou pas à lui -> 404.
async function consulter(idCours, idUtilisateur) {
  const ligne = await coursDepot.trouverParId(idCours, idUtilisateur);
  if (!ligne) {
    throw coursIntrouvable();
  }
  return new Cours(ligne);
}

// Modifier un cours ne touche pas aux quiz déjà générés : ils restent ceux
// que l'enseignant a relus sur l'ancien texte.
async function modifier(idCours, idUtilisateur, donnees) {
  const ligne = await coursDepot.mettreAJour(idCours, idUtilisateur, donnees);
  if (!ligne) {
    throw coursIntrouvable();
  }
  return new Cours(ligne);
}

// Supprime un cours, puis ses quiz rangés dans l'autre base (MongoDB).
async function supprimer(idCours, idUtilisateur) {
  // 1. PostgreSQL : vérifier le propriétaire et supprimer en UNE requête.
  //    Le journal generation_ia suit tout seul (ON DELETE CASCADE).
  const supprime = await coursDepot.supprimer(idCours, idUtilisateur);
  if (!supprime) {
    throw coursIntrouvable();
  }

  // 2. MongoDB : effacer les quiz. Le déclencheur SQL a noté la demande, donc
  //    rien n'est perdu même si MongoDB est en panne à cet instant.
  await reprendreNettoyage();
}

module.exports = { creer, lister, consulter, modifier, supprimer };
