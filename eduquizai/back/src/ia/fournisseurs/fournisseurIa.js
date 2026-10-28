const SCHEMA_REPONSE = require('../schemaReponse');
const { SCHEMA_CORRECTION } = require('../schemaCorrection');

// Rôle : classe MÈRE de tous les fournisseurs d'IA (OpenAI, Ollama, simulation).
// Elle fixe ce que tout fournisseur sait faire, et ce que chacun doit écrire.
//
// CHOIX — POO, en 3 idées :
// - HÉRITAGE : chaque fournisseur « extends FournisseurIa » et reçoit son code commun ;
// - POLYMORPHISME : genererQuiz.js appelle fournisseur.genererQuestions() sans
//   savoir lequel est utilisé ; chaque classe fille répond à sa façon ;
// - ENCAPSULATION : les détails propres à chacun (adresse, clé, réglages) sont
//   cachés dans des méthodes privées (#), invisibles de l'extérieur.
// Patrons utilisés : Stratégie (fournisseurs interchangeables) et Patron de
// méthode (genererQuestions() est commune, seule appeler() change).
class FournisseurIa {
  constructor(nom) {
    // Classe « abstraite » : on ne crée jamais un FournisseurIa directement,
    // seulement une de ses classes filles.
    if (new.target === FournisseurIa) {
      throw new TypeError('FournisseurIa est abstraite : créer une classe fille.');
    }
    this.nom = nom; // affiché dans l'interface et l'export (« ollama », « openai »…)
  }

  // Nom du modèle d'IA utilisé. Chaque classe fille DOIT redéfinir cette méthode.
  modele() {
    throw new Error(`${this.nom} : la méthode modele() doit être redéfinie.`);
  }

  // Envoie des consignes à l'IA en imposant un schéma JSON, et renvoie le JSON obtenu.
  // Chaque classe fille qui appelle une vraie IA DOIT redéfinir cette méthode.
  async appeler() {
    throw new Error(`${this.nom} : la méthode appeler() doit être redéfinie.`);
  }

  // Méthode commune : demander des questions de quiz.
  async genererQuestions(consignes) {
    const resultat = await this.appeler(consignes, SCHEMA_REPONSE, 'quiz');
    return resultat?.questions;
  }

  // Méthode commune : demander l'avis de l'IA sur une réponse rédigée.
  async evaluerReponse(consignes) {
    return this.appeler(consignes, SCHEMA_CORRECTION, 'correction');
  }
}

module.exports = FournisseurIa;
