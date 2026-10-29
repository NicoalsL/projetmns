// Tests du script historique EJSON -> PostgreSQL, sans données personnelles.
// Toutes les requêtes SQL sont simulées : aucune base n'est modifiée ici.
const { identifierDocument, lireDate, importerQuiz } = require('../scripts/migrer-quiz-mongo-sql');

const IDENTIFIANT = 'a'.repeat(24);

function documentExemple() {
  return {
    _id: { $oid: IDENTIFIANT },
    id_cours: 3,
    id_utilisateur: 7,
    id_generation: 12,
    titre: 'Quiz de test',
    statut: 'valide',
    questions: [{ type: 'vrai_faux', enonce: 'Vrai ?', bonne_reponse: true }],
    date_creation: { $date: '2026-10-01T12:30:00Z' },
    date_modification: { $date: '2026-10-02T12:30:00Z' },
    date_validation: null,
    revision: 3,
  };
}

describe('identification et dates de la migration EJSON', () => {
  test('reconnaît un ancien identifiant MongoDB hexadécimal', () => {
    expect(identifierDocument(documentExemple())).toBe(IDENTIFIANT);
  });

  test('refuse un identifiant EJSON invalide', () => {
    expect(() => identifierDocument({ _id: { $oid: 'id-malforme' } })).toThrow(Error);
  });

  test('reconstruit les dates du format EJSON', () => {
    const date = lireDate({ $date: '2026-10-01T12:30:00Z' });

    expect(date.toISOString()).toBe('2026-10-01T12:30:00.000Z');
    expect(lireDate(null)).toBeNull();
    expect(() => lireDate({ $date: 'date-invalide' })).toThrow(Error);
  });
});

describe('intégrité et reproductibilité de la migration', () => {
  test('conserve les questions JSONB et les liens quand les références existent', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_utilisateur: 7 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_cours: 3, id_utilisateur: 7 }] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 1 }),
    };

    const ajoute = await importerQuiz(client, documentExemple());

    expect(ajoute).toBe(true);
    expect(client.query).toHaveBeenCalledTimes(4);
    const [requeteInsertion, valeurs] = client.query.mock.calls[3];
    expect(requeteInsertion).toContain('INSERT INTO quiz');
    expect(valeurs[0]).toBe(IDENTIFIANT);
    expect(valeurs[1]).toBe(12);
    expect(JSON.parse(valeurs[9])).toEqual(documentExemple().questions);
    expect(valeurs[13]).toBe(3);
  });

  test('ignore un quiz déjà importé sans le dupliquer', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_utilisateur: 7 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_cours: 3, id_utilisateur: 7 }] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id_cours: 3, id_utilisateur: 7 }],
        }),
    };

    expect(await importerQuiz(client, documentExemple())).toBe(false);
    expect(client.query).toHaveBeenCalledTimes(3);
  });

  test('refuse un quiz dont le cours a été supprimé', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rowCount: 0, rows: [] }) };

    await expect(importerQuiz(client, documentExemple())).rejects.toThrow('Cours absent');
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  test('refuse un quiz associé à une génération d’un autre enseignant', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_utilisateur: 7 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_cours: 3, id_utilisateur: 99 }] }),
    };

    await expect(importerQuiz(client, documentExemple())).rejects.toThrow('mauvais cours');
    expect(client.query).toHaveBeenCalledTimes(2);
  });
});
