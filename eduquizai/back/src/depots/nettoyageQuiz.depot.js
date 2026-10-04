const pool = require('../config/postgres');

// File durable alimentée dans la transaction SQL qui supprime le cours.
// Elle ne contient que les identifiants nécessaires à l'effacement MongoDB.
async function lister() {
  const resultat = await pool.query(
    `SELECT id_cours, id_utilisateur FROM nettoyage_quiz
     ORDER BY date_demande LIMIT 100`,
  );
  return resultat.rows;
}

async function terminer(idCours, idUtilisateur) {
  await pool.query(
    'DELETE FROM nettoyage_quiz WHERE id_cours = $1 AND id_utilisateur = $2',
    [idCours, idUtilisateur],
  );
}

module.exports = { lister, terminer };
