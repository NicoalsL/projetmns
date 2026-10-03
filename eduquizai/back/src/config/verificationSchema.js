const pool = require('./postgres');

// Tables indispensables au fonctionnement de l'API. Si l'une manque, le schéma
// SQL n'a pas été appliqué (voir npm run db:init).
const TABLES_REQUISES = ['utilisateur', 'cours', 'generation_ia'];

// Vérifie que toutes les tables existent. to_regclass renvoie NULL pour une
// table absente au lieu de lever une erreur, ce qui permet un simple booléen.
async function schemaEstPret() {
  const resultat = await pool.query(
    `SELECT bool_and(to_regclass('public.' || nom_table) IS NOT NULL) AS pret
     FROM unnest($1::text[]) AS nom_table`,
    [TABLES_REQUISES],
  );
  return resultat.rows[0].pret === true;
}

module.exports = { schemaEstPret };
