const verifierEnvironnement = require('./config/environnement');

const DELAI_ARRET_FORCE_MS = 10000;
const INTERVALLE_PURGE_MS = 24 * 60 * 60 * 1000; // une fois par jour
const INTERVALLE_NETTOYAGE_MS = 30000; // reprise des effacements après panne MongoDB

// Point d'entrée du processus : vérifie la configuration et la base AVANT
// d'ouvrir le port HTTP, pour échouer tout de suite avec un message clair
// plutôt que de renvoyer des erreurs 500 aux premiers utilisateurs.
async function demarrer() {
  verifierEnvironnement();

  // Chargés après la vérification : ils lisent process.env à l'import.
  const pool = require('./config/postgres');
  const { fermerMongo } = require('./config/mongo');
  const { schemaEstPret } = require('./config/verificationSchema');
  const app = require('./app');

  if (!(await schemaEstPret())) {
    await pool.end();
    throw new Error('Schéma SQL absent. Exécuter npm run db:init avant de démarrer.');
  }

  // RGPD : le journal des générations et le journal de sécurité ne sont
  // conservés que 6 mois. La purge tourne au démarrage puis chaque jour ;
  // unref() n'empêche pas l'arrêt.
  const generationIaDepot = require('./depots/generationIa.depot');
  const journalSecuriteDepot = require('./depots/journalSecurite.depot');
  async function purgerJournal() {
    try {
      const nombre = await generationIaDepot.purgerAnciennes();
      if (nombre > 0) console.log(`Journal IA : ${nombre} entrée(s) de plus de 6 mois supprimée(s)`);
      const nombreSecurite = await journalSecuriteDepot.purgerAnciens();
      if (nombreSecurite > 0) console.log(`Journal de sécurité : ${nombreSecurite} entrée(s) supprimée(s)`);
    } catch (erreur) {
      console.error('Purge des journaux impossible', { code: erreur.code });
    }
  }
  await purgerJournal();
  setInterval(purgerJournal, INTERVALLE_PURGE_MS).unref();

  const { reprendreNettoyage } = require('./services/nettoyageQuiz.service');
  await reprendreNettoyage();
  const minuteurNettoyage = setInterval(reprendreNettoyage, INTERVALLE_NETTOYAGE_MS);
  minuteurNettoyage.unref();

  const port = Number(process.env.PORT || 3000);
  const serveur = app.listen(port, () => {
    console.log(`Serveur EduQuizAI démarré sur le port ${port}`);
  });

  // Ferme les deux bases. Renvoie false si l'une n'a pas pu être fermée
  // proprement (l'erreur est journalisée sans détail technique).
  async function fermerBases() {
    try {
      await pool.end();
      await fermerMongo();
      return true;
    } catch (erreur) {
      console.error('Fermeture des bases de données impossible', { code: erreur.code });
      return false;
    }
  }

  serveur.on('error', async () => {
    console.error('Impossible de démarrer le serveur HTTP (port déjà utilisé ?)');
    await fermerBases();
    process.exitCode = 1;
  });

  // Arrêt propre (docker stop, Ctrl+C) : on laisse les requêtes en cours se
  // terminer et on ferme les connexions PostgreSQL et MongoDB. Si ça bloque, on force.
  function arreter() {
    clearInterval(minuteurNettoyage);
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

// Démarre seulement si le fichier est lancé directement (node src/serveur.js),
// pas quand il est importé.
if (require.main === module) {
  demarrer().catch((erreur) => {
    console.error(erreur.message);
    process.exit(1);
  });
}

module.exports = { demarrer };
