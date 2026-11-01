// Vérification de bout en bout du droit à l'effacement (RGPD, art. 17) sur la
// VRAIE API et PostgreSQL (les tests Jest, eux, simulent le dépôt).
//
// À lancer avec la stack démarrée :
//   docker compose exec -T back node scripts/verifier-suppression-compte-reel.js
//
// Crée un compte A avec deux cours, un quiz et sa génération, et un compte B
// témoin. Supprime A par l'API (DELETE /api/compte, comme le bouton du site),
// puis vérifie table par table qu'il ne reste rien de A, et que B est intact.
// Utilise le fournisseur d'IA configuré ("simulation" par défaut : aucun coût).

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const pool = require('../src/config/postgres');

const URL_API = process.env.API_URL || 'http://127.0.0.1:3000';
const prefixe = 'verification-effacement-' + randomUUID();
const emailsDeTest = [prefixe + '-a@example.test', prefixe + '-b@example.test'];
const motDePasse = 'Test-local-' + randomUUID();
let nombreVerifications = 0;

const TEXTE_COURS = [
  'La photosynthèse permet aux plantes de produire leur propre matière organique.',
  'Elle se déroule principalement dans les chloroplastes des cellules des feuilles.',
  'La chlorophylle capte l\'énergie lumineuse nécessaire à la réaction.',
  'La plante absorbe du dioxyde de carbone et rejette du dioxygène.',
  'Le glucose produit sert de source d\'énergie et de matériau de construction.',
].join(' ');

function lireJetonCookie(reponse) {
  const cookie = reponse.headers.get('set-cookie') || '';
  const premier = cookie.split(';')[0];
  return premier.includes('=') ? decodeURIComponent(premier.slice(premier.indexOf('=') + 1)) : null;
}

async function appelerApi(chemin, { method = 'GET', corps, jeton } = {}) {
  const enTetes = { 'Content-Type': 'application/json' };
  if (jeton) {
    enTetes.Authorization = 'Bearer ' + jeton;
  }
  const reponse = await fetch(URL_API + chemin, {
    method,
    headers: enTetes,
    ...(corps === undefined ? {} : { body: JSON.stringify(corps) }),
  });
  const texte = await reponse.text();
  const donnees = texte ? JSON.parse(texte) : null;
  if (chemin.startsWith('/api/auth/') && donnees) {
    donnees.jeton = lireJetonCookie(reponse);
  }
  return { statut: reponse.status, donnees };
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
  return { jeton: inscription.donnees.jeton, id: inscription.donnees.utilisateur.id_utilisateur };
}

async function creerCours(jeton, titre) {
  const cours = await appelerApi('/api/cours', {
    method: 'POST',
    jeton,
    corps: { titre, contenuTexte: TEXTE_COURS },
  });
  verifier(cours.statut, 201, 'création du cours ' + titre);
  return cours.donnees.id_cours;
}

// Nombre de lignes de chaque table rattachées à un compte.
async function compterDonnees(idUtilisateur) {
  const requetes = {
    utilisateur: 'SELECT count(*)::int AS n FROM utilisateur WHERE id_utilisateur = $1',
    cours: 'SELECT count(*)::int AS n FROM cours WHERE id_utilisateur = $1',
    quiz: 'SELECT count(*)::int AS n FROM quiz WHERE id_utilisateur = $1',
    generation_ia: 'SELECT count(*)::int AS n FROM generation_ia WHERE id_utilisateur = $1',
  };
  const comptes = {};
  for (const [table, requete] of Object.entries(requetes)) {
    const resultat = await pool.query(requete, [idUtilisateur]);
    comptes[table] = resultat.rows[0].n;
  }
  return comptes;
}

async function executer() {
  const compteA = await inscrire(emailsDeTest[0], 'Compte de test A');
  const compteB = await inscrire(emailsDeTest[1], 'Compte témoin B');

  // --- Données de A : deux cours, dont un avec un quiz généré ---
  const idCoursAvecQuiz = await creerCours(compteA.jeton, 'La photosynthèse');
  await creerCours(compteA.jeton, 'Cours sans quiz');
  const generation = await appelerApi('/api/cours/' + idCoursAvecQuiz + '/quiz', {
    method: 'POST',
    jeton: compteA.jeton,
    corps: { nombreQuestions: 3 },
  });
  verifier(generation.statut, 201, 'génération du quiz de A');

  // --- Données de B : un cours, qui ne doit pas être touché ---
  await creerCours(compteB.jeton, 'Cours du témoin');

  verifier(
    await compterDonnees(compteA.id),
    { utilisateur: 1, cours: 2, quiz: 1, generation_ia: 1 },
    'données de A présentes avant la suppression',
  );

  // --- Mauvais mot de passe : rien n'est supprimé ---
  const refus = await appelerApi('/api/compte', {
    method: 'DELETE',
    jeton: compteA.jeton,
    corps: { motDePasse: 'Mauvais-mot-de-passe-123' },
  });
  verifier(refus.statut, 403, 'suppression refusée avec un mauvais mot de passe');
  verifier((await compterDonnees(compteA.id)).cours, 2, 'aucune donnée supprimée après un refus');

  // --- Suppression par l'API, comme le bouton « Supprimer mon compte » ---
  const suppression = await appelerApi('/api/compte', {
    method: 'DELETE',
    jeton: compteA.jeton,
    corps: { motDePasse },
  });
  verifier(suppression.statut, 204, 'compte A supprimé');

  verifier(
    await compterDonnees(compteA.id),
    { utilisateur: 0, cours: 0, quiz: 0, generation_ia: 0 },
    'plus aucune donnée de A dans aucune table',
  );

  // L'ancien jeton de A ne doit plus ouvrir de session.
  verifier((await appelerApi('/api/compte/session', { jeton: compteA.jeton })).statut, 401, 'jeton de A refusé');

  // Le compte témoin B n'a rien perdu.
  verifier(
    await compterDonnees(compteB.id),
    { utilisateur: 1, cours: 1, quiz: 0, generation_ia: 0 },
    'données du témoin B intactes',
  );
}

async function principal() {
  try {
    await executer();
    console.log(nombreVerifications + ' vérifications réussies sur la vraie API et PostgreSQL.');
  } finally {
    // Nettoyage systématique : seuls les comptes créés par ce script.
    await pool.query('DELETE FROM utilisateur WHERE email = ANY($1::text[])', [emailsDeTest]);
    await pool.end();
    console.log('Comptes de test nettoyés.');
  }
}

principal().catch((erreur) => {
  console.error(erreur.message);
  process.exitCode = 1;
});
