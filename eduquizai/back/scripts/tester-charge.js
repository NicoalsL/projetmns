// Test de CHARGE de l'API : plusieurs enseignants « virtuels » utilisent le site
// en même temps pendant quelques secondes. On mesure le débit (requêtes par
// seconde) et les temps de réponse, et on vérifie qu'aucune erreur serveur
// n'apparaît sous la charge.
//
// À lancer avec la stack démarrée (API sur le port 3000) :
//   npm run test:charge                 (20 utilisateurs pendant 20 s)
//   npm run test:charge -- 50 30        (50 utilisateurs pendant 30 s)
//
// Critères d'acceptation (plan de tests) : 0 erreur serveur (5xx ou réseau) et
// 95 % des réponses en moins de 500 ms. Sinon, le script échoue (code 1).
//
// Ce qui est testé : lecture de la liste des cours, lecture d'un cours,
// création puis suppression d'un cours. La génération par l'IA n'est PAS
// testée en charge : elle est limitée à 10 par heure et par enseignant, et sa
// durée (≈ 5 s) dépend de l'IA, pas du serveur (voir mesurer-performance.js).
//
// Un seul compte de test est créé (une seule connexion : la limite anti force
// brute de /api/auth n'est pas déclenchée), puis supprimé à la fin.

const { randomUUID } = require('node:crypto');

function lireJetonCookie(reponse) {
  const cookie = reponse.headers.get('set-cookie') || '';
  const premier = cookie.split(';')[0];
  return premier.includes('=') ? decodeURIComponent(premier.slice(premier.indexOf('=') + 1)) : null;
}

const URL_API = process.env.API_URL || 'http://127.0.0.1:3000';
const NOMBRE_UTILISATEURS = Number(process.argv[2]) || 20;
const DUREE_SECONDES = Number(process.argv[3]) || 20;
const SEUIL_P95_MS = 500;

const motDePasse = 'Charge-' + randomUUID();
const email = 'charge-' + randomUUID() + '@example.test';
const COURS_DE_TEST = {
  titre: 'Cours de test de charge',
  contenuTexte: 'La photosynthèse permet aux plantes de produire du sucre à partir de la lumière.\n'.repeat(20),
};

const mesures = []; // une entrée par requête : { duree, statut }

// Envoie une requête et note sa durée et son statut (0 = erreur réseau).
async function appelerApi(chemin, { method = 'GET', corps, jeton } = {}) {
  const enTetes = { 'Content-Type': 'application/json' };
  if (jeton) {
    enTetes.Authorization = 'Bearer ' + jeton;
  }
  const debut = performance.now();
  let statut = 0;
  let donnees = null;
  try {
    const reponse = await fetch(URL_API + chemin, {
      method,
      headers: enTetes,
      ...(corps === undefined ? {} : { body: JSON.stringify(corps) }),
    });
    statut = reponse.status;
    const texte = await reponse.text();
    donnees = texte ? JSON.parse(texte) : null;
    if (chemin.startsWith('/api/auth/') && donnees) donnees.jeton = lireJetonCookie(reponse);
  } catch {
    statut = 0;
  }
  mesures.push({ duree: performance.now() - debut, statut });
  return { statut, donnees };
}

// Parcours d'un enseignant virtuel, répété jusqu'à la fin du test :
// 1 création + 1 suppression pour 4 lectures environ.
async function enseignantVirtuel(jeton, idCours, finTest) {
  while (Date.now() < finTest) {
    const tirage = Math.random();
    if (tirage < 0.5) {
      await appelerApi('/api/cours', { jeton });
    } else if (tirage < 0.8) {
      await appelerApi('/api/cours/' + idCours, { jeton });
    } else {
      const creation = await appelerApi('/api/cours', { method: 'POST', jeton, corps: COURS_DE_TEST });
      if (creation.statut === 201) {
        await appelerApi('/api/cours/' + creation.donnees.id_cours, { method: 'DELETE', jeton });
      }
    }
  }
}

// Valeur sous laquelle se trouvent p % des mesures (ex. p95).
function centile(valeursTriees, p) {
  const index = Math.min(valeursTriees.length - 1, Math.ceil((p / 100) * valeursTriees.length) - 1);
  return valeursTriees[Math.max(0, index)];
}

async function executer() {
  // --- Préparation : un compte et un cours de test ---
  const inscription = await appelerApi('/api/auth/inscription', {
    method: 'POST',
    corps: { nom: 'Compte de test de charge', email, motDePasse, consentementRgpd: true },
  });
  if (inscription.statut !== 201) {
    throw new Error(`Inscription impossible (statut ${inscription.statut}) : l'API est-elle démarrée ?`);
  }
  const jeton = inscription.donnees.jeton;
  const cours = await appelerApi('/api/cours', { method: 'POST', jeton, corps: COURS_DE_TEST });
  mesures.length = 0; // la préparation ne compte pas dans les mesures

  try {
    // --- Charge : tous les enseignants virtuels en même temps ---
    console.log(`Test de charge : ${NOMBRE_UTILISATEURS} utilisateurs simultanés pendant ${DUREE_SECONDES} s…`);
    const finTest = Date.now() + DUREE_SECONDES * 1000;
    const utilisateurs = Array.from(
      { length: NOMBRE_UTILISATEURS },
      () => enseignantVirtuel(jeton, cours.donnees.id_cours, finTest),
    );
    await Promise.all(utilisateurs);
  } finally {
    // --- Nettoyage : supprime le compte de test et tous ses cours (cascade) ---
    await appelerApi('/api/compte', { method: 'DELETE', jeton, corps: { motDePasse } });
  }

  // --- Résultats ---
  const durees = mesures.map((mesure) => mesure.duree).sort((a, b) => a - b);
  const erreursServeur = mesures.filter((mesure) => mesure.statut === 0 || mesure.statut >= 500).length;
  const p95 = centile(durees, 95);
  const resultats = {
    'requêtes': mesures.length,
    'requêtes par seconde': Math.round(mesures.length / DUREE_SECONDES),
    'médiane (ms)': Math.round(centile(durees, 50)),
    'p95 (ms)': Math.round(p95),
    'p99 (ms)': Math.round(centile(durees, 99)),
    'maximum (ms)': Math.round(durees[durees.length - 1]),
    'erreurs serveur': erreursServeur,
  };
  console.table(resultats);

  const reussi = erreursServeur === 0 && p95 < SEUIL_P95_MS;
  console.log(reussi
    ? `RÉUSSI : aucune erreur serveur et p95 < ${SEUIL_P95_MS} ms.`
    : `ÉCHEC : critères non atteints (0 erreur serveur, p95 < ${SEUIL_P95_MS} ms).`);
  process.exitCode = reussi ? 0 : 1;
}

executer().catch((erreur) => {
  console.error('Test de charge interrompu :', erreur.message);
  process.exitCode = 1;
});
