const express = require('express');
const authControleur = require('../controleurs/auth.controleur');
const { validerInscription, validerConnexion } = require('../middlewares/validation');

const routeur = express.Router();

routeur.post('/inscription', validerInscription, authControleur.inscription);
routeur.post('/connexion', validerConnexion, authControleur.connexion);

module.exports = routeur;
