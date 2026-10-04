// Tests SQL/Mongo réels dans des bases dédiées dont le nom commence par verification_.
// L'IA reste simulée, même si l'environnement principal utilise OpenAI/Ollama.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const nomSql = new URL(process.env.DATABASE_URL).pathname.slice(1);
const nomMongo = new URL(process.env.MONGO_URL).pathname.slice(1);
if (!/^verification_[a-z0-9_]+$/.test(nomSql) || nomSql !== nomMongo) {
  throw new Error('Deux bases dédiées verification_* de même nom sont requises.');
}
process.env.IA_FOURNISSEUR = 'simulation';

const pool = require('../src/config/postgres');
const { collectionQuiz, fermerMongo } = require('../src/config/mongo');
const coursDepot = require('../src/depots/cours.depot');
const quizDepot = require('../src/depots/quiz.depot');
const { reprendreNettoyage } = require('../src/services/nettoyageQuiz.service');
const app = require('../src/app');

let serveur;
let urlBase;
let nombreVerifications = 0;
const motDePasse = 'Verification-locale-uniquement-123';

function verifier(obtenu, attendu, description) {
  assert.deepEqual(obtenu, attendu, description);
  nombreVerifications += 1;
}

async function appeler(chemin, jeton, method = 'GET', corps) {
  const reponse = await fetch(urlBase + chemin, {
    method,
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}) },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const texte = await reponse.text();
  return { statut: reponse.status, donnees: texte ? JSON.parse(texte) : null };
}

async function creerCompte(suffixe) {
  const reponse = await appeler('/api/auth/inscription', null, 'POST', {
    nom: 'Vérification ' + suffixe,
    email: suffixe + '@example.test',
    motDePasse,
    consentementRgpd: true,
  });
  verifier(reponse.statut, 201, 'inscription');
  return reponse.donnees;
}

async function creerCours(jeton) {
  const reponse = await appeler('/api/cours', jeton, 'POST', {
    titre: 'Cours de vérification',
    contenuTexte: 'La cellule est une unité du vivant. Le noyau contient le matériel génétique. '.repeat(8),
  });
  verifier(reponse.statut, 201, 'création cours');
  return reponse.donnees.id_cours;
}

async function verifierRevisions(compte, autreCompte, idCours) {
  const creation = await appeler('/api/cours/' + idCours + '/quiz', compte.jeton, 'POST', { nombreQuestions: 3 });
  verifier(creation.statut, 201, 'génération simulée persistée');
  const quiz = creation.donnees;
  const urlQuiz = '/api/quiz/' + quiz.id_quiz;
  verifier(quiz.revision, 1, 'révision initiale');
  verifier((await appeler(urlQuiz, autreCompte.jeton)).statut, 404, 'lecture étrangère');

  const edition = await appeler(urlQuiz, compte.jeton, 'PUT', {
    titre: 'Version suivante', questions: quiz.questions, revision: 1,
  });
  verifier(edition.donnees.revision, 2, 'révision incrémentée');
  const perimee = await appeler(urlQuiz + '/validation', compte.jeton, 'POST', { revision: 1 });
  verifier(perimee.statut, 409, 'validation périmée refusée');
  verifier((await appeler(urlQuiz + '/export', compte.jeton)).statut, 409, 'export reste interdit');

  const validee = await appeler(urlQuiz + '/validation', compte.jeton, 'POST', { revision: 2 });
  verifier(validee.donnees.revision, 3, 'validation de la version relue');
  verifier((await appeler(urlQuiz + '/export', compte.jeton)).statut, 200, 'export autorisé après relecture');
  const ancienneEdition = await appeler(urlQuiz, compte.jeton, 'PUT', {
    titre: 'Écrasement interdit', questions: quiz.questions, revision: 2,
  });
  verifier(ancienneEdition.statut, 409, 'édition concurrente refusée');

  // Les documents déjà en base avant migration doivent rester modifiables.
  const collection = await collectionQuiz();
  await collection.updateOne({ id_cours: idCours }, { $unset: { revision: '' } });
  verifier((await appeler(urlQuiz, compte.jeton)).donnees.revision, 0, 'ancienne version compatible');
  const migration = await appeler(urlQuiz + '/validation', compte.jeton, 'POST', { revision: 0 });
  verifier(migration.donnees.revision, 1, 'migration atomique du document ancien');
  return urlQuiz;
}

async function verifierPanne(compte, idCours, urlQuiz) {
  // Panne injectée uniquement dans ce processus de test ; Mongo reste disponible.
  const supprimerOriginal = quizDepot.supprimerParCours;
  quizDepot.supprimerParCours = async () => {
    throw Object.assign(new Error('Panne simulée'), { code: 'TEST_PANNE' });
  };
  try {
    verifier((await appeler('/api/cours/' + idCours, compte.jeton, 'DELETE')).statut, 204, 'suppression logique');
    verifier((await appeler(urlQuiz, compte.jeton)).statut, 404, 'orphelin inaccessible');
    const demandes = await pool.query('SELECT id_cours FROM nettoyage_quiz WHERE id_cours = $1', [idCours]);
    verifier(demandes.rowCount, 1, 'demande durable conservée');
  } finally {
    quizDepot.supprimerParCours = supprimerOriginal;
  }

  await reprendreNettoyage();

  const collection = await collectionQuiz();
  verifier(await collection.countDocuments({ id_cours: idCours }), 0, 'reprise efface Mongo');
  const demandes = await pool.query('SELECT id_cours FROM nettoyage_quiz WHERE id_cours = $1', [idCours]);
  verifier(demandes.rowCount, 0, 'demande terminée après effacement');
}

async function verifierConcurrence(compte) {
  const idCours = await creerCours(compte.jeton);
  const idUtilisateur = compte.utilisateur.id_utilisateur;
  let signalerVerrou;
  const verrouAcquis = new Promise((resolve) => { signalerVerrou = resolve; });
  let libererEcriture;
  const autorisationEcriture = new Promise((resolve) => { libererEcriture = resolve; });

  // Point d'attente déterministe entre verrou SQL et insertion Mongo.
  const ecriture = coursDepot.avecCoursVerrouille(idCours, idUtilisateur, async () => {
    signalerVerrou();
    await autorisationEcriture;
    return quizDepot.creer({ id_cours: idCours, id_utilisateur: idUtilisateur, questions: [] });
  });
  await verrouAcquis;
  const suppression = appeler('/api/cours/' + idCours, compte.jeton, 'DELETE');
  libererEcriture();
  await ecriture;
  verifier((await suppression).statut, 204, 'suppression concurrente attend la persistance');

  const collection = await collectionQuiz();
  verifier(await collection.countDocuments({ id_cours: idCours }), 0, 'aucun quiz après suppression concurrente');
  let actionExecutee = false;
  const tardive = await coursDepot.avecCoursVerrouille(idCours, idUtilisateur, async () => {
    actionExecutee = true;
  });
  verifier(tardive, null, 'verrou absent après suppression');
  verifier(actionExecutee, false, 'écriture tardive interdite');
}

async function principal() {
  await pool.query(await fs.readFile(path.join(__dirname, '../src/config/schema.sql'), 'utf8'));
  await new Promise((resolve) => {
    serveur = app.listen(0, '127.0.0.1', resolve);
  });
  urlBase = 'http://127.0.0.1:' + serveur.address().port;
  const compte = await creerCompte('proprietaire');
  const autreCompte = await creerCompte('autre');
  const idCours = await creerCours(compte.jeton);
  const urlQuiz = await verifierRevisions(compte, autreCompte, idCours);
  await verifierPanne(compte, idCours, urlQuiz);
  await verifierConcurrence(compte);
  const idCoursCompte = await creerCours(compte.jeton);
  await quizDepot.creer({ id_cours: idCoursCompte, id_utilisateur: compte.utilisateur.id_utilisateur, questions: [] });
  verifier((await appeler('/api/compte', compte.jeton, 'DELETE', { motDePasse })).statut, 204, 'compte supprimé');
  const collection = await collectionQuiz();
  verifier(await collection.countDocuments({ id_utilisateur: compte.utilisateur.id_utilisateur }), 0, 'cascade compte');
  console.log(nombreVerifications + ' vérifications de cohérence réussies sur PostgreSQL et MongoDB réels.');
}

principal().catch((erreur) => {
  console.error(erreur.message);
  process.exitCode = 1;
}).finally(async () => {
  if (serveur) {
    await new Promise((resolve) => {
      serveur.close(resolve);
      serveur.closeAllConnections();
    });
  }
  await pool.end();
  await fermerMongo();
});
