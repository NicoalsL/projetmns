const pool = require('./postgres');

// Rôle : vérifier, au démarrage, que PostgreSQL a bien toutes ses tables.
// Si l'une manque, c'est que le script de création n'a pas été lancé (npm run db:init).

const TABLES_REQUISES = ['utilisateur', 'cours', 'generation_ia', 'journal_securite', 'quiz'];

// Renvoie true si tout est en place. Une seule requête SQL :
// - to_regclass donne NULL pour une table absente (au lieu de planter), d'où un simple vrai / faux ;
// - la colonne version_jeton, ajoutée après coup, est vérifiée aussi : sans elle,
//   aucune requête d'un enseignant connecté ne fonctionnerait.
async function schemaEstPret() {
  const resultat = await pool.query(
    `SELECT bool_and(to_regclass('public.' || nom_table) IS NOT NULL)
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'utilisateur' AND column_name = 'version_jeton'
       ) AS pret
     FROM unnest($1::text[]) AS nom_table`,
    [TABLES_REQUISES],
  );
  return resultat.rows[0].pret === true;
}

// SÉCURITÉ — Moindre privilège : l'API doit utiliser le compte restreint créé
// par npm run db:init, pas un compte qui peut tout faire. Renvoie true si le
// compte connecté n'est ni superutilisateur, ni capable de créer des bases ou
// des comptes, ni propriétaire des tables (il ne peut donc pas les supprimer).
async function compteApiEstRestreint() {
  const resultat = await pool.query(
    `SELECT NOT (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb)
       AND NOT EXISTS (
         SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tableowner = current_user
       ) AS restreint
     FROM pg_roles AS r
     WHERE r.rolname = current_user`,
  );
  return resultat.rows[0]?.restreint === true;
}

module.exports = { schemaEstPret, compteApiEstRestreint };
