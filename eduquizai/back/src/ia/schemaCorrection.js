// Schéma JSON imposé au modèle quand il corrige une réponse rédigée à une
// question ouverte (mode « Tester le quiz »). Même principe que
// schemaReponse.js : la forme est contrainte, le contenu est revalidé ensuite
// par genererQuiz.js (evaluerReponse).
const APPRECIATIONS = ['juste', 'partielle', 'fausse'];

const SCHEMA_CORRECTION = {
  type: 'object',
  additionalProperties: false,
  required: ['appreciation', 'commentaire'],
  properties: {
    appreciation: { type: 'string', enum: APPRECIATIONS },
    commentaire: { type: 'string' },
  },
};

module.exports = { SCHEMA_CORRECTION, APPRECIATIONS };
