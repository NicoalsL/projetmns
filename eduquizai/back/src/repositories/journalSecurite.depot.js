const JournalPostgres = require('./journalPostgres');

// Rôle : seul fichier SQL pour la table journal_securite.
// Classe fille de JournalPostgres : elle hérite de la purge RGPD (purgerAnciens).

class JournalSecuriteDepot extends JournalPostgres {
  constructor() {
    super('journal_securite', 'date_evenement');
  }

  // Ajoute une ligne : type d'événement + enseignant (la base ajoute la date).
  async enregistrer(typeEvenement, idUtilisateur) {
    await this.executer(
      'INSERT INTO journal_securite (type_evenement, id_utilisateur) VALUES ($1, $2)',
      [typeEvenement, idUtilisateur],
    );
  }
}

// Une seule instance, partagée par toute l'application.
module.exports = new JournalSecuriteDepot();
