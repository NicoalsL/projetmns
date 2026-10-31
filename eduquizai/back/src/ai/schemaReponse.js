// Rôle : le « moule » imposé à l'IA pour un quiz (schéma JSON).
// CHOIX — Imposer un schéma (OpenAI « structured outputs », Ollama « format »)
// plutôt que demander du texte libre : pas besoin de « deviner » le JSON.
// Mais le schéma garantit la FORME, pas le SENS (ex. bonne réponse hors des
// choix) : la réponse est donc revérifiée par models/quiz.modele.js.
// En mode strict, OpenAI exige que tous les champs soient "required" ; un champ
// inutile pour un type de question vaut null.
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
          // Phrase du cours, mot pour mot, qui justifie la réponse
          // (genererQuiz.js vérifie qu'elle est vraiment dans le cours).
          source: { type: 'string' },
        },
      },
    },
  },
};

module.exports = SCHEMA_REPONSE;
