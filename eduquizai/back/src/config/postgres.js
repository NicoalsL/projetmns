const { Pool } = require('pg');

// Rôle : connexion à PostgreSQL (comptes, cours, journaux), partagée par tous les dépôts.
// CHOIX — PostgreSQL pour les données liées entre elles : clés étrangères,
// transactions, cascades et contraintes (UNIQUE, CHECK) garanties par la base.
// Un « pool » garde quelques connexions ouvertes et les réutilise : plus rapide
// que d'en ouvrir une nouvelle à chaque requête.
// La première vraie connexion n'a lieu qu'à la première requête : ce fichier ne
// plante donc pas au démarrage si la base n'est pas encore prête.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // abandonne si la base ne répond pas en 5 s
  query_timeout: 10000, // une requête bloquée plus de 10 s est interrompue
});

pool.on('error', () => console.error('Connexion PostgreSQL inactive interrompue'));

module.exports = pool;
