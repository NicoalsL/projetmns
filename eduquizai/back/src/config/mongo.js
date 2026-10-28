const { MongoClient } = require('mongodb');

// Rôle : connexion à MongoDB, où sont rangés les quiz.
// CHOIX — MongoDB pour les quiz : un quiz = un document avec une liste de
// questions de formes différentes ; en SQL, il faudrait plusieurs tables et jointures.
// Comme pour PostgreSQL, elle n'est ouverte qu'au premier besoin, puis réutilisée
// par toutes les requêtes (MongoDB gère lui-même plusieurs connexions).

const DELAI_CONNEXION_MS = 5000;

let client = null;
let promesseBase = null;

// Ferme une connexion sans lever d'erreur : on est déjà en train de traiter une
// autre erreur, plus importante, et c'est elle qu'on veut remonter.
async function fermerSansErreur(clientAFermer) {
  try {
    await clientAFermer.close();
  } catch {
    // Fermeture impossible : rien de plus à faire.
  }
}

function obtenirBase() {
  // On garde la PROMESSE de connexion : si deux requêtes arrivent en même temps
  // au démarrage, elles attendent la même connexion au lieu d'en ouvrir deux.
  if (!promesseBase) {
    client = new MongoClient(process.env.MONGO_URL, { serverSelectionTimeoutMS: DELAI_CONNEXION_MS });
    promesseBase = client.connect()
      .then(async () => {
        const base = client.db();
        // Index (accélérateur de recherche) sur les champs filtrés à chaque
        // requête : le propriétaire et le cours.
        await base.collection('quiz').createIndex({ id_utilisateur: 1, id_cours: 1 });
        return base;
      })
      .catch(async (erreur) => {
        // Échec : on oublie la promesse, pour réessayer à la prochaine requête.
        promesseBase = null;
        // La connexion a pu s'ouvrir avant l'échec (ex. index refusé) : on la
        // ferme, sinon chaque nouvel essai laisserait une connexion de plus ouverte.
        const clientEnEchec = client;
        client = null;
        await fermerSansErreur(clientEnEchec);
        throw erreur;
      });
  }
  return promesseBase;
}

async function collectionQuiz() {
  const base = await obtenirBase();
  return base.collection('quiz');
}

// Utilisé par la route /pret (contrôle de santé de Docker) : MongoDB répond-il ?
async function mongoEstPret() {
  const base = await obtenirBase();
  await base.command({ ping: 1 });
  return true;
}

// Fermeture propre à l'arrêt du serveur.
async function fermerMongo() {
  if (client) await client.close();
}

module.exports = { collectionQuiz, mongoEstPret, fermerMongo };
