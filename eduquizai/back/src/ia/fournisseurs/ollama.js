const FournisseurDistant = require('./fournisseurDistant');

// Rôle : appeler une IA LOCALE, servie par Ollama sur la machine.
// CHOIX — Avantages : gratuit, et les cours ne quittent jamais la machine
// (aucun envoi à une entreprise tierce : argument RGPD).
// Inconvénient : la vitesse dépend de la carte graphique. Mesuré (Radeon RX 7700 XT,
// 3 questions) : qwen3:8b ≈ 7,8 s, qwen3:4b ≈ 5 s.
// Détail : documentation/qualite/plan-tests.md, « Performance de la génération ».
// Ollama accepte le même schéma JSON qu'OpenAI (paramètre "format").

// Depuis un conteneur Docker, "host.docker.internal" = l'ordinateur lui-même,
// où tourne Ollama (voir extra_hosts dans docker-compose.yml).
const URL_PAR_DEFAUT = 'http://host.docker.internal:11434';
// CHOIX — qwen3:4b : seul modèle mesuré proche des « < 5 s » du CDC (médiane 4,98 s).
// qwen3:8b cite le cours plus fidèlement (94 % contre 78 %) mais prend 7,8 s ;
// on peut le choisir avec OLLAMA_MODELE si la vitesse compte moins.
const MODELE_PAR_DEFAUT = 'qwen3:4b';
// IA locale plus lente que le cloud, surtout au premier appel (chargement) :
// on attend plus longtemps qu'avec OpenAI.
const DELAI_MAX_MS = 120000;
// Quantité de texte que l'IA peut « lire » d'un coup (en jetons).
// 4096 par défaut : trop peu, le début d'un long cours serait oublié.
// 16384 jetons ≈ 50 000 caractères de français (la taille max d'un cours).
// CHOIX — Taille FIXE : si elle change d'un appel à l'autre, Ollama recharge tout
// le modèle (7 à 9 s mesurées). Une taille adaptée à chaque cours ferait
// gagner ≈ 2 s seulement : pas rentable.
const TAILLE_CONTEXTE = 16384;
// Combien de temps Ollama garde le modèle en mémoire après un appel (5 min par
// défaut). Mesuré : le chargement prend plus de la moitié d'une génération
// « à froid » (9,3 s sur 17,6 s pour 3 questions).
const CONSERVATION_PAR_DEFAUT = '30m';

// Classe fille de FournisseurDistant (elle-même fille de FournisseurIa) :
// elle hérite de l'envoi HTTP, de la gestion des pannes, de genererQuestions()
// et evaluerReponse(), redéfinit modele() et appeler(), et AJOUTE prechauffer()
// (seul Ollama en a besoin).
class FournisseurOllama extends FournisseurDistant {
  constructor() {
    super('ollama', 'Ollama (IA locale)', DELAI_MAX_MS);
  }

  modele() {
    return process.env.OLLAMA_MODELE || MODELE_PAR_DEFAUT;
  }

  // Réglages internes : méthodes PRIVÉES (#), utiles seulement à cette classe.
  #conservation() {
    return process.env.OLLAMA_CONSERVATION || CONSERVATION_PAR_DEFAUT;
  }

  // SÉCURITÉ — L'adresse est vérifiée au démarrage (config/environnement.js) :
  // HTTP seulement sur la machine locale, HTTPS obligatoire ailleurs.
  #urlBase() {
    return process.env.OLLAMA_URL || URL_PAR_DEFAUT;
  }

  // Préchauffage : charge le modèle en mémoire sans rien générer, au démarrage.
  // Le premier enseignant n'attend donc pas le chargement.
  // Même taille de contexte que les vraies générations, sinon Ollama rechargerait.
  async prechauffer() {
    await this.envoyer(this.#urlBase() + '/api/generate', {
      model: this.modele(),
      prompt: '',
      keep_alive: this.#conservation(),
      options: { num_ctx: TAILLE_CONTEXTE },
    });
  }

  // Envoie les consignes au modèle local et renvoie l'objet JSON produit.
  // (Le 3e paramètre, nomSchema, ne sert qu'à OpenAI : Ollama l'ignore.)
  // Un statut 404 vient souvent d'un modèle non téléchargé (commande ollama pull).
  async appeler({ systeme, utilisateur }, schema) {
    const reponse = await this.envoyer(this.#urlBase() + '/api/chat', {
      model: this.modele(),
      stream: false,
      // Pas de « réflexion » écrite avant la réponse : inutile ici, et bien plus lent.
      think: false,
      format: schema,
      keep_alive: this.#conservation(),
      options: { temperature: 0.4, num_ctx: TAILLE_CONTEXTE },
      messages: [
        { role: 'system', content: systeme },
        { role: 'user', content: utilisateur },
      ],
    });

    const donnees = await reponse.json().catch(() => null);
    return this.lireJson(donnees?.message?.content);
  }
}

// Une seule instance, partagée par toute l'application.
module.exports = new FournisseurOllama();
