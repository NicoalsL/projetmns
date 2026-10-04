const pool = require('../config/postgres');

// Seul fichier qui parle SQL pour la table cours (PostgreSQL).
// Toutes les requêtes sont paramétrées ($1, $2…) : les valeurs ne sont jamais
// concaténées dans le SQL, ce qui empêche l'injection SQL.

async function creer({ titre, contenuTexte, idUtilisateur }) {
  const resultat = await pool.query(
    `INSERT INTO cours (titre, contenu_texte, id_utilisateur)
     VALUES ($1, $2, $3)
     RETURNING id_cours, titre, contenu_texte, date_creation`,
    [titre, contenuTexte, idUtilisateur],
  );
  return resultat.rows[0];
}

// La liste ne charge pas contenu_texte (jusqu'à 50 000 caractères par cours) :
// le texte complet n'est lu que sur la page de détail (éco-conception).
async function lister(idUtilisateur) {
  const resultat = await pool.query(
    `SELECT id_cours, titre, date_creation
     FROM cours
     WHERE id_utilisateur = $1
     ORDER BY date_creation DESC, id_cours DESC`,
    [idUtilisateur],
  );
  return resultat.rows;
}

// Le filtre sur id_utilisateur fait partie de la requête : impossible de lire
// le cours d'un autre enseignant, même en devinant son identifiant.
async function trouverParId(idCours, idUtilisateur) {
  const resultat = await pool.query(
    `SELECT id_cours, titre, contenu_texte, date_creation
     FROM cours
     WHERE id_cours = $1 AND id_utilisateur = $2`,
    [idCours, idUtilisateur],
  );
  return resultat.rows[0] || null;
}

// Modification : le filtre sur le propriétaire est dans la requête UPDATE
// elle-même. Renvoie le cours modifié, ou null s'il n'existe pas pour cet
// enseignant (aucune ligne touchée).
async function mettreAJour(idCours, idUtilisateur, { titre, contenuTexte }) {
  const resultat = await pool.query(
    `UPDATE cours
     SET titre = $1, contenu_texte = $2
     WHERE id_cours = $3 AND id_utilisateur = $4
     RETURNING id_cours, titre, contenu_texte, date_creation`,
    [titre, contenuTexte, idCours, idUtilisateur],
  );
  return resultat.rows[0] || null;
}

// Vérification du propriétaire et suppression dans une seule requête
// atomique : aucun intervalle entre "vérifier" et "supprimer".
async function supprimer(idCours, idUtilisateur) {
  const resultat = await pool.query(
    `DELETE FROM cours
     WHERE id_cours = $1 AND id_utilisateur = $2
     RETURNING id_cours`,
    [idCours, idUtilisateur],
  );
  return resultat.rowCount === 1;
}

// Une écriture Mongo commence seulement si le cours est encore présent.
// DELETE (y compris la cascade du compte) attend la fin de cette transaction.
// L'appel IA reste hors verrou : on ne bloque pas le cours pendant sa génération.
async function avecCoursVerrouille(idCours, idUtilisateur, action) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultat = await client.query(
      `SELECT id_cours FROM cours
       WHERE id_cours = $1 AND id_utilisateur = $2 FOR UPDATE`,
      [idCours, idUtilisateur],
    );
    if (resultat.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const valeur = await action(client);
    await client.query('COMMIT');
    return valeur;
  } catch (erreur) {
    await client.query('ROLLBACK');
    throw erreur;
  } finally {
    client.release();
  }
}

module.exports = { creer, lister, trouverParId, mettreAJour, supprimer, avecCoursVerrouille };
