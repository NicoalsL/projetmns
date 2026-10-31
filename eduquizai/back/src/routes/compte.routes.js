const express = require('express');
const verifierJeton = require('../middlewares/authentification');
const { limiteurConfirmationCompte } = require('../middlewares/limiteurs');
const { validerSuppressionCompte } = require('../middlewares/validation');
const compteControleur = require('../controllers/compte.controleur');

// Rôle : adresses /api/compte, actions sur le compte de l'enseignant connecté.
const routeur = express.Router();

routeur.use(verifierJeton); // toutes ces routes exigent d'être connecté
routeur.use(express.json({ limit: '16kb' })); // corps de requête petit : 16 ko maximum

// SÉCURITÉ — Supprimer son compte redemande le mot de passe, avec un nombre
// d'essais limité (voir limiteurs.js).
routeur.delete('/', limiteurConfirmationCompte, validerSuppressionCompte, compteControleur.supprimer);
// Se déconnecter : révoque TOUS les jetons du compte, sur tous les appareils.
routeur.post('/deconnexion', compteControleur.deconnecter);
// Prolonger la session avant qu'elle n'expire (bouton « Rester connecté » du site).
routeur.get('/session', compteControleur.etatSession);
routeur.post('/session', compteControleur.prolonger);

module.exports = routeur;
