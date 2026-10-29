// Régressions du stockage PostgreSQL avec questions JSONB et clés étrangères.
jest.mock('../src/config/postgres', () => ({ query: jest.fn(), connect: jest.fn() }));

const fs = require('node:fs');
const path = require('node:path');
const pool = require('../src/config/postgres');
const coursDepot = require('../src/depots/cours.depot');
const quizDepot = require('../src/depots/quiz.depot');

beforeEach(() => jest.resetAllMocks());

describe('intégrité entre cours, quiz et questions JSONB', () => {
  test('le schéma lie le quiz au cours de son propriétaire et supprime par cascade', () => {
    const schema = fs.readFileSync(path.join(__dirname, '../src/config/schema.sql'), 'utf8');
    expect(schema).toContain('questions JSONB NOT NULL');
    expect(schema).toContain('FOREIGN KEY (id_cours, id_utilisateur)');
    expect(schema).toContain('REFERENCES cours(id_cours, id_utilisateur) ON DELETE CASCADE');
  });

  test('crée un quiz et ses questions avec SQL paramétré et JSONB', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_quiz: 'a'.repeat(24), revision: 1 }] });
    const questions = [{ type: 'ouverte', enonce: 'Pourquoi ?', bonne_reponse: 'Pour apprendre.' }];
    const quiz = await quizDepot.creer({
      id_generation: 2, id_cours: 3, id_utilisateur: 7,
      titre: 'SVT', statut: 'brouillon', questions,
      parametres: { niveau: 'lycee' }, date_creation: new Date(),
      date_modification: new Date(), date_validation: null,
    });

    expect(quiz.revision).toBe(1);
    const [sql, valeurs] = pool.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO quiz');
    expect(sql).toContain('::jsonb');
    expect(valeurs[0]).toMatch(/^[a-f0-9]{24}$/);
    expect(JSON.parse(valeurs[9])).toEqual(questions);
  });

  test('la lecture ne renvoie que le quiz du propriétaire', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    expect(await quizDepot.trouverParId('a'.repeat(24), 9)).toBeNull();
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('id_quiz = $1 AND id_utilisateur = $2'),
      ['a'.repeat(24), 9],
    );
  });

  test('une révision périmée ne modifie rien', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    expect(await quizDepot.mettreAJour('a'.repeat(24), 7, { statut: 'valide' }, 3)).toBeNull();
    const [sql, valeurs] = pool.query.mock.calls[0];
    expect(sql).toContain('revision = revision + 1');
    expect(sql).toContain('AND revision = $4');
    expect(valeurs).toEqual(['valide', 'a'.repeat(24), 7, 3]);
  });

  test('le verrou SQL empêche la création sur un cours absent', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
    pool.connect.mockResolvedValue(client);
    const action = jest.fn();
    expect(await coursDepot.avecCoursVerrouille(3, 7, action)).toBeNull();
    expect(client.query.mock.calls[1][0]).toContain('FOR UPDATE');
    expect(action).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
  });
});

describe('sécurité des modifications du quiz', () => {
  test('refuse une colonne interdite avant toute requête SQL', async () => {
    const modifications = { id_utilisateur: 99 };

    await expect(
      quizDepot.mettreAJour('a'.repeat(24), 7, modifications, 1),
    ).rejects.toThrow(TypeError);

    expect(pool.query).not.toHaveBeenCalled();
  });

  test('refuse un objet de modifications vide sans accéder à la base', async () => {
    await expect(quizDepot.mettreAJour('a'.repeat(24), 7, {}, 1)).rejects.toThrow(TypeError);

    expect(pool.query).not.toHaveBeenCalled();
  });

  test('accepte des champs autorisés et encode les questions en JSONB', async () => {
    const questions = [{ type: 'vrai_faux', enonce: 'Vrai ?', bonne_reponse: true }];
    pool.query.mockResolvedValue({ rows: [{ revision: 2 }] });

    await quizDepot.mettreAJour(
      'a'.repeat(24),
      7,
      { titre: 'Titre corrigé', questions, date_validation: null },
      1,
    );

    const [requete, parametres] = pool.query.mock.calls[0];
    expect(requete).toContain('titre = $1');
    expect(requete).toContain('questions = $2::jsonb');
    expect(requete).toContain('date_validation = $3');
    expect(requete).toContain('id_utilisateur = $5');
    expect(requete).toContain('revision = $6');
    expect(parametres).toEqual([
      'Titre corrigé',
      JSON.stringify(questions),
      null,
      'a'.repeat(24),
      7,
      1,
    ]);
  });
});
