const express = require('express');
const verifierJeton = require('../middlewares/authentification');
const { limiteurGeneration } = require('../middlewares/limiteursIa');
const { validerCours, validerIdentifiantCours } = require('../middlewares/validationCours');
const { validerGeneration } = require('../middlewares/validationQuiz');
const coursControleur = require('../controleurs/cours.controleur');
const quizControleur = require('../controleurs/quiz.controleur');

// Endpoints /api/cours : tous réservés à un enseignant connecté.
const routeur = express.Router();

// Chaque génération coûte un appel payant à l'IA : 10 par heure et par
// enseignant (compté sur l'identifiant du JWT, pas sur l'adresse IP). Le
// compteur est partagé avec la régénération d'une question (limiteursIa.js).

// Le jeton est vérifié AVANT de lire le corps : un visiteur anonyme ne peut
// pas faire analyser 512 ko de JSON au serveur.
routeur.use(verifierJeton);

// Un texte de cours (50 000 caractères, jusqu'à 4 octets chacun en UTF-8)
// dépasse largement la limite de 16 ko utilisée pour l'authentification.
routeur.use(express.json({ limit: '512kb' }));

routeur.get('/', coursControleur.lister);
routeur.post('/', validerCours, coursControleur.creer);
routeur.get('/:id', validerIdentifiantCours, coursControleur.consulter);
// Modification : mêmes règles de validation que la création.
routeur.put('/:id', validerIdentifiantCours, validerCours, coursControleur.modifier);
routeur.delete('/:id', validerIdentifiantCours, coursControleur.supprimer);

// Quiz d'un cours : liste et génération par l'IA.
routeur.get('/:id/quiz', validerIdentifiantCours, quizControleur.listerPourCours);
routeur.get('/:id/generations', validerIdentifiantCours, quizControleur.historiqueGenerations);
// Validation AVANT le limiteur : une requête mal formée est refusée sans
// consommer une des 10 générations de l'heure.
routeur.post(
  '/:id/quiz',
  validerIdentifiantCours,
  validerGeneration,
  limiteurGeneration,
  quizControleur.generer,
);

module.exports = routeur;
