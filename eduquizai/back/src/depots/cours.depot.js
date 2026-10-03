const pool = require('../config/postgres');

async function creer({ titre, contenuTexte, idUtilisateur }) {
  const { rows } = await pool.query(
    'INSERT INTO cours (titre, contenu_texte, id_utilisateur) VALUES ($1, $2, $3) RETURNING id_cours, titre, contenu_texte, date_creation',
    [titre, contenuTexte, idUtilisateur],
  );
  return rows[0];
}

async function lister(idUtilisateur) {
  // La liste ne charge pas tous les textes des cours ; ceux-ci sont lus au détail.
  const { rows } = await pool.query(
    'SELECT id_cours, titre, date_creation FROM cours WHERE id_utilisateur = $1 ORDER BY date_creation DESC, id_cours DESC',
    [idUtilisateur],
  );
  return rows;
}

async function trouverParId(idCours, idUtilisateur) {
  const { rows } = await pool.query(
    'SELECT id_cours, titre, contenu_texte, date_creation FROM cours WHERE id_cours = $1 AND id_utilisateur = $2',
    [idCours, idUtilisateur],
  );
  return rows[0] || null;
}

async function supprimer(idCours, idUtilisateur) {
  // Vérification du propriétaire et suppression dans la même requête SQL.
  const resultat = await pool.query(
    'DELETE FROM cours WHERE id_cours = $1 AND id_utilisateur = $2 RETURNING id_cours',
    [idCours, idUtilisateur],
  );
  return resultat.rowCount === 1;
}
module.exports = { creer, lister, trouverParId, supprimer };
