const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const coursRoutes = require('./routes/cours.routes');
const { schemaEstPret } = require('./config/verificationSchema');
const gestionErreurs = require('./middlewares/gestionErreurs');
const creerLimiteur = require('./middlewares/limitationAuth');

// Application Express seule, sans app.listen() : les tests peuvent l'importer
// et l'interroger sans démarrer un vrai serveur ni une vraie base.
const app = express();

// Ne pas annoncer "Express" dans les en-têtes : inutile d'aider un attaquant
// à cibler les failles connues d'une technologie.
app.disable('x-powered-by');

// Le front et le back tournent sur deux origines différentes : seul le front
// déclaré a le droit d'appeler l'API depuis un navigateur.
app.use(cors({ origin: process.env.ORIGINE_FRONT || 'http://localhost:5173' }));

// En-têtes de sécurité : interdire au navigateur de deviner le type des
// réponses, et ne jamais mettre en cache des données personnelles.
app.use((requete, reponse, suite) => {
  reponse.set('X-Content-Type-Options', 'nosniff');
  reponse.set('Cache-Control', 'no-store');
  suite();
});

// Placé AVANT la lecture du JSON : une IP bloquée est refusée sans même que
// son corps de requête soit analysé.
app.use('/api/auth', creerLimiteur());

// 16 ko suffisent pour l'authentification et limitent les requêtes géantes.
app.use('/api/auth', express.json({ limit: '16kb' }));

// Santé : le processus Node répond (sans toucher à la base).
app.get('/sante', (requete, reponse) => {
  reponse.json({ statut: 'ok' });
});

// Disponibilité : la base répond ET le schéma est en place. Utilisé par le
// healthcheck Docker pour ne démarrer le front qu'une fois l'API prête.
app.get('/pret', async (requete, reponse) => {
  try {
    const pret = await schemaEstPret();
    reponse.status(pret ? 200 : 503).json({ statut: pret ? 'pret' : 'indisponible' });
  } catch {
    reponse.status(503).json({ statut: 'indisponible' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/cours', coursRoutes);

// Toute route inconnue renvoie du JSON (et non la page HTML par défaut
// d'Express), pour que le front puisse toujours lire le message d'erreur.
app.use((requete, reponse) => {
  reponse.status(404).json({ erreur: 'Ressource introuvable' });
});

// Toujours en dernier : capture les erreurs non gérées par les routes.
app.use(gestionErreurs);

module.exports = app;
