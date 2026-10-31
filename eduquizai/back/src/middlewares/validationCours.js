const LONGUEUR_MAX_TITRE = 200; // = VARCHAR(200) dans schema.sql
const LONGUEUR_MAX_CONTENU = 50000; // limite métier : un chapitre de cours
const { ID_SQL_MAX, estObjetJson } = require('../utils/entrees');

// Rôle : vérifier un cours (titre, texte) et son numéro dans l'adresse,
// AVANT le contrôleur. Donnée invalide : réponse 400.

// Texte non vide et sans caractère nul (\0, refusé par PostgreSQL).
function texteNonVide(valeur) {
  return typeof valeur === 'string'
    && valeur.trim().length > 0
    && !valeur.includes('\0');
}

// Création ou modification : titre (1 à 200 caractères), texte (1 à 50 000).
function validerCours(requete, reponse, suite) {
  const corps = requete.body;
  if (!estObjetJson(corps)) {
    return reponse.status(400).json({ erreur: 'Un titre et un contenu de cours sont requis' });
  }

  const { titre, contenuTexte } = corps;
  if (!texteNonVide(titre) || titre.trim().length > LONGUEUR_MAX_TITRE) {
    return reponse.status(400).json({
      erreur: 'Le titre doit contenir entre 1 et 200 caractères, sans caractère nul',
    });
  }
  if (!texteNonVide(contenuTexte) || contenuTexte.length > LONGUEUR_MAX_CONTENU) {
    return reponse.status(400).json({
      erreur: 'Le contenu doit contenir entre 1 et 50 000 caractères, sans caractère nul',
    });
  }

  // SÉCURITÉ — On garde seulement le titre et le texte. L'auteur vient du
  // jeton : un « id_utilisateur » envoyé par le navigateur est ignoré.
  requete.body = { titre: titre.trim(), contenuTexte: contenuTexte.trim() };
  suite();
}

// SÉCURITÉ — Le numéro dans l'adresse (/api/cours/42) doit être un entier
// positif. Refuse « 0 », « -1 », « 1.2 », « 01 » et les tentatives
// d'injection comme « 1 OR 1=1 », avant même d'interroger la base.
function validerIdentifiantCours(requete, reponse, suite) {
  const valeur = requete.params.id;
  // Style défensif : on vérifie d'abord que c'est bien du texte (trouvé par le fuzzing).
  const estEntierPositif = typeof valeur === 'string' && /^[1-9][0-9]*$/.test(valeur);
  if (!estEntierPositif || Number(valeur) > ID_SQL_MAX) {
    return reponse.status(400).json({ erreur: 'Identifiant de cours invalide' });
  }

  requete.idCours = Number(valeur); // rangé en nombre pour le contrôleur
  suite();
}

module.exports = { validerCours, validerIdentifiantCours };
