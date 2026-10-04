// Vérification de bout en bout des quiz sur la VRAIE API, PostgreSQL et MongoDB
// (complément des tests Jest, qui simulent les bases et l'IA).
//
// À lancer avec la stack démarrée :
//   docker compose exec -T back node scripts/verifier-quiz-reel.js
//
// Utilise le fournisseur configuré (IA_FOURNISSEUR ; "simulation" par défaut,
// donc aucun coût). Crée deux comptes de test au nom unique et les supprime à
// la fin, avec leurs cours, générations (cascade SQL) et quiz (MongoDB).

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const pool = require('../src/config/postgres');
const { collectionQuiz, fermerMongo } = require('../src/config/mongo');

const URL_API = process.env.API_URL || 'http://127.0.0.1:3000';
const prefixe = 'verification-quiz-' + randomUUID();
const emailsDeTest = [prefixe + '-a@example.test', prefixe + '-b@example.test'];
const motDePasse = 'Test-local-' + randomUUID();
const idsDeTest = [];
let nombreVerifications = 0;

const TEXTE_COURS = [
  'La photosynthèse permet aux plantes de produire leur propre matière organique.',
  'Elle se déroule principalement dans les chloroplastes des cellules des feuilles.',
  'La chlorophylle capte l\'énergie lumineuse nécessaire à la réaction.',
  'La plante absorbe du dioxyde de carbone et rejette du dioxygène.',
  'Le glucose produit sert de source d\'énergie et de matériau de construction.',
].join(' ');

async function appelerApi(chemin, { method = 'GET', corps, jeton } = {}) {
  const enTetes = { 'Content-Type': 'application/json' };
  if (jeton) {
    enTetes.Authorization = 'Bearer ' + jeton;
  }
  const reponse = await fetch(URL_API + chemin, {
    method,
    headers: enTetes,
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const texte = await reponse.text();
  return { statut: reponse.status, donnees: texte ? JSON.parse(texte) : null, enTetes: reponse.headers };
}

function verifier(obtenu, attendu, description) {
  assert.deepEqual(obtenu, attendu, description);
  nombreVerifications += 1;
}

async function inscrire(email, nom) {
  const inscription = await appelerApi('/api/auth/inscription', {
    method: 'POST',
    corps: { nom, email, motDePasse, consentementRgpd: true },
  });
  verifier(inscription.statut, 201, 'inscription ' + nom);
  idsDeTest.push(inscription.donnees.utilisateur.id_utilisateur);
  return inscription.donnees.jeton;
}

async function executer() {
  const jetonA = await inscrire(emailsDeTest[0], 'Compte de test A');
  const jetonB = await inscrire(emailsDeTest[1], 'Compte de test B');

  const cours = await appelerApi('/api/cours', {
    method: 'POST',
    jeton: jetonA,
    corps: { titre: 'La photosynthèse', contenuTexte: TEXTE_COURS },
  });
  verifier(cours.statut, 201, 'création du cours');
  const idCours = cours.donnees.id_cours;

  // --- Génération ---
  const generation = await appelerApi('/api/cours/' + idCours + '/quiz', {
    method: 'POST',
    jeton: jetonA,
    corps: { nombreQuestions: 6 },
  });
  verifier(generation.statut, 201, 'génération du quiz');
  const quiz = generation.donnees;
  verifier(quiz.statut, 'brouillon', 'quiz créé en brouillon');
  verifier(quiz.questions.length, 6, 'nombre de questions demandé respecté');
  verifier(
    new Set(quiz.questions.map((question) => question.type)),
    new Set(['qcm', 'vrai_faux', 'ouverte']),
    'les trois types de questions sont présents',
  );
  console.log(`Génération (${quiz.fournisseur}) : ${quiz.duree_ms} ms`);

  // Journal SQL : la génération est tracée avec son statut et sa durée.
  const journal = await pool.query(
    'SELECT statut, duree_ms, nombre_questions_demandees FROM generation_ia WHERE id_cours = $1',
    [idCours],
  );
  verifier(journal.rows.length, 1, 'une ligne dans generation_ia');
  verifier(journal.rows[0].statut, 'succes', 'génération tracée en succès');
  verifier(journal.rows[0].nombre_questions_demandees, 6, 'nombre de questions tracé');

  // Document MongoDB : rattaché à l'enseignant A et à la génération tracée.
  const collection = await collectionQuiz();
  const documents = await collection.find({ id_cours: idCours }).toArray();
  verifier(documents.length, 1, 'un document dans la collection quiz');
  verifier(documents[0].id_utilisateur, idsDeTest[0], 'quiz rattaché à l\'enseignant du JWT');

  // --- Isolation ---
  const urlQuiz = '/api/quiz/' + quiz.id_quiz;
  verifier((await appelerApi(urlQuiz, { jeton: jetonB })).statut, 404, 'lecture du quiz interdite à B');
  verifier(
    (await appelerApi('/api/cours/' + idCours + '/quiz', { method: 'POST', jeton: jetonB })).statut,
    404,
    'génération sur le cours de A interdite à B',
  );

  // --- Export bloqué tant que le quiz n'est pas validé ---
  verifier((await appelerApi(urlQuiz + '/export', { jeton: jetonA })).statut, 409, 'export d\'un brouillon refusé');

  // --- Validation puis export ---
  const validation = await appelerApi(urlQuiz + '/validation', {
    method: 'POST',
    jeton: jetonA,
    corps: { revision: quiz.revision },
  });
  verifier(validation.donnees.statut, 'valide', 'quiz validé');
  const exportJson = await appelerApi(urlQuiz + '/export', { jeton: jetonA });
  verifier(exportJson.statut, 200, 'export d\'un quiz validé');
  verifier(exportJson.enTetes.get('content-disposition').includes('attachment'), true, 'export en pièce jointe');
  verifier(exportJson.donnees.questions.length, 6, 'export complet');

  // --- Modification : retour en brouillon ---
  const questionsModifiees = [...quiz.questions];
  questionsModifiees[0] = { ...questionsModifiees[0], enonce: 'Énoncé corrigé par l\'enseignant ?' };
  const modification = await appelerApi(urlQuiz, {
    method: 'PUT',
    jeton: jetonA,
    corps: { titre: 'Quiz relu', questions: questionsModifiees, revision: validation.donnees.revision },
  });
  verifier(modification.statut, 200, 'modification enregistrée');
  verifier(modification.donnees.statut, 'brouillon', 'modification -> retour en brouillon');
  const enonceEnregistre = modification.donnees.questions[0].enonce;
  verifier(enonceEnregistre, 'Énoncé corrigé par l\'enseignant ?', 'énoncé modifié en base');

  // --- Suppression du cours : ses quiz MongoDB disparaissent aussi ---
  const suppressionCours = await appelerApi('/api/cours/' + idCours, { method: 'DELETE', jeton: jetonA });
  verifier(suppressionCours.statut, 204, 'cours supprimé');
  verifier(await collection.countDocuments({ id_cours: idCours }), 0, 'quiz supprimés avec le cours');
}

async function principal() {
  try {
    await executer();
    console.log(nombreVerifications + ' vérifications réussies sur la vraie API, PostgreSQL et MongoDB.');
  } finally {
    // Nettoyage systématique : seuls les comptes créés par ce script.
    if (idsDeTest.length > 0) {
      const collection = await collectionQuiz();
      await collection.deleteMany({ id_utilisateur: { $in: idsDeTest } });
    }
    await pool.query('DELETE FROM utilisateur WHERE email = ANY($1::text[])', [emailsDeTest]);
    await pool.end();
    await fermerMongo();
    console.log('Comptes, cours et quiz de test nettoyés.');
  }
}

principal().catch((erreur) => {
  console.error(erreur.message);
  process.exitCode = 1;
});
