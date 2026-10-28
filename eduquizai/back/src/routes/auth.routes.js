const express = require('express');
const authControleur = require('../controleurs/auth.controleur');
const { validerInscription, validerConnexion } = require('../middlewares/validation');
const { verifierTentativesCompte } = require('../middlewares/limitationCompteConnexion');

// Rôle : adresses /api/auth, inscription et connexion (les seules routes sans jeton).
// Leur limite de tentatives et de taille est posée dans app.js.
const routeur = express.Router();

routeur.post('/inscription', validerInscription, authControleur.inscription); // créer un compte
routeur.post('/connexion', validerConnexion, verifierTentativesCompte, authControleur.connexion); // se connecter, reçoit un jeton

module.exports = routeur;
