// Tests du journal de sécurité (journalSecurite.service.js et son dépôt) :
// requêtes paramétrées, et une panne du journal ne bloque jamais l'action.

jest.mock('../src/config/postgres', () => ({ query: jest.fn() }));

const pool = require('../src/config/postgres');
const journalSecuriteDepot = require('../src/depots/journalSecurite.depot');
const { tracer, EVENEMENTS } = require('../src/services/journalSecurite.service');

beforeEach(() => {
  pool.query.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('journal de sécurité', () => {
  test('enregistre l\'événement et le compte par une requête paramétrée', async () => {
    pool.query.mockResolvedValue({ rowCount: 1 });

    await tracer(EVENEMENTS.CONNEXION_ECHOUEE, 7);

    expect(pool.query).toHaveBeenCalledWith(
      'INSERT INTO journal_securite (type_evenement, id_utilisateur) VALUES ($1, $2)',
      ['connexion_echouee', 7],
    );
  });

  test('un compte inconnu est enregistré sans identifiant (null), jamais avec l\'email saisi', async () => {
    pool.query.mockResolvedValue({ rowCount: 1 });

    await tracer(EVENEMENTS.CONNEXION_ECHOUEE);

    expect(pool.query.mock.calls[0][1]).toEqual(['connexion_echouee', null]);
  });

  test('une panne de la base n\'est pas remontée : l\'action de l\'utilisateur continue', async () => {
    pool.query.mockRejectedValue(Object.assign(new Error('base arrêtée'), { code: 'ECONNREFUSED' }));

    await expect(tracer(EVENEMENTS.QUIZ_EXPORTE, 7)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      'Journal de sécurité indisponible',
      { evenement: 'quiz_exporte', code: 'ECONNREFUSED' },
    );
  });

  test('la purge supprime les traces de plus de 6 mois (RGPD)', async () => {
    pool.query.mockResolvedValue({ rowCount: 4 });

    const nombre = await journalSecuriteDepot.purgerAnciens();

    expect(nombre).toBe(4);
    expect(pool.query).toHaveBeenCalledWith(
      'DELETE FROM journal_securite WHERE date_evenement < now() - $1::interval',
      ['6 months'],
    );
  });
});
