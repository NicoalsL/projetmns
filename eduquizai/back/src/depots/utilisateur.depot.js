const pool = require('../config/postgres');

// Seul fichier qui parle SQL pour la table utilisateur (PostgreSQL).

// Comparaison insensible à la casse : les emails sont enregistrés en minuscules
// depuis la validation, et lower() retrouve aussi les comptes créés avant.
async function trouverParEmail(email) {
  const resultat = await pool.query(
    `SELECT id_utilisateur, nom, email, mot_de_passe_hache, role, version_jeton
     FROM utilisateur
     WHERE lower(email) = lower($1)`,
    [email],
  );
  return resultat.rows[0] || null;
}

async function trouverParId(idUtilisateur) {
  const resultat = await pool.query(
    'SELECT id_utilisateur, mot_de_passe_hache FROM utilisateur WHERE id_utilisateur = $1',
    [idUtilisateur],
  );
  return resultat.rows[0] || null;
}

// Le consentement RGPD est enregistré avec sa date : le middleware de
// validation refuse toute inscription sans case cochée, donc un compte créé
// a toujours consenti. La date sert de preuve (article 7 du RGPD).
async function creer({ nom, email, motDePasseHache }) {
  const resultat = await pool.query(
    `INSERT INTO utilisateur (nom, email, mot_de_passe_hache, consentement_rgpd, date_consentement)
     VALUES ($1, $2, $3, true, now())
     RETURNING id_utilisateur, nom, email, role, version_jeton`,
    [nom, email, motDePasseHache],
  );
  return resultat.rows[0];
}

// Version des jetons du compte (voir session.service.js), ou null si le
// compte n'existe plus : ses jetons sont alors refusés.
async function trouverVersionJeton(idUtilisateur) {
  const resultat = await pool.query(
    'SELECT version_jeton FROM utilisateur WHERE id_utilisateur = $1',
    [idUtilisateur],
  );
  return resultat.rows[0] ? resultat.rows[0].version_jeton : null;
}

// Incrément atomique (pas de lecture puis écriture) : invalide tous les
// jetons émis jusque-là pour ce compte.
async function incrementerVersionJeton(idUtilisateur) {
  await pool.query(
    'UPDATE utilisateur SET version_jeton = version_jeton + 1 WHERE id_utilisateur = $1',
    [idUtilisateur],
  );
}

// Droit à l'effacement : ON DELETE CASCADE (schema.sql) supprime aussi les
// cours et le journal generation_ia de l'utilisateur dans la même opération.
async function supprimer(idUtilisateur) {
  const resultat = await pool.query(
    'DELETE FROM utilisateur WHERE id_utilisateur = $1 RETURNING id_utilisateur',
    [idUtilisateur],
  );
  return resultat.rowCount === 1;
}

module.exports = {
  trouverParEmail,
  trouverParId,
  creer,
  supprimer,
  trouverVersionJeton,
  incrementerVersionJeton,
};
