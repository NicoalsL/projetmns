const express = require('express');
const verifierJeton = require('../middlewares/authentification');
const { limiteurGeneration } = require('../middlewares/limiteurs');
const { validerCours, validerIdentifiantCours } = require('../middlewares/validationCours');
const { validerGeneration } = require('../middlewares/validationQuiz');
const coursControleur = require('../controllers/cours.controleur');
const quizControleur = require('../controllers/quiz.controleur');

// Rôle : adresses /api/cours, les cours et la génération d'un quiz à partir d'un cours.
// Toutes réservées à un enseignant connecté.
// Chaque route liste ses contrôles dans l'ordre : ils s'exécutent de gauche à droite.
//
// CHOIX — API REST : l'adresse désigne la ressource (/api/cours/42), le verbe
// HTTP dit l'action (GET lire, POST créer, PUT modifier, DELETE supprimer).
const routeur = express.Router();

// SÉCURITÉ — Le jeton est vérifié AVANT de lire le corps de la requête :
// un visiteur non connecté ne peut pas faire analyser 512 ko au serveur.
routeur.use(verifierJeton);

// Un cours peut faire 50 000 caractères (jusqu'à 4 octets chacun) : il faut une
// limite bien plus grande que les 16 ko de la connexion.
routeur.use(express.json({ limit: '512kb' }));

routeur.get('/', coursControleur.lister); // liste de mes cours
routeur.post('/', validerCours, coursControleur.creer); // créer un cours
routeur.get('/:id', validerIdentifiantCours, coursControleur.consulter); // lire un cours
// Modifier un cours : mêmes règles de validation qu'à la création.
routeur.put('/:id', validerIdentifiantCours, validerCours, coursControleur.modifier);
routeur.delete('/:id', validerIdentifiantCours, coursControleur.supprimer); // supprimer

routeur.get('/:id/quiz', validerIdentifiantCours, quizControleur.listerPourCours); // quiz de ce cours
// Historique des appels à l'IA pour ce cours.
routeur.get('/:id/generations', validerIdentifiantCours, quizControleur.historiqueGenerations);

// Générer un quiz avec l'IA. Chaque génération coûte (calcul ou appel payant) :
// 10 par heure et par enseignant, compté sur l'identifiant du jeton, pas sur
// l'adresse IP, et partagé avec la régénération d'une question (limiteurs.js).
// Les validations passent AVANT le limiteur : une demande mal formée est refusée
// sans consommer une des 10 générations de l'heure.
routeur.post(
  '/:id/quiz',
  validerIdentifiantCours,
  validerGeneration,
  limiteurGeneration,
  quizControleur.generer,
);

module.exports = routeur;
