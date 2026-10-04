const nettoyageDepot = require('../depots/nettoyageQuiz.depot');
const quizDepot = require('../depots/quiz.depot');

// Un seul passage par processus ; plusieurs instances peuvent effacer la même
// demande sans danger, car deleteMany et la suppression SQL sont idempotents.
let passageEnCours = null;

async function executerPassage() {
  try {
    const demandes = await nettoyageDepot.lister();
    for (const demande of demandes) {
      await quizDepot.supprimerParCours(demande.id_cours, demande.id_utilisateur);
      await nettoyageDepot.terminer(demande.id_cours, demande.id_utilisateur);
    }
  } catch (erreur) {
    // Une panne conserve la demande en base : prochain passage ou redémarrage.
    console.error('Nettoyage des quiz différé', { code: erreur.code });
  }
}

function reprendreNettoyage() {
  if (!passageEnCours) {
    passageEnCours = executerPassage().finally(() => {
      passageEnCours = null;
    });
  }
  return passageEnCours;
}

module.exports = { reprendreNettoyage };
