const express = require('express');
const verifierJeton = require('../middlewares/authentification');
const { validerCours, validerIdentifiantCours } = require('../middlewares/validationCours');
const controleur = require('../controleurs/cours.controleur');
const routeur = express.Router();

routeur.use(verifierJeton);
// Le texte pédagogique peut dépasser 16 ko. Authentifier avant de le parser.
routeur.use(express.json({ limit: '512kb' }));
routeur.get('/', controleur.lister);
routeur.post('/', validerCours, controleur.creer);
routeur.get('/:id', validerIdentifiantCours, controleur.consulter);
routeur.delete('/:id', validerIdentifiantCours, controleur.supprimer);
module.exports = routeur;
