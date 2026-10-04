// Vérification de bout en bout des cours sur la VRAIE API et la VRAIE base
// PostgreSQL (complément des tests Jest, qui simulent la base).
//
// À lancer avec la stack démarrée :
//   docker compose exec -T back node scripts/verifier-cours-reel.js
//
// Crée deux comptes de test au nom unique, puis supprime uniquement ces deux
// comptes (et leurs cours, par cascade) à la fin, même si une vérification échoue.

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const pool = require('../src/config/postgres');

const URL_API = process.env.API_URL || 'http://127.0.0.1:3000';
const prefixe = 'verification-' + randomUUID();
const emailsDeTest = [prefixe + '-a@example.test', prefixe + '-b@example.test'];
const motDePasse = 'Test-local-' + randomUUID();
let nombreVerifications = 0;

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
  return { statut: reponse.status, donnees: texte ? JSON.parse(texte) : null };
}

function verifier(obtenu, attendu, description) {
  assert.deepEqual(obtenu, attendu, description);
  nombreVerifications += 1;
}

async function executer() {
  // --- Préparation : deux enseignants A et B ---
  const inscriptionA = await appelerApi('/api/auth/inscription', {
    method: 'POST',
    corps: { nom: 'Compte de test A', email: emailsDeTest[0], motDePasse, consentementRgpd: true },
  });
  const inscriptionB = await appelerApi('/api/auth/inscription', {
    method: 'POST',
    corps: { nom: 'Compte de test B', email: emailsDeTest[1], motDePasse, consentementRgpd: true },
  });
  verifier(inscriptionA.statut, 201, 'inscription A');
  verifier(inscriptionB.statut, 201, 'inscription B');
  const jetonA = inscriptionA.donnees.jeton;
  const jetonB = inscriptionB.donnees.jeton;
  const idA = inscriptionA.donnees.utilisateur.id_utilisateur;
  const idB = inscriptionB.donnees.utilisateur.id_utilisateur;

  verifier((await appelerApi('/api/cours')).statut, 401, 'liste refusée sans session');

  // --- Création : titre piégé (SQL + XSS), texte de plus de 16 ko, faux propriétaire ---
  const titre = "Cours de test : SQL ' ; <script>aucuneExecution()</script>";
  const contenu = 'La cellule est une unité du vivant.\n'.repeat(700);
  const creation = await appelerApi('/api/cours', {
    method: 'POST',
    jeton: jetonA,
    corps: { titre, contenuTexte: contenu, id_utilisateur: idB },
  });
  verifier(creation.statut, 201, 'création d\'un cours de plus de 16 ko');
  const idCours = creation.donnees.id_cours;

  // Lecture directe en base : le texte est stocké tel quel et l'auteur est A
  // (celui du JWT), malgré le id_utilisateur de B envoyé dans le corps.
  const ligne = await pool.query(
    'SELECT id_utilisateur, titre, contenu_texte FROM cours WHERE id_cours = $1',
    [idCours],
  );
  verifier(
    ligne.rows[0],
    { id_utilisateur: idA, titre, contenu_texte: contenu.trim() },
    'persistance réelle et auteur imposé par le JWT',
  );

  // --- Persistance après reconnexion ---
  const connexion = await appelerApi('/api/auth/connexion', {
    method: 'POST',
    corps: { email: emailsDeTest[0], motDePasse },
  });
  verifier(connexion.statut, 200, 'reconnexion de A');
  const apresReconnexion = await appelerApi('/api/cours/' + idCours, { jeton: connexion.donnees.jeton });
  verifier(apresReconnexion.donnees.contenu_texte, contenu.trim(), 'cours conservé après reconnexion');

  // --- Isolation entre enseignants ---
  const listeA = await appelerApi('/api/cours', { jeton: jetonA });
  verifier(listeA.donnees.map((cours) => cours.id_cours), [idCours], 'liste de A');
  verifier(Object.hasOwn(listeA.donnees[0], 'contenu_texte'), false, 'liste sans chargement des textes');
  verifier((await appelerApi('/api/cours', { jeton: jetonB })).donnees, [], 'liste de B isolée');
  verifier((await appelerApi('/api/cours/' + idCours, { jeton: jetonB })).statut, 404, 'lecture interdite à B');
  verifier(
    (await appelerApi('/api/cours/' + idCours, { method: 'DELETE', jeton: jetonB })).statut,
    404,
    'suppression interdite à B',
  );
  verifier(
    (await appelerApi('/api/cours/' + idCours, { jeton: jetonA })).statut,
    200,
    'cours toujours présent après la tentative de B',
  );

  // --- Entrées invalides ---
  const identifiantInjecte = await appelerApi('/api/cours/1%20OR%201=1', { jeton: jetonA });
  verifier(identifiantInjecte.statut, 400, 'identifiant injecté refusé');

  const titreVide = await appelerApi('/api/cours', {
    method: 'POST',
    jeton: jetonA,
    corps: { titre: '  ', contenuTexte: 'test' },
  });
  verifier(titreVide.statut, 400, 'titre vide refusé');

  const coursTropLong = await appelerApi('/api/cours', {
    method: 'POST',
    jeton: jetonA,
    corps: { titre: 'test', contenuTexte: 'x'.repeat(50001) },
  });
  verifier(coursTropLong.statut, 400, 'cours trop long refusé');

  // --- Suppression par le propriétaire ---
  verifier(
    (await appelerApi('/api/cours/' + idCours, { method: 'DELETE', jeton: jetonA })).statut,
    204,
    'suppression par le propriétaire',
  );
  verifier((await appelerApi('/api/cours/' + idCours, { jeton: jetonA })).statut, 404, 'lecture après suppression');
  verifier((await appelerApi('/api/cours', { jeton: jetonA })).donnees, [], 'liste vide après suppression');
}

async function principal() {
  try {
    await executer();
    console.log(nombreVerifications + ' vérifications réussies sur la vraie API et PostgreSQL.');
  } finally {
    // Nettoyage systématique : seuls les comptes créés par ce script.
    await pool.query('DELETE FROM utilisateur WHERE email = ANY($1::text[])', [emailsDeTest]);
    await pool.end();
    console.log('Comptes et cours de test nettoyés.');
  }
}

principal().catch((erreur) => {
  console.error(erreur.message);
  process.exitCode = 1;
});
