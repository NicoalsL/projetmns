const express = require('express');
const verifierJeton = require('../middlewares/authentification');
const creerLimiteur = require('../middlewares/limitationAuth');
const { validerSuppressionCompte } = require('../middlewares/validation');
const compteControleur = require('../controleurs/compte.controleur');

// Endpoints /api/compte : actions sur le compte de l'enseignant connecté.
const routeur = express.Router();

// La suppression redemande le mot de passe : on limite les essais pour
// qu'un jeton volé ne permette pas de le deviner par force brute.
const limiteurConfirmation = creerLimiteur({
  maximum: 5,
  fenetreMs: 15 * 60 * 1000,
  obtenirCle: (requete) => 'compte-' + requete.utilisateur.id_utilisateur,
});

routeur.use(verifierJeton);
routeur.use(express.json({ limit: '16kb' }));

routeur.delete('/', limiteurConfirmation, validerSuppressionCompte, compteControleur.supprimer);
// Déconnexion côté serveur : tous les jetons du compte sont révoqués.
routeur.post('/deconnexion', compteControleur.deconnecter);

module.exports = routeur;
