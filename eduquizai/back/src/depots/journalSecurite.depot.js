const pool = require('../config/postgres');

// Seul fichier qui parle SQL pour la table journal_securite (PostgreSQL).

// Même durée de conservation que le journal des générations, annoncée dans
// la politique de confidentialité. Constante SQL, jamais issue d'une saisie.
const DUREE_CONSERVATION = '6 months';

async function enregistrer(typeEvenement, idUtilisateur) {
  await pool.query(
    'INSERT INTO journal_securite (type_evenement, id_utilisateur) VALUES ($1, $2)',
    [typeEvenement, idUtilisateur],
  );
}

// Supprime les traces plus anciennes que la durée de conservation (RGPD).
async function purgerAnciens() {
  const resultat = await pool.query(
    'DELETE FROM journal_securite WHERE date_evenement < now() - $1::interval',
    [DUREE_CONSERVATION],
  );
  return resultat.rowCount;
}

module.exports = { enregistrer, purgerAnciens };
