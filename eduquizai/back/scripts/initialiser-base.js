const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('../src/config/postgres');

// Applique schema.sql sur la base (npm run db:init, ou service "db-init" de
// docker-compose). Le script ne fait que des CREATE ... IF NOT EXISTS : le
// relancer ne supprime aucune donnée existante.
async function initialiser() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL est requise.');
  }

  const sql = await fs.readFile(path.join(__dirname, '../src/config/schema.sql'), 'utf8');
  const client = await pool.connect();

  // Transaction : soit toutes les tables sont créées, soit aucune (pas de
  // schéma à moitié créé en cas d'erreur).
  try {
    await client.query('BEGIN');
    // Sérialise l’initialisation si deux commandes sont lancées simultanément.
    await client.query('SELECT pg_advisory_xact_lock(728014)');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Schéma SQL initialisé sans suppression des données existantes.');
  } catch (erreur) {
    await client.query('ROLLBACK');
    throw erreur;
  } finally {
    client.release();
  }
}

initialiser()
  .catch((erreur) => {
    console.error('Initialisation SQL impossible :', erreur.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
