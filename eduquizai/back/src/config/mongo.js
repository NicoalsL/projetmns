const { MongoClient } = require('mongodb');

// Connexion à MongoDB (collection quiz). Comme pour PostgreSQL, la connexion
// n'est ouverte qu'au premier besoin, puis réutilisée par toutes les requêtes
// (le client MongoDB gère lui-même un pool de connexions).

const DELAI_CONNEXION_MS = 5000;

let client = null;
let promesseBase = null;

// Ferme un client sans lever d'erreur : on est déjà en train de traiter
// une autre erreur, plus importante, qui doit rester celle remontée.
async function fermerSansErreur(clientAFermer) {
  try {
    await clientAFermer.close();
  } catch {
    // Fermeture impossible : rien de plus à faire.
  }
}

function obtenirBase() {
  // On mémorise la PROMESSE : deux requêtes simultanées au démarrage partagent
  // la même connexion au lieu d'en ouvrir deux.
  if (!promesseBase) {
    client = new MongoClient(process.env.MONGO_URL, { serverSelectionTimeoutMS: DELAI_CONNEXION_MS });
    promesseBase = client.connect()
      .then(async () => {
        const base = client.db();
        // Index sur les champs filtrés à chaque requête (propriétaire + cours).
        await base.collection('quiz').createIndex({ id_utilisateur: 1, id_cours: 1 });
        return base;
      })
      .catch(async (erreur) => {
        // Échec : on oublie la promesse pour retenter à la prochaine requête.
        promesseBase = null;
        // Le client a pu se connecter avant l'échec (ex. création d'index
        // refusée) : on le ferme, sinon chaque nouvel essai laisserait une
        // connexion ouverte de plus.
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

// Utilisé par /pret : MongoDB répond-il ?
async function mongoEstPret() {
  const base = await obtenirBase();
  await base.command({ ping: 1 });
  return true;
}

async function fermerMongo() {
  if (client) await client.close();
}

module.exports = { collectionQuiz, mongoEstPret, fermerMongo };
