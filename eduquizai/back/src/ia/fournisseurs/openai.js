// Appel concret à l'API OpenAI (chat/completions) avec "structured outputs" :
// le modèle est contraint de répondre avec un JSON conforme au schéma fourni
// (SCHEMA_REPONSE pour un quiz, SCHEMA_CORRECTION pour corriger une réponse).

const SCHEMA_REPONSE = require('../schemaReponse');
const { SCHEMA_CORRECTION } = require('../schemaCorrection');

const URL_API = 'https://api.openai.com/v1/chat/completions';
const MODELE_PAR_DEFAUT = 'gpt-4o-mini';
// Le CDC vise moins de 5 s pour un quiz simple ; au-delà de 30 s on abandonne
// plutôt que de laisser l'enseignant attendre indéfiniment.
const DELAI_MAX_MS = 30000;

function erreurIa(code, message) {
  return Object.assign(new Error(message), { code });
}

function modele() {
  return process.env.OPENAI_MODELE || MODELE_PAR_DEFAUT;
}

// Envoie les consignes au modèle et renvoie l'objet JSON qu'il a produit.
// nomSchema : simple étiquette exigée par l'API (lettres, chiffres, _).
async function appeler({ systeme, utilisateur }, schema, nomSchema) {
  let reponse;
  try {
    reponse = await fetch(URL_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // La clé reste côté serveur : elle n'est jamais envoyée au navigateur.
        Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: modele(),
        temperature: 0.4,
        messages: [
          { role: 'system', content: systeme },
          { role: 'user', content: utilisateur },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: nomSchema, strict: true, schema },
        },
      }),
      signal: AbortSignal.timeout(DELAI_MAX_MS),
    });
  } catch (erreur) {
    if (erreur.name === 'TimeoutError') {
      throw erreurIa('IA_DELAI_DEPASSE', 'Le service d\'IA n\'a pas répondu à temps');
    }
    throw erreurIa('IA_INDISPONIBLE', 'Le service d\'IA est injoignable');
  }

  // On ne recopie pas le corps de l'erreur OpenAI : il pourrait contenir des
  // détails techniques (quota, organisation) inutiles pour l'utilisateur.
  if (!reponse.ok) {
    throw erreurIa('IA_INDISPONIBLE', `Le service d'IA a répondu avec le statut ${reponse.status}`);
  }

  const donnees = await reponse.json().catch(() => null);
  const message = donnees?.choices?.[0]?.message;
  if (message?.refusal) {
    throw erreurIa('IA_REFUS', 'L\'IA a refusé de répondre');
  }

  try {
    return JSON.parse(message.content);
  } catch {
    throw erreurIa('IA_REPONSE_INVALIDE', 'La réponse de l\'IA n\'est pas un JSON exploitable');
  }
}

async function genererQuestions(consignes) {
  const resultat = await appeler(consignes, SCHEMA_REPONSE, 'quiz');
  return resultat?.questions;
}

async function evaluerReponse(consignes) {
  return appeler(consignes, SCHEMA_CORRECTION, 'correction');
}

module.exports = { nom: 'openai', modele, genererQuestions, evaluerReponse };
