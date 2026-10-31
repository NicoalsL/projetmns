const FournisseurIa = require('./fournisseurIa');
const { ErreurIa } = require('../../utils/erreurs');

// Rôle : classe MÈRE des fournisseurs qu'on joint par le réseau (OpenAI, Ollama).
// Elle hérite de FournisseurIa et AJOUTE ce que les deux font de la même façon :
// envoyer une requête HTTP avec un délai maximal, et traduire chaque panne
// réseau en une ErreurIa avec un code clair.
// La simulation, elle, n'appelle rien sur le réseau : elle hérite directement
// de FournisseurIa, pas de cette classe.
//
//   FournisseurIa
//    ├── FournisseurDistant (abstraite) : HTTP, délai, pannes
//    │    ├── FournisseurOpenai
//    │    └── FournisseurOllama
//    └── FournisseurSimulation

class FournisseurDistant extends FournisseurIa {
  // nom : « openai », « ollama » ; libelle : nom affiché dans les messages
  // (« Le service d'IA », « Le modèle local ») ; delaiMaxMs : au-delà, on abandonne.
  constructor(nom, libelle, delaiMaxMs) {
    super(nom);
    if (new.target === FournisseurDistant) {
      throw new TypeError('FournisseurDistant est abstraite : créer FournisseurOpenai ou FournisseurOllama.');
    }
    this.libelle = libelle;
    this.delaiMaxMs = delaiMaxMs;
  }

  // Envoie un POST JSON et renvoie la réponse HTTP. Toute panne devient une ErreurIa.
  async envoyer(url, corps, entetes = { 'Content-Type': 'application/json' }) {
    let reponse;
    try {
      reponse = await fetch(url, {
        method: 'POST',
        headers: entetes,
        body: JSON.stringify(corps),
        signal: AbortSignal.timeout(this.delaiMaxMs),
      });
    } catch (erreur) {
      if (erreur.name === 'TimeoutError') {
        throw new ErreurIa('IA_DELAI_DEPASSE', `${this.libelle} n'a pas répondu à temps`);
      }
      throw new ErreurIa('IA_INDISPONIBLE', `${this.libelle} est injoignable`);
    }

    // SÉCURITÉ — On ne recopie pas le message d'erreur du service : il peut contenir
    // des détails internes (quota, organisation). Seulement le statut HTTP.
    if (!reponse.ok) {
      throw new ErreurIa('IA_INDISPONIBLE', `${this.libelle} a répondu avec le statut ${reponse.status}`);
    }
    return reponse;
  }

  // Lit le texte JSON produit par l'IA ; s'il est illisible : IA_REPONSE_INVALIDE.
  lireJson(texte) {
    try {
      return JSON.parse(texte);
    } catch {
      throw new ErreurIa('IA_REPONSE_INVALIDE', `La réponse de ${this.nom} n'est pas un JSON exploitable`);
    }
  }
}

module.exports = FournisseurDistant;
