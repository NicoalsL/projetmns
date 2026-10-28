const express = require('express');
const verifierJeton = require('../middlewares/authentification');
const creerLimiteur = require('../middlewares/limitationAuth');
const { validerSuppressionCompte } = require('../middlewares/validation');
const compteControleur = require('../controleurs/compte.controleur');

// Rôle : adresses /api/compte, actions sur le compte de l'enseignant connecté.
const routeur = express.Router();

// SÉCURITÉ — Supprimer son compte redemande le mot de passe. On limite les essais
// (5 par quart d'heure et par compte) : un voleur de jeton ne peut pas deviner
// le mot de passe en essayant des milliers de combinaisons.
const limiteurConfirmation = creerLimiteur({
  maximum: 5,
  fenetreMs: 15 * 60 * 1000,
  obtenirCle: (requete) => 'compte-' + requete.utilisateur.id_utilisateur,
});

routeur.use(verifierJeton); // toutes ces routes exigent d'être connecté
routeur.use(express.json({ limit: '16kb' })); // corps de requête petit : 16 ko maximum

routeur.delete('/', limiteurConfirmation, validerSuppressionCompte, compteControleur.supprimer); // supprimer son compte
// Se déconnecter : révoque TOUS les jetons du compte, sur tous les appareils.
routeur.post('/deconnexion', compteControleur.deconnecter);
// Prolonger la session avant qu'elle n'expire (bouton « Rester connecté » du site).
routeur.get('/session', compteControleur.etatSession);
routeur.post('/session', compteControleur.prolonger);

module.exports = routeur;
