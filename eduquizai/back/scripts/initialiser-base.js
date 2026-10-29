const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');

// Rôle : préparer la base PostgreSQL (npm run db:init, ou service « db-init »
// de docker-compose) :
// 1. appliquer schema.sql (création idempotente et retrait sécurisé de
//    l'ancien nettoyage inter-bases, sans supprimer les données métier) ;
// 2. créer ou mettre à jour le compte de l'API, avec le minimum de droits.
//
// SÉCURITÉ — Moindre privilège : deux comptes PostgreSQL différents.
// - Compte PROPRIÉTAIRE (DATABASE_URL_ADMIN) : crée et modifie les tables.
//   Utilisé SEULEMENT par ce script, jamais par l'API.
// - Compte APPLICATIF (DATABASE_URL) : celui de l'API. Il peut seulement lire,
//   ajouter, modifier et supprimer des LIGNES. Il ne peut ni supprimer une
//   table, ni en créer, ni créer un utilisateur.
// Si un pirate trouvait une faille dans l'API, les dégâts resteraient limités.

// Nom de compte PostgreSQL : lettres minuscules, chiffres et « _ » (63 caractères max).
const REGEX_NOM_COMPTE = /^[a-z_][a-z0-9_]{0,62}$/;

// Lit le nom d'utilisateur et le mot de passe dans une URL de connexion.
function compteDepuisUrl(url) {
  const adresse = new URL(url);
  return {
    utilisateur: decodeURIComponent(adresse.username),
    motDePasse: decodeURIComponent(adresse.password),
  };
}

// Crée le compte de l'API s'il n'existe pas (sinon met à jour son mot de passe),
// puis lui donne exactement les droits nécessaires.
// SÉCURITÉ — Un nom de compte ou un mot de passe ne peut pas être un paramètre $1
// dans CREATE ROLE : on les protège donc avec escapeIdentifier / escapeLiteral
// de la bibliothèque pg (même effet : impossible d'injecter du SQL).
async function creerCompteApplicatif(client, { utilisateur, motDePasse }) {
  if (!REGEX_NOM_COMPTE.test(utilisateur)) {
    throw new Error('Nom du compte applicatif invalide (lettres minuscules, chiffres et _ uniquement).');
  }
  if (!motDePasse) {
    throw new Error('Le compte applicatif doit avoir un mot de passe dans DATABASE_URL.');
  }

  const compte = client.escapeIdentifier(utilisateur);
  const motDePasseSql = client.escapeLiteral(motDePasse);
  const existe = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [utilisateur]);
  const ordre = existe.rowCount > 0 ? 'ALTER' : 'CREATE';
  // Aucun pouvoir d'administration : ni superutilisateur, ni création de base ou de compte.
  await client.query(
    `${ordre} ROLE ${compte} WITH LOGIN PASSWORD ${motDePasseSql} NOSUPERUSER NOCREATEDB NOCREATEROLE`,
  );

  const resultat = await client.query('SELECT current_database() AS nom');
  const base = client.escapeIdentifier(resultat.rows[0].nom);
  await client.query(`GRANT CONNECT ON DATABASE ${base} TO ${compte}`);
  await client.query(`GRANT USAGE ON SCHEMA public TO ${compte}`);
  // Lire, ajouter, modifier, supprimer des lignes : rien d'autre.
  await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${compte}`);
  // Les numéros automatiques (SERIAL) des nouvelles lignes.
  await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${compte}`);
  // SÉCURITÉ — Le journal de sécurité ne peut pas être modifié après coup :
  // l'API peut y ajouter une trace, la lire ou la purger (RGPD), pas la falsifier.
  await client.query(`REVOKE UPDATE ON journal_securite FROM ${compte}`);
}

async function initialiser() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL est requise.');
  }
  // Sans DATABASE_URL_ADMIN (ancienne configuration), un seul compte sert à tout.
  const urlAdmin = process.env.DATABASE_URL_ADMIN || process.env.DATABASE_URL;
  const pool = new Pool({ connectionString: urlAdmin });
  const sql = await fs.readFile(path.join(__dirname, '../src/config/schema.sql'), 'utf8');
  const client = await pool.connect();

  // Transaction : soit tout est fait (tables + compte), soit rien.
  try {
    await client.query('BEGIN');
    // Empêche deux initialisations lancées en même temps de se gêner.
    await client.query('SELECT pg_advisory_xact_lock(728014)');
    await client.query(sql);

    if (process.env.DATABASE_URL_ADMIN) {
      const compteApi = compteDepuisUrl(process.env.DATABASE_URL);
      if (compteApi.utilisateur === compteDepuisUrl(urlAdmin).utilisateur) {
        throw new Error('DATABASE_URL doit utiliser un autre compte que DATABASE_URL_ADMIN (moindre privilège).');
      }
      await creerCompteApplicatif(client, compteApi);
      console.log(`Compte de l'API « ${compteApi.utilisateur} » : lecture et écriture des lignes uniquement.`);
    } else {
      console.warn('ATTENTION : DATABASE_URL_ADMIN absente, l\'API utilisera le compte propriétaire de la base.');
    }

    await client.query('COMMIT');
    console.log('Schéma SQL initialisé sans suppression des données existantes.');
  } catch (erreur) {
    await client.query('ROLLBACK');
    throw erreur;
  } finally {
    client.release();
    await pool.end();
  }
}

// Lancé directement (npm run db:init) : on initialise. Importé (tests) : on ne fait rien.
if (require.main === module) {
  initialiser().catch((erreur) => {
    console.error('Initialisation SQL impossible :', erreur.message);
    process.exitCode = 1;
  });
}

module.exports = { compteDepuisUrl, creerCompteApplicatif };
