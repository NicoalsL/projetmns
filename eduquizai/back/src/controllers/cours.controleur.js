const coursService = require('../services/cours.service');

// Rôle : traduire les requêtes HTTP sur les cours en appels à cours.service.js.
// L'enseignant vient toujours du jeton (requete.utilisateur), posé par le
// middleware d'authentification.
// Même modèle partout : appeler le service, répondre ; en cas d'erreur, la
// confier à gestionErreurs.js avec suite(erreur).

// POST /api/cours
async function creer(requete, reponse, suite) {
  try {
    const cours = await coursService.creer(requete.body, requete.utilisateur.id_utilisateur);
    // 201 + en-tête Location : convention REST pour une ressource créée.
    reponse.location('/api/cours/' + cours.id_cours).status(201).json(cours);
  } catch (erreur) {
    suite(erreur);
  }
}

// GET /api/cours : seulement les cours de l'enseignant connecté.
async function lister(requete, reponse, suite) {
  try {
    const cours = await coursService.lister(requete.utilisateur.id_utilisateur);
    reponse.json(cours);
  } catch (erreur) {
    suite(erreur);
  }
}

// GET /api/cours/:id (404 si le cours n'existe pas OU est à un autre enseignant).
async function consulter(requete, reponse, suite) {
  try {
    const cours = await coursService.consulter(requete.idCours, requete.utilisateur.id_utilisateur);
    reponse.json(cours);
  } catch (erreur) {
    suite(erreur);
  }
}

// PUT /api/cours/:id
async function modifier(requete, reponse, suite) {
  try {
    const cours = await coursService.modifier(requete.idCours, requete.utilisateur.id_utilisateur, requete.body);
    reponse.json(cours);
  } catch (erreur) {
    suite(erreur);
  }
}

// DELETE /api/cours/:id
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
