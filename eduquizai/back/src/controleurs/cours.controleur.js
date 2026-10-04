const coursService = require('../services/cours.service');

// Traduit les requêtes HTTP sur les cours en appels à cours.service.js.
// L'identifiant de l'enseignant vient toujours du JWT (requete.utilisateur),
// déposé par le middleware d'authentification.

async function creer(requete, reponse, suite) {
  try {
    const cours = await coursService.creer(requete.body, requete.utilisateur.id_utilisateur);
    // 201 + en-tête Location : convention REST pour une ressource créée.
    reponse.location('/api/cours/' + cours.id_cours).status(201).json(cours);
  } catch (erreur) {
    suite(erreur);
  }
}

async function lister(requete, reponse, suite) {
  try {
    const cours = await coursService.lister(requete.utilisateur.id_utilisateur);
    reponse.json(cours);
  } catch (erreur) {
    suite(erreur);
  }
}

async function consulter(requete, reponse, suite) {
  try {
    const cours = await coursService.consulter(requete.idCours, requete.utilisateur.id_utilisateur);
    reponse.json(cours);
  } catch (erreur) {
    suite(erreur);
  }
}

async function modifier(requete, reponse, suite) {
  try {
    const cours = await coursService.modifier(requete.idCours, requete.utilisateur.id_utilisateur, requete.body);
    reponse.json(cours);
  } catch (erreur) {
    suite(erreur);
  }
}

async function supprimer(requete, reponse, suite) {
  try {
    await coursService.supprimer(requete.idCours, requete.utilisateur.id_utilisateur);
    // 204 : suppression réussie, aucun contenu à renvoyer.
    reponse.status(204).end();
  } catch (erreur) {
    suite(erreur);
  }
}

module.exports = { creer, lister, consulter, modifier, supprimer };
