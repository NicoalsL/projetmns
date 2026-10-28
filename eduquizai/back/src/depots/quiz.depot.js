const { ObjectId } = require('mongodb');
const { collectionQuiz } = require('../config/mongo');

// Rôle : seul fichier qui parle à la collection MongoDB « quiz ».
// SÉCURITÉ — Chaque requête filtre sur id_utilisateur : impossible de lire,
// modifier ou supprimer le quiz d'un autre.
// Valeurs typées (nombres, ObjectId), jamais d'objet venu du navigateur :
// pas d'injection NoSQL.
// CHOIX — MongoDB pour les quiz : un quiz = un document avec sa liste de
// questions de formes différentes (QCM, vrai/faux, ouverte), lu d'un seul bloc.
// CHOIX — Une classe, comme les dépôts PostgreSQL, mais SANS classe mère : c'est
// le seul dépôt MongoDB, une classe mère n'aurait qu'une seule fille.

class QuizDepot {
  // Document MongoDB -> objet pour l'API (_id devient id_quiz, en texte).
  // Méthode privée (#) : un détail interne du dépôt.
  #formater(document) {
    if (!document) {
      return null;
    }
    const { _id, ...reste } = document;
    // Vieux quiz sans numéro de version : révision 0.
    return { id_quiz: _id.toString(), ...reste, revision: document.revision ?? 0 };
  }

  // Nouveau quiz, révision 1 (+1 à chaque modification).
  async creer(quiz) {
    const collection = await collectionQuiz();
    const document = { ...quiz, revision: 1 };
    const resultat = await collection.insertOne(document);
    return this.#formater({ ...document, _id: resultat.insertedId });
  }

  // Liste résumée : pas les questions, seulement leur nombre (moins de données).
  async listerParCours(idCours, idUtilisateur) {
    const collection = await collectionQuiz();
    const documents = await collection
      .find(
        { id_cours: idCours, id_utilisateur: idUtilisateur },
        {
          projection: {
            titre: 1,
            statut: 1,
            fournisseur: 1,
            date_creation: 1,
            nombre_questions: { $size: '$questions' },
          },
        },
      )
      .sort({ date_creation: -1 })
      .toArray();
    return documents.map((document) => this.#formater(document));
  }

  // Un quiz par son identifiant ET son propriétaire (null sinon).
  async trouverParId(idQuiz, idUtilisateur) {
    const collection = await collectionQuiz();
    const document = await collection.findOne({ _id: new ObjectId(idQuiz), id_utilisateur: idUtilisateur });
    return this.#formater(document);
  }

  // Modifie et renvoie le quiz à jour, ou null s'il n'existe pas pour cet enseignant.
  async mettreAJour(idQuiz, idUtilisateur, modifications, revision) {
    const collection = await collectionQuiz();
    // Verrou optimiste : modifier seulement si la révision est celle attendue, puis +1.
    // Vérifier et modifier en UNE opération : rien ne peut se glisser entre les deux.
    const filtreRevision = revision === 0
      ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] }
      : { revision };
    const document = await collection.findOneAndUpdate(
      { _id: new ObjectId(idQuiz), id_utilisateur: idUtilisateur, ...filtreRevision },
      { $set: modifications, $inc: { revision: 1 } },
      { returnDocument: 'after' },
    );
    return this.#formater(document);
  }

  // Supprime un quiz de cet enseignant ; false si rien n'a été supprimé (-> 404).
  async supprimer(idQuiz, idUtilisateur) {
    const collection = await collectionQuiz();
    const resultat = await collection.deleteOne({ _id: new ObjectId(idQuiz), id_utilisateur: idUtilisateur });
    return resultat.deletedCount === 1;
  }

  // À la suppression d'un cours : effacer tous ses quiz.
  async supprimerParCours(idCours, idUtilisateur) {
    const collection = await collectionQuiz();
    const resultat = await collection.deleteMany({ id_cours: idCours, id_utilisateur: idUtilisateur });
    return resultat.deletedCount;
  }

  // RGPD — Droit à l'effacement : tous les quiz d'un compte supprimé.
  async supprimerParUtilisateur(idUtilisateur) {
    const collection = await collectionQuiz();
    const resultat = await collection.deleteMany({ id_utilisateur: idUtilisateur });
    return resultat.deletedCount;
  }
}

// Une seule instance, partagée par toute l'application.
module.exports = new QuizDepot();
