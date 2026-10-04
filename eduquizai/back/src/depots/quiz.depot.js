const { ObjectId } = require('mongodb');
const { collectionQuiz } = require('../config/mongo');

// Seul fichier qui parle à la collection MongoDB quiz (NoSQL).
// Chaque requête filtre sur id_utilisateur : un enseignant ne peut ni lire,
// ni modifier, ni supprimer le quiz d'un autre, même en connaissant son identifiant.
// Les valeurs sont passées en objets typés (nombres, ObjectId), jamais en
// texte interprété : pas d'injection NoSQL possible.

// Transforme un document MongoDB en objet pour l'API (_id -> id_quiz texte).
function formater(document) {
  if (!document) {
    return null;
  }
  const { _id, ...reste } = document;
  // Les quiz antérieurs au contrôle de concurrence commencent à la révision 0.
  return { id_quiz: _id.toString(), ...reste, revision: document.revision ?? 0 };
}

async function creer(quiz) {
  const collection = await collectionQuiz();
  const document = { ...quiz, revision: 1 };
  const resultat = await collection.insertOne(document);
  return formater({ ...document, _id: resultat.insertedId });
}

// Liste résumée : on ne renvoie pas les questions, seulement leur nombre.
async function listerParCours(idCours, idUtilisateur) {
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
  return documents.map(formater);
}

async function trouverParId(idQuiz, idUtilisateur) {
  const collection = await collectionQuiz();
  const document = await collection.findOne({ _id: new ObjectId(idQuiz), id_utilisateur: idUtilisateur });
  return formater(document);
}

// Modifie et renvoie le quiz à jour, ou null s'il n'existe pas pour cet enseignant.
async function mettreAJour(idQuiz, idUtilisateur, modifications, revision) {
  const collection = await collectionQuiz();
  // Comparaison et incrément dans UNE opération : aucune autre requête ne
  // peut changer le contenu entre la vérification et la validation humaine.
  const filtreRevision = revision === 0
    ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] }
    : { revision };
  const document = await collection.findOneAndUpdate(
    { _id: new ObjectId(idQuiz), id_utilisateur: idUtilisateur, ...filtreRevision },
    { $set: modifications, $inc: { revision: 1 } },
    { returnDocument: 'after' },
  );
  return formater(document);
}

async function supprimer(idQuiz, idUtilisateur) {
  const collection = await collectionQuiz();
  const resultat = await collection.deleteOne({ _id: new ObjectId(idQuiz), id_utilisateur: idUtilisateur });
  return resultat.deletedCount === 1;
}

// Appelé à la suppression d'un cours : ses quiz n'ont plus de raison d'exister.
async function supprimerParCours(idCours, idUtilisateur) {
  const collection = await collectionQuiz();
  const resultat = await collection.deleteMany({ id_cours: idCours, id_utilisateur: idUtilisateur });
  return resultat.deletedCount;
}

// Droit à l'effacement : suppression de tous les quiz d'un compte supprimé.
async function supprimerParUtilisateur(idUtilisateur) {
  const collection = await collectionQuiz();
  const resultat = await collection.deleteMany({ id_utilisateur: idUtilisateur });
  return resultat.deletedCount;
}

module.exports = {
  creer,
  listerParCours,
  trouverParId,
  mettreAJour,
  supprimer,
  supprimerParCours,
  supprimerParUtilisateur,
};
