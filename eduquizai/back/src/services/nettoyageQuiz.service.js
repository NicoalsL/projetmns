const nettoyageDepot = require('../depots/nettoyageQuiz.depot');
const quizDepot = require('../depots/quiz.depot');

// Rôle : effacer dans MongoDB les quiz des cours supprimés dans PostgreSQL.
// Problème : deux bases séparées, aucune opération ne peut modifier les deux d'un coup.
// Solution : à chaque suppression de cours, un déclencheur SQL écrit une
// « demande de nettoyage ». Ce service traite les demandes puis les efface.
// MongoDB en panne ? La demande attend en base, traitée plus tard.
// CHOIX — Une « file de tâches » en SQL plutôt qu'un outil en plus (RabbitMQ…) :
// suffisant pour ce projet, et rien de plus à installer.

// Un seul passage à la fois. Refaire deux fois le même effacement est sans
// danger (on dit « idempotent ») : plusieurs serveurs peuvent tourner ensemble.
let passageEnCours = null;

// Pour chaque demande : effacer les quiz, PUIS la demande.
// Dans cet ordre, une panne au milieu ne perd jamais une demande.
async function executerPassage() {
  try {
    const demandes = await nettoyageDepot.lister();
    for (const demande of demandes) {
      await quizDepot.supprimerParCours(demande.id_cours, demande.id_utilisateur);
      await nettoyageDepot.terminer(demande.id_cours, demande.id_utilisateur);
    }
  } catch (erreur) {
    // Panne : la demande reste en base pour le prochain passage.
    console.error('Nettoyage des quiz différé', { code: erreur.code });
  }
}

// Lance un passage, ou renvoie celui déjà en cours.
function reprendreNettoyage() {
  if (!passageEnCours) {
    passageEnCours = executerPassage().finally(() => {
      passageEnCours = null;
    });
  }
  return passageEnCours;
}

module.exports = { reprendreNettoyage };
