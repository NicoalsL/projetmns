const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const coursRoutes = require('./routes/cours.routes');
const quizRoutes = require('./routes/quiz.routes');
const compteRoutes = require('./routes/compte.routes');
const { schemaEstPret } = require('./config/verificationSchema');
const gestionErreurs = require('./middlewares/gestionErreurs');
const { limiteurAuthentification } = require('./middlewares/limiteurs');
const { verifierOrigine, verifierCsrf } = require('./middlewares/sessionCookie');

// Rôle : assembler l'application. Réglages de sécurité, puis routes, puis erreurs.
// L'ORDRE des app.use() compte : chaque requête traverse ces étapes de haut en bas.
//
// CHOIX — Express : le framework web Node.js le plus utilisé, simple, avec le
// principe des middlewares (des contrôles enchaînés), idéal pour la sécurité.
// Pas de app.listen() ici (il est dans serveur.js) : les tests importent l'app
// et l'interrogent sans démarrer de vrai serveur.
const app = express();

// SÉCURITÉ — Ne pas annoncer « Express » dans les réponses : inutile d'aider
// un attaquant à viser les failles connues de cet outil.
app.disable('x-powered-by');

// En production, l'API est derrière nginx : sans ce réglage, toutes les
// requêtes sembleraient venir de nginx, et la limite par IP serait commune
// à tout le monde. TRUST_PROXY = nombre de proxys de confiance.
// Absent en développement : un client ne doit pas pouvoir s'inventer une IP.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY));
}

// SÉCURITÉ — CORS : seul NOTRE site a le droit d'appeler l'API depuis un
// navigateur (le front et l'API sont sur deux adresses différentes).
app.use(cors({ origin: process.env.ORIGINE_FRONT || 'http://localhost:5173' }));

// SÉCURITÉ — Le navigateur ne doit pas deviner le type des réponses (nosniff),
// ni garder en cache des données personnelles (no-store).
app.use((requete, reponse, suite) => {
  reponse.set('X-Content-Type-Options', 'nosniff');
  reponse.set('Cache-Control', 'no-store');
  suite();
});

// SÉCURITÉ — Anti force brute : 20 essais par 15 minutes et par adresse IP.
// Placé AVANT la lecture du JSON : une IP bloquée ne fait même pas travailler le serveur.
app.use('/api/auth', limiteurAuthentification);

// 16 ko suffisent pour l'authentification et limitent les requêtes géantes.
app.use('/api/auth', express.json({ limit: '16kb' }));

// /sante : le serveur Node répond-il ? (sans toucher à la base)
app.get('/sante', (requete, reponse) => {
  reponse.json({ statut: 'ok' });
});

// /pret : PostgreSQL et toutes ses tables répondent-ils ?
// Docker s'en sert pour lancer le front seulement quand l'API est prête.
app.get('/pret', async (requete, reponse) => {
  try {
    const pret = await schemaEstPret();
    reponse.status(pret ? 200 : 503).json({ statut: pret ? 'pret' : 'indisponible' });
  } catch {
    reponse.status(503).json({ statut: 'indisponible' });
  }
});

// Protection des requêtes mutantes : origine du navigateur et double jeton CSRF signé.
app.use('/api', verifierOrigine, verifierCsrf);

// Les quatre familles de routes de l'API.
app.use('/api/auth', authRoutes);
app.use('/api/cours', coursRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/compte', compteRoutes);

// Adresse inconnue : 404 en JSON (pas la page HTML d'Express), pour que le
// front puisse toujours lire le message.
app.use((requete, reponse) => {
  reponse.status(404).json({ erreur: 'Ressource introuvable' });
});

// Toujours en dernier : attrape toutes les erreurs non traitées.
app.use(gestionErreurs);

module.exports = app;
