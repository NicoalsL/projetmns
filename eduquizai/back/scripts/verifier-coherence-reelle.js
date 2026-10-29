// Vérifie la cohérence SQL, les transactions et l'API sur une base dédiée.
// Refuse toute base ne commençant pas par verification_ : aucun compte réel touché.
// L'IA reste simulée, même si l'application utilise normalement Ollama.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const jwt = require('jsonwebtoken');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL est requise.');
}

const nomBase = new URL(process.env.DATABASE_URL).pathname.slice(1);

if (!/^verification_[a-z0-9_]+$/.test(nomBase)) {
  throw new Error('Une base dédiée verification_* est obligatoire pour ces tests.');
}

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET est requis pour tester les routes protégées.');
}

process.env.IA_FOURNISSEUR = 'simulation';

const pool = require('../src/config/postgres');
const coursDepot = require('../src/depots/cours.depot');
const quizDepot = require('../src/depots/quiz.depot');
const app = require('../src/app');

let serveur;
let adresseApi;
let nombreVerifications = 0;
const comptesCrees = [];

function verifier(obtenu, attendu, description) {
  assert.deepEqual(obtenu, attendu, description);
  nombreVerifications += 1;
}

// Le navigateur de test conserve le principe du JWT sans créer de session fictive.
function creerJeton(idUtilisateur) {
  return jwt.sign(
    { id_utilisateur: idUtilisateur, role: 'enseignant', version: 0 },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );
}

async function appelerApi(chemin, jeton, methode = 'GET', corps) {
  const reponse = await fetch(adresseApi + chemin, {
    method: methode,
    headers: {
      Authorization: 'Bearer ' + jeton,
      'Content-Type': 'application/json',
    },
    ...(corps === undefined ? {} : { body: JSON.stringify(corps) }),
  });

  return reponse.status;
}

async function creerUtilisateur(nom) {
  const suffixe = Math.random().toString(36).slice(2);
  const resultat = await pool.query(
    `INSERT INTO utilisateur (nom, email, mot_de_passe_hache, consentement_rgpd)
     VALUES ($1, $2, $3, true)
     RETURNING id_utilisateur`,
    [nom, nom + '-' + suffixe + '@example.test', 'empreinte-de-test'],
  );
  const identifiant = resultat.rows[0].id_utilisateur;
  comptesCrees.push(identifiant);

  return identifiant;
}

async function creerCours(idUtilisateur) {
  const resultat = await pool.query(
    `INSERT INTO cours (titre, contenu_texte, id_utilisateur)
     VALUES ($1, $2, $3)
     RETURNING id_cours`,
    ['Cours test', 'Un texte de test destiné à la vérification SQL.', idUtilisateur],
  );

  return resultat.rows[0].id_cours;
}

async function creerQuiz(idCours, idUtilisateur, generation = null, client) {
  return quizDepot.creer({
    id_generation: generation,
    id_cours: idCours,
    id_utilisateur: idUtilisateur,
    titre: 'Quiz de test',
    statut: 'brouillon',
    questions: [{ type: 'ouverte', enonce: 'Pourquoi ?', bonne_reponse: 'Pour apprendre.' }],
    parametres: { difficulte: 'moyen' },
    date_creation: new Date(),
    date_modification: new Date(),
    date_validation: null,
  }, client);
}

async function testerQuizEtApi(enseignant, autreEnseignant) {
  const idCours = await creerCours(enseignant);
  const generation = await pool.query(
    `INSERT INTO generation_ia (statut, nombre_questions_demandees, id_utilisateur, id_cours)
     VALUES ('succes', 3, $1, $2) RETURNING id_generation`,
    [enseignant, idCours],
  );
  const idGeneration = generation.rows[0].id_generation;
  const quiz = await creerQuiz(idCours, enseignant, idGeneration);

  verifier(quiz.revision, 1, 'révision initiale');
  verifier(quiz.questions.length, 1, 'tableau JSONB enregistré');
  verifier(
    await quizDepot.trouverParId(quiz.id_quiz, autreEnseignant),
    null,
    'un autre enseignant ne peut pas accéder au quiz',
  );

  const jeton = creerJeton(enseignant);
  const urlQuiz = '/api/quiz/' + quiz.id_quiz;
  const statutBrouillon = await appelerApi(urlQuiz + '/export', jeton);
  verifier(statutBrouillon, 409, 'l’API refuse l’export avant validation');

  const modifie = await quizDepot.mettreAJour(
    quiz.id_quiz, enseignant, { titre: 'Quiz mis à jour' }, 1,
  );
  verifier(modifie.revision, 2, 'révision incrémentée dans SQL');

  const statutConflit = await appelerApi(
    urlQuiz + '/validation', jeton, 'POST', { revision: 1 },
  );
  verifier(statutConflit, 409, 'l’API refuse une validation périmée');
  verifier(
    await appelerApi(urlQuiz + '/export', jeton),
    409,
    'un conflit n’autorise pas l’export',
  );

  const statutValidation = await appelerApi(
    urlQuiz + '/validation', jeton, 'POST', { revision: 2 },
  );
  verifier(statutValidation, 200, 'validation correcte acceptée');
  verifier(await appelerApi(urlQuiz + '/export', jeton), 200, 'export du quiz validé');

  let cleEtrangereRefusee = false;

  try {
    await creerQuiz(idCours, autreEnseignant);
  } catch (erreur) {
    cleEtrangereRefusee = erreur.code === '23503';

    if (!cleEtrangereRefusee) {
      throw erreur;
    }
  }

  verifier(cleEtrangereRefusee, true, 'clé étrangère composée protège le propriétaire');

  await pool.query('DELETE FROM generation_ia WHERE id_generation = $1', [idGeneration]);
  const conserve = await quizDepot.trouverParId(quiz.id_quiz, enseignant);
  verifier(conserve.id_generation, null, 'purge de l’historique IA sans supprimer le quiz');

  await pool.query('DELETE FROM cours WHERE id_cours = $1', [idCours]);
  verifier(
    await quizDepot.trouverParId(quiz.id_quiz, enseignant),
    null,
    'suppression du cours et de son quiz par cascade',
  );
}

async function testerConcurrence(enseignant) {
  const idCours = await creerCours(enseignant);
  let identifiantQuiz;

  // Deux connexions réelles : un DELETE tente de supprimer le cours pendant
  // que la transaction de création du quiz détient le verrou FOR UPDATE.
  await coursDepot.avecCoursVerrouille(idCours, enseignant, async (client) => {
    const connexionConcurrente = await pool.connect();

    try {
      await connexionConcurrente.query('BEGIN');
      await connexionConcurrente.query("SET LOCAL lock_timeout = '300ms'");

      let codeBlocage = null;

      try {
        await connexionConcurrente.query(
          'DELETE FROM cours WHERE id_cours = $1 AND id_utilisateur = $2',
          [idCours, enseignant],
        );
      } catch (erreur) {
        codeBlocage = erreur.code;
      }

      verifier(codeBlocage, '55P03', 'suppression concurrente bloquée par FOR UPDATE');
      await connexionConcurrente.query('ROLLBACK');
    } finally {
      connexionConcurrente.release();
    }

    const quiz = await creerQuiz(idCours, enseignant, null, client);
    identifiantQuiz = quiz.id_quiz;
  });

  verifier(
    (await quizDepot.trouverParId(identifiantQuiz, enseignant)).statut,
    'brouillon',
    'création atomique du quiz après tentative de suppression',
  );

  // Après libération du verrou, la suppression redevient possible.
  await pool.query('DELETE FROM cours WHERE id_cours = $1', [idCours]);
  verifier(
    await quizDepot.trouverParId(identifiantQuiz, enseignant),
    null,
    'suppression ultérieure efface aussi le quiz',
  );

  let actionExecutee = false;
  const resultat = await coursDepot.avecCoursVerrouille(
    idCours,
    enseignant,
    async () => {
      actionExecutee = true;
    },
  );

  verifier(resultat, null, 'un cours supprimé ne peut plus être verrouillé');
  verifier(actionExecutee, false, 'aucune écriture tardive après suppression');
}

async function principal() {
  const schema = await fs.readFile(path.join(__dirname, '../src/config/schema.sql'), 'utf8');
  await pool.query(schema);

  await new Promise((resoudre) => {
    serveur = app.listen(0, '127.0.0.1', resoudre);
  });
  adresseApi = 'http://127.0.0.1:' + serveur.address().port;

  const enseignant = await creerUtilisateur('enseignant');
  const autreEnseignant = await creerUtilisateur('autre');

  await testerQuizEtApi(enseignant, autreEnseignant);
  await testerConcurrence(enseignant);

  console.log(nombreVerifications + ' vérifications réelles SQL et API réussies.');
}

principal().catch((erreur) => {
  console.error('Vérification SQL échouée :', erreur.message);
  process.exitCode = 1;
}).finally(async () => {
  try {
    if (serveur) {
      await new Promise((resoudre) => {
        serveur.close(resoudre);
        serveur.closeAllConnections();
      });
    }

    // Seuls les comptes créés par ce script peuvent être supprimés.
    if (comptesCrees.length) {
      await pool.query(
        'DELETE FROM utilisateur WHERE id_utilisateur = ANY($1::int[])',
        [comptesCrees],
      );
    }
  } catch (erreur) {
    console.error('Nettoyage du test impossible :', erreur.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
});
