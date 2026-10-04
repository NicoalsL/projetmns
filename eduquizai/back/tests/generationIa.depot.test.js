// Tests du dépôt generation_ia : requêtes envoyées à PostgreSQL (pool simulé).
// La validité réelle de la requête est vérifiée sur une vraie base par
// scripts/verifier-coherence-reelle.js et scripts/verifier-quiz-reel.js.

jest.mock('../src/config/postgres', () => ({ query: jest.fn() }));

const pool = require('../src/config/postgres');
const generationIaDepot = require('../src/depots/generationIa.depot');

beforeEach(() => pool.query.mockReset());

describe('generationIa.depot', () => {
  // Régression : sans type explicite, PostgreSQL refusait la requête
  // (« inconsistent types deduced for parameter $1 ») et toute génération
  // de quiz échouait en erreur 500. Les tests à base simulée ne le voyaient pas.
  test('type explicitement le statut, utilisé deux fois dans l\'insertion', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_generation: 1 }] });

    await generationIaDepot.enregistrer({
      statut: 'succes',
      dureeMs: 1200,
      nombreQuestionsDemandees: 3,
      idUtilisateur: 7,
      idCours: 4,
    });

    const [requeteSql, parametres] = pool.query.mock.calls[0];
    expect(requeteSql).not.toMatch(/\$1(?!::varchar)/);
    expect(parametres).toEqual(['succes', 1200, 3, 7, 4]);
  });
});
