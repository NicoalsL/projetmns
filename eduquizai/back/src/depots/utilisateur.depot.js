const pool = require('../config/postgres');

// Seul fichier qui parle SQL pour la table utilisateur (PostgreSQL).

async function trouverParEmail(email) {
  const resultat = await pool.query(
    'SELECT id_utilisateur, nom, email, mot_de_passe_hache, role FROM utilisateur WHERE email = $1',
    [email],
  );
  return resultat.rows[0] || null;
}

async function creer({ nom, email, motDePasseHache }) {
  const resultat = await pool.query(
    `INSERT INTO utilisateur (nom, email, mot_de_passe_hache)
     VALUES ($1, $2, $3)
     RETURNING id_utilisateur, nom, email, role`,
    [nom, email, motDePasseHache],
  );
  return resultat.rows[0];
}

module.exports = { trouverParEmail, creer };
