// Appel à un modèle d'IA LOCAL servi par Ollama (API /api/chat).
// Avantages : gratuit, et le texte des cours ne quitte jamais la machine
// (aucun envoi à un service tiers : argument RGPD). Contrepartie : la vitesse
// dépend du matériel (≈ 20 s pour 3 questions avec qwen3:8b sur la carte
// graphique de développement, au-delà de l'objectif de 5 s du CDC).
//
// Le paramètre "format" d'Ollama accepte le même schéma JSON qu'OpenAI : le
// modèle est contraint à cette structure.

const SCHEMA_REPONSE = require('../schemaReponse');
const { SCHEMA_CORRECTION } = require('../schemaCorrection');

// Depuis un conteneur Docker, "host.docker.internal" désigne la machine hôte,
// où Ollama tourne (voir extra_hosts dans docker-compose.yml).
const URL_PAR_DEFAUT = 'http://host.docker.internal:11434';
const MODELE_PAR_DEFAUT = 'qwen3:8b';
// Un modèle local est plus lent qu'une API dans le cloud, surtout au premier
// appel (chargement du modèle en mémoire) : délai plus large que pour OpenAI.
const DELAI_MAX_MS = 120000;
// Taille de la fenêtre de contexte (en jetons). Ollama utilise 4096 par
// défaut, trop peu pour un long cours : au-delà, le début du texte serait
// ignoré par le modèle. 16384 jetons ≈ 50 000 caractères de français.
const TAILLE_CONTEXTE = 16384;

function erreurIa(code, message) {
  return Object.assign(new Error(message), { code });
}

function modele() {
  return process.env.OLLAMA_MODELE || MODELE_PAR_DEFAUT;
}

// Envoie les consignes au modèle local et renvoie l'objet JSON produit.
async function appeler({ systeme, utilisateur }, schema) {
  const urlBase = process.env.OLLAMA_URL || URL_PAR_DEFAUT;

  let reponse;
  try {
    reponse = await fetch(urlBase + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modele(),
        stream: false,
        // Les modèles "à raisonnement" (qwen3…) écriraient d'abord leur
        // réflexion : inutile ici et beaucoup plus lent.
        think: false,
        format: schema,
        options: { temperature: 0.4, num_ctx: TAILLE_CONTEXTE },
        messages: [
          { role: 'system', content: systeme },
          { role: 'user', content: utilisateur },
        ],
      }),
      signal: AbortSignal.timeout(DELAI_MAX_MS),
    });
  } catch (erreur) {
    if (erreur.name === 'TimeoutError') {
      throw erreurIa('IA_DELAI_DEPASSE', 'Le modèle local n\'a pas répondu à temps');
    }
    throw erreurIa('IA_INDISPONIBLE', 'Ollama est injoignable (est-il démarré ?)');
  }

  // 404 : le plus souvent, le modèle n'a pas été téléchargé (ollama pull).
  if (!reponse.ok) {
    throw erreurIa('IA_INDISPONIBLE', `Ollama a répondu avec le statut ${reponse.status}`);
  }

  const donnees = await reponse.json().catch(() => null);
  try {
    return JSON.parse(donnees.message.content);
  } catch {
    throw erreurIa('IA_REPONSE_INVALIDE', 'La réponse du modèle local n\'est pas un JSON exploitable');
  }
}

async function genererQuestions(consignes) {
  const resultat = await appeler(consignes, SCHEMA_REPONSE);
  return resultat?.questions;
}

async function evaluerReponse(consignes) {
  return appeler(consignes, SCHEMA_CORRECTION);
}

module.exports = { nom: 'ollama', modele, genererQuestions, evaluerReponse };
