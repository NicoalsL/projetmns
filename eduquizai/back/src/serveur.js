const verifierEnvironnement = require('./config/environnement');

const DELAI_ARRET_FORCE_MS = 10000;

// Point d'entrée du processus : vérifie la configuration et la base AVANT
// d'ouvrir le port HTTP, pour échouer tout de suite avec un message clair
// plutôt que de renvoyer des erreurs 500 aux premiers utilisateurs.
async function demarrer() {
  verifierEnvironnement();

  // Chargés après la vérification : ils lisent process.env à l'import.
  const pool = require('./config/postgres');
  const { schemaEstPret } = require('./config/verificationSchema');
  const app = require('./app');

  if (!(await schemaEstPret())) {
    await pool.end();
    throw new Error('Schéma SQL absent. Exécuter npm run db:init avant de démarrer.');
  }

  const port = Number(process.env.PORT || 3000);
  const serveur = app.listen(port, () => {
    console.log(`Serveur EduQuizAI démarré sur le port ${port}`);
  });

  serveur.on('error', async () => {
    console.error('Impossible de démarrer le serveur HTTP (port déjà utilisé ?)');
    await pool.end();
    process.exitCode = 1;
  });

  // Arrêt propre (docker stop, Ctrl+C) : on laisse les requêtes en cours se
  // terminer et on ferme les connexions PostgreSQL. Si ça bloque, on force.
  function arreter() {
    serveur.close(async () => {
      await pool.end();
      process.exit(0);
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
