// Rôle : le « moule » imposé à l'IA quand elle corrige une réponse rédigée
// (mode « Tester le quiz »). Même principe que schemaReponse.js : la forme
// est imposée, le contenu est revérifié par genererQuiz.js.
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
