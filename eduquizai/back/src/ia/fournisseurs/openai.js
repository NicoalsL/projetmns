const FournisseurDistant = require('./fournisseurDistant');
const { ErreurIa } = require('../../utilitaires/erreurs');

// Rôle : appeler l'IA d'OpenAI (dans le cloud, payante), en lui imposant de
// répondre avec un JSON qui suit le schéma (« structured outputs »).
// CHOIX — gpt-4o-mini : rapide et peu cher, suffisant pour des quiz.
// Les tests ne l'appellent jamais pour de vrai (appels simulés, gratuits) ;
// vérification réelle à la main : scripts/verifier-openai-reel.js.

const URL_API = 'https://api.openai.com/v1/chat/completions';
const MODELE_PAR_DEFAUT = 'gpt-4o-mini';
// Le CDC vise moins de 5 s ; au-delà de 30 s on abandonne, plutôt que de faire
// attendre l'enseignant sans fin.
const DELAI_MAX_MS = 30000;

// Classe fille de FournisseurDistant (elle-même fille de FournisseurIa) :
// elle hérite de l'envoi HTTP, de la gestion des pannes, de genererQuestions()
// et evaluerReponse(), et redéfinit seulement modele() et appeler().
class FournisseurOpenai extends FournisseurDistant {
  constructor() {
    super('openai', 'Le service d\'IA', DELAI_MAX_MS); // appelle le constructeur de la classe mère
  }

  modele() {
    return process.env.OPENAI_MODELE || MODELE_PAR_DEFAUT;
  }

  // SÉCURITÉ — Méthode PRIVÉE (#) : la clé ne sort jamais de cette classe.
  // Elle reste côté serveur, n'est jamais envoyée au navigateur, et vient
  // du fichier .env, jamais commité dans Git.
  #entetes() {
    return {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
    };
  }

  // Envoie les consignes à l'IA et renvoie le JSON produit.
  // nomSchema : simple étiquette exigée par l'API.
  async appeler({ systeme, utilisateur }, schema, nomSchema) {
    const reponse = await this.envoyer(URL_API, {
      model: this.modele(),
      temperature: 0.4,
      messages: [
        { role: 'system', content: systeme },
        { role: 'user', content: utilisateur },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: nomSchema, strict: true, schema },
      },
    }, this.#entetes());

    const donnees = await reponse.json().catch(() => null);
    const message = donnees?.choices?.[0]?.message;
    if (message?.refusal) {
      throw new ErreurIa('IA_REFUS', 'L\'IA a refusé de répondre');
    }
    return this.lireJson(message?.content);
  }
}

// Une seule instance, partagée par toute l'application.
module.exports = new FournisseurOpenai();
