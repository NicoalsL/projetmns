const service = require('../services/cours.service');

async function creer(requete, reponse, suite) {
  try {
    const cours = await service.creer(requete.body, requete.utilisateur.id_utilisateur);
    reponse.location('/api/cours/' + cours.id_cours).status(201).json(cours);
  } catch (erreur) { suite(erreur); }
}
async function lister(requete, reponse, suite) {
  try { reponse.json(await service.lister(requete.utilisateur.id_utilisateur)); }
  catch (erreur) { suite(erreur); }
}
async function consulter(requete, reponse, suite) {
  try { reponse.json(await service.consulter(requete.idCours, requete.utilisateur.id_utilisateur)); }
  catch (erreur) { suite(erreur); }
}
async function supprimer(requete, reponse, suite) {
  try {
    await service.supprimer(requete.idCours, requete.utilisateur.id_utilisateur);
    reponse.status(204).end();
  } catch (erreur) { suite(erreur); }
}
module.exports = { creer, lister, consulter, supprimer };
