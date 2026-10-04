const LONGUEUR_MAX_TITRE = 200; // = VARCHAR(200) dans schema.sql
const LONGUEUR_MAX_CONTENU = 50000; // limite métier : un chapitre de cours
const { ID_SQL_MAX, estObjetJson } = require('../utilitaires/entrees');

// Valide le corps d'une création de cours avant le contrôleur.

// Le caractère nul (\0) est refusé par PostgreSQL dans un TEXT : on le rejette
// proprement en 400 plutôt que de provoquer une erreur 500 côté base.
function texteNonVide(valeur) {
  return typeof valeur === 'string'
    && valeur.trim().length > 0
    && !valeur.includes('\0');
}

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

  // On ne garde que les champs attendus : l'auteur du cours vient
  // exclusivement du JWT, jamais d'un champ "id_utilisateur" envoyé par le client.
  requete.body = { titre: titre.trim(), contenuTexte: contenuTexte.trim() };
  suite();
}

// Valide le paramètre :id de l'URL. La regex refuse "0", "-1", "1.2", "01",
// et toute tentative d'injection comme "1 OR 1=1", avant tout accès SQL.
function validerIdentifiantCours(requete, reponse, suite) {
  const valeur = requete.params.id;
  const estEntierPositif = /^[1-9][0-9]*$/.test(valeur);
  if (!estEntierPositif || Number(valeur) > ID_SQL_MAX) {
    return reponse.status(400).json({ erreur: 'Identifiant de cours invalide' });
  }

  requete.idCours = Number(valeur);
  suite();
}

module.exports = { validerCours, validerIdentifiantCours };
