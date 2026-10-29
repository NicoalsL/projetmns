const verifierEnvironnement = require('./config/environnement');

const DELAI_ARRET_FORCE_MS = 10000;
const INTERVALLE_PURGE_MS = 24 * 60 * 60 * 1000; // une fois par jour

// Rôle : démarrer le serveur (« npm start »), en 5 étapes :
// 1. vérifier la configuration ; 2. vérifier PostgreSQL ; 3. lancer les tâches
// de fond (purge RGPD) ; 4. ouvrir le port HTTP ;
// 5. préparer l'arrêt propre.
// CHOIX — « Échouer tôt » : une configuration fausse arrête tout de suite le
// serveur avec un message clair, plutôt que des erreurs 500 pour les utilisateurs.
async function demarrer() {
  verifierEnvironnement();

  // Chargés APRÈS la vérification, car ils lisent la configuration dès leur chargement.
  const pool = require('./config/postgres');
  const { schemaEstPret, compteApiEstRestreint } = require('./config/verificationSchema');
  const app = require('./app');

  if (!(await schemaEstPret())) {
    await pool.end();
    throw new Error('Schéma SQL absent. Exécuter npm run db:init avant de démarrer.');
  }

  // SÉCURITÉ — Moindre privilège : en production, refus de démarrer avec un compte
  // PostgreSQL d'administration ; en développement, simple avertissement.
  if (!(await compteApiEstRestreint())) {
    if (process.env.NODE_ENV === 'production') {
      await pool.end();
      throw new Error(
        'L\'API doit utiliser le compte PostgreSQL restreint (voir DATABASE_URL_ADMIN, npm run db:init).',
      );
    }
    console.warn('SÉCURITÉ : l\'API utilise un compte PostgreSQL d\'administration (voir DATABASE_URL_ADMIN).');
  }

  // RGPD — Les deux journaux sont gardés 6 mois maximum : purge au démarrage,
  // puis chaque jour (unref() = ce minuteur n'empêche pas l'arrêt du serveur).
  const generationIaDepot = require('./depots/generationIa.depot');
  const journalSecuriteDepot = require('./depots/journalSecurite.depot');
  async function purgerJournal() {
    try {
      const nombre = await generationIaDepot.purgerAnciens();
      if (nombre > 0) console.log(`Journal IA : ${nombre} entrée(s) de plus de 6 mois supprimée(s)`);
      const nombreSecurite = await journalSecuriteDepot.purgerAnciens();
      if (nombreSecurite > 0) console.log(`Journal de sécurité : ${nombreSecurite} entrée(s) supprimée(s)`);
    } catch (erreur) {
      console.error('Purge des journaux impossible', { code: erreur.code });
    }
  }
  await purgerJournal();
  setInterval(purgerJournal, INTERVALLE_PURGE_MS).unref();

  const port = Number(process.env.PORT || 3000);
  const serveur = app.listen(port, () => {
    console.log(`Serveur EduQuizAI démarré sur le port ${port}`);
  });

  // Préchauffe l'IA locale sans bloquer le démarrage : l'API répond déjà.
  // Si Ollama est arrêté, on le signale seulement ; on pourra générer plus tard.
  const { prechaufferIa } = require('./ia/genererQuiz');
  prechaufferIa()
    .then((fait) => {
      if (fait) {
        console.log('Modèle d\'IA local préchargé en mémoire');
      }
    })
    .catch((erreur) => console.error('Préchauffage du modèle d\'IA impossible', { code: erreur.code }));

  // Une seule base PostgreSQL à fermer proprement.
  async function fermerBases() {
    try {
      await pool.end();
      return true;
    } catch (erreur) {
      console.error('Fermeture de PostgreSQL impossible', { code: erreur.code });
      return false;
    }
  }

  serveur.on('error', async () => {
    console.error('Impossible de démarrer le serveur HTTP (port déjà utilisé ?)');
    await fermerBases();
    process.exitCode = 1;
  });

  // Arrêt propre (docker stop, Ctrl+C) : on laisse finir les requêtes en cours,
  // puis on ferme les bases. Si ça bloque plus de 10 s, on force.
  function arreter() {
    serveur.close(async () => {
      const fermetureReussie = await fermerBases();
      process.exit(fermetureReussie ? 0 : 1);
    });
    setTimeout(() => process.exit(1), DELAI_ARRET_FORCE_MS).unref();
  }
  process.once('SIGTERM', arreter);
  process.once('SIGINT', arreter);

  return serveur;
}

// Démarre seulement si on lance ce fichier (node src/serveur.js), pas s'il est importé.
if (require.main === module) {
  demarrer().catch((erreur) => {
    console.error(erreur.message);
    process.exit(1);
  });
}

module.exports = { demarrer };
