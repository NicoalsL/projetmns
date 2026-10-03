const { Pool } = require('pg');

// Pool de connexions PostgreSQL. La connexion réelle n'a lieu qu'à la première
// requête (comportement par défaut de "pg"), donc ce fichier ne plante jamais
// au démarrage même si la base n'est pas encore disponible.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
});

pool.on('error', () => console.error('Connexion PostgreSQL inactive interrompue'));

module.exports = pool;
