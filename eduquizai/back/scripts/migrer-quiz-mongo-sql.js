// Migration historique des documents MongoDB vers la table PostgreSQL quiz.
// Entrée : export EJSON réalisé avec EJSON.stringify(collection.find().toArray()).
// Les fichiers de données restent hors de Git. La base MongoDB n'est pas requise.
// Une deuxième exécution ne duplique pas les quiz, et une erreur annule tout.
// Exemple : npm run db:migrer-quiz -- chemin/vers/quiz.ejson --appliquer

const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');

const REGEX_IDENTIFIANT = /^[a-f0-9]{24}$/;

function identifierDocument(document) {
  const identifiant = document._id?.$oid;

  if (typeof identifiant !== 'string' || !REGEX_IDENTIFIANT.test(identifiant)) {
    throw new Error('Identifiant MongoDB invalide dans le fichier EJSON.');
  }

  return identifiant;
}

function lireDate(valeur) {
  if (valeur === null || valeur === undefined) {
    return null;
  }

  // Extended JSON conserve les dates sous la forme {"$date": "..."}.
  const chaine = valeur.$date ?? valeur;
  const texte = typeof chaine === 'object' ? chaine.$numberLong : chaine;
  const date = new Date(texte);

  if (!Number.isFinite(date.getTime())) {
    throw new Error('Date invalide dans le fichier EJSON.');
  }

  return date;
}

async function verifierReferences(client, document, identifiant) {
  const cours = await client.query(
    'SELECT id_utilisateur FROM cours WHERE id_cours = $1',
    [document.id_cours],
  );

  if (!cours.rowCount || cours.rows[0].id_utilisateur !== document.id_utilisateur) {
    throw new Error('Cours absent ou propriétaire incorrect pour le quiz ' + identifiant);
  }

  if (document.id_generation === undefined || document.id_generation === null) {
    return null;
  }

  const generation = await client.query(
    'SELECT id_cours, id_utilisateur FROM generation_ia WHERE id_generation = $1',
    [document.id_generation],
  );

  // Des historiques ont pu être purgés après six mois : le quiz reste conservé.
  if (!generation.rowCount) {
    return null;
  }

  if (
    generation.rows[0].id_cours !== document.id_cours
    || generation.rows[0].id_utilisateur !== document.id_utilisateur
  ) {
    throw new Error('Génération associée au mauvais cours pour le quiz ' + identifiant);
  }

  return document.id_generation;
}

async function importerQuiz(client, document) {
  const identifiant = identifierDocument(document);
  const generation = await verifierReferences(client, document, identifiant);

  if (!Array.isArray(document.questions) || document.questions.length === 0) {
    throw new Error('Liste de questions manquante pour le quiz ' + identifiant);
  }

  const existant = await client.query(
    'SELECT id_cours, id_utilisateur FROM quiz WHERE id_quiz = $1',
    [identifiant],
  );

  if (existant.rowCount) {
    const memeCours = existant.rows[0].id_cours === document.id_cours;
    const memeProprietaire = existant.rows[0].id_utilisateur === document.id_utilisateur;

    if (!memeCours || !memeProprietaire) {
      throw new Error('Conflit avec un quiz SQL existant : ' + identifiant);
    }

    return false;
  }

  const parametres = document.parametres === undefined || document.parametres === null
    ? null
    : JSON.stringify(document.parametres);
  const dateCreation = lireDate(document.date_creation);
  const dateModification = lireDate(document.date_modification) ?? dateCreation;

  await client.query(
    `INSERT INTO quiz (
       id_quiz, id_generation, id_cours, id_utilisateur, titre, statut,
       fournisseur, modele, parametres, questions, date_creation,
       date_modification, date_validation, revision
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb,
       $10::jsonb, $11, $12, $13, $14
     )`,
    [
      identifiant,
      generation,
      document.id_cours,
      document.id_utilisateur,
      document.titre,
      document.statut,
      document.fournisseur ?? null,
      document.modele ?? null,
      parametres,
      JSON.stringify(document.questions),
      dateCreation,
      dateModification,
      lireDate(document.date_validation),
      document.revision ?? 0,
    ],
  );

  return true;
}

async function migrer() {
  const fichier = process.argv[2];
  const confirmation = process.argv[3];

  // L'option explicite empêche un import involontaire dans la base courante.
  if (!fichier || confirmation !== '--appliquer' || !process.env.DATABASE_URL) {
    throw new Error('Usage : npm run db:migrer-quiz -- quiz.ejson --appliquer (DATABASE_URL obligatoire)');
  }

  const contenu = await fs.readFile(path.resolve(fichier), 'utf8');
  const documents = JSON.parse(contenu);

  if (!Array.isArray(documents)) {
    throw new TypeError('Le fichier EJSON doit contenir une liste de quiz.');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    let importes = 0;

    for (const document of documents) {
      const ajoute = await importerQuiz(client, document);

      if (ajoute) {
        importes += 1;
      }
    }

    await client.query('COMMIT');
    console.log(
      `Migration terminée : ${importes} quiz importés, ${documents.length - importes} déjà présents.`,
    );
  } catch (erreur) {
    await client.query('ROLLBACK');
    throw erreur;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrer().catch((erreur) => {
    console.error('Migration SQL annulée :', erreur.message);
    process.exitCode = 1;
  });
}

module.exports = { identifierDocument, lireDate, importerQuiz };
