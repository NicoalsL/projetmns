// Schéma JSON imposé aux modèles d'IA (OpenAI "structured outputs", Ollama
// "format") : le modèle est contraint de répondre avec un JSON de cette forme,
// ce qui évite de devoir "deviner" le JSON dans du texte libre.
// La réponse reste ensuite revalidée par utilitaires/questions.js : un schéma
// garantit la forme, pas le sens (ex. un index de bonne réponse hors des choix).
//
// En mode strict, OpenAI exige que tous les champs soient "required" ; les
// champs sans objet pour un type de question valent null.
const SCHEMA_REPONSE = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'enonce', 'choix', 'bonne_reponse', 'explication', 'source'],
        properties: {
          type: { type: 'string', enum: ['qcm', 'vrai_faux', 'ouverte'] },
          enonce: { type: 'string' },
          choix: { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }] },
          bonne_reponse: { anyOf: [{ type: 'integer' }, { type: 'boolean' }, { type: 'string' }] },
          explication: { type: 'string' },
          // Phrase du cours, recopiée mot pour mot, qui justifie la réponse :
          // genererQuiz.js vérifie ensuite qu'elle figure vraiment dans le cours.
          source: { type: 'string' },
        },
      },
    },
  },
};

module.exports = SCHEMA_REPONSE;
