const DepotPostgres = require('./depotPostgres');

// Rôle : seul fichier SQL pour la table nettoyage_quiz, la liste des quiz
// MongoDB à effacer (voir services/nettoyageQuiz.service.js).
// Classe fille de DepotPostgres.

class NettoyageQuizDepot extends DepotPostgres {
  // Les 100 plus anciennes demandes (remplies par le déclencheur SQL).
  // Seulement les identifiants utiles pour effacer dans MongoDB.
  lister() {
    return this.trouverToutes(
      `SELECT id_cours, id_utilisateur FROM nettoyage_quiz
       ORDER BY date_demande LIMIT 100`,
    );
  }

  // Demande traitée : on la retire de la file.
  async terminer(idCours, idUtilisateur) {
    await this.executer(
      'DELETE FROM nettoyage_quiz WHERE id_cours = $1 AND id_utilisateur = $2',
      [idCours, idUtilisateur],
    );
  }
}

// Une seule instance, partagée par toute l'application.
module.exports = new NettoyageQuizDepot();
