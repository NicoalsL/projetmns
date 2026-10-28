const JournalPostgres = require('./journalPostgres');

// Rôle : seul fichier SQL pour la table generation_ia.
// Chaque appel à l'IA y est noté, réussi ou non, avec sa durée : c'est
// l'historique, et la preuve mesurée du critère « < 5 s » du CDC.
// Classe fille de JournalPostgres : elle hérite de la purge RGPD (purgerAnciens).

class GenerationIaDepot extends JournalPostgres {
  constructor() {
    super('generation_ia', 'date_generation');
  }

  // Note un appel à l'IA (réussi ou non) avec sa durée.
  // livraison = 'en_attente' tant que le quiz n'est pas enregistré dans MongoDB.
  // $1::varchar : $1 sert deux fois ; sans type précisé, PostgreSQL refusait
  // la requête (« inconsistent types ») et toute génération échouait (bug corrigé).
  enregistrer({ statut, dureeMs, nombreQuestionsDemandees, idUtilisateur, idCours }) {
    return this.trouverUne(
      `INSERT INTO generation_ia (statut, duree_ms, nombre_questions_demandees, id_utilisateur, id_cours, livraison)
       VALUES ($1::varchar, $2, $3, $4, $5, CASE WHEN $1::varchar = 'succes' THEN 'en_attente' ELSE 'echec' END)
       RETURNING id_generation, date_generation`,
      [statut, dureeMs, nombreQuestionsDemandees, idUtilisateur, idCours],
    );
  }

  // Les 20 derniers appels pour un cours (filtrés sur le propriétaire).
  listerParCours(idCours, idUtilisateur) {
    return this.trouverToutes(
      `SELECT id_generation, date_generation, statut, livraison, duree_ms, nombre_questions_demandees
       FROM generation_ia
       WHERE id_cours = $1 AND id_utilisateur = $2
       ORDER BY date_generation DESC
       LIMIT 20`,
      [idCours, idUtilisateur],
    );
  }

  // Met à jour l'état de livraison : 'enregistre' (quiz bien sauvegardé) ou 'echec'.
  // client : la transaction qui verrouille le cours pendant l'écriture (facultatif).
  async marquerLivraison(idGeneration, idUtilisateur, livraison, client) {
    await this.executer(
      `UPDATE generation_ia SET livraison = $1
       WHERE id_generation = $2 AND id_utilisateur = $3`,
      [livraison, idGeneration, idUtilisateur],
      client,
    );
  }
}

// Une seule instance, partagée par toute l'application.
module.exports = new GenerationIaDepot();
