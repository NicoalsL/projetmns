// Régressions sur les verrous SQL, les révisions Mongo et la reprise après panne.
jest.mock('../src/config/postgres', () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock('../src/config/mongo', () => ({ collectionQuiz: jest.fn() }));
// Contrôle de révocation des sessions simulé (testé dans session.test.js) :
// fonction ordinaire, que jest.resetAllMocks ne réinitialise pas.
jest.mock('../src/services/session.service', () => ({
  sessionEstValide: async () => true,
  revoquerSessions: jest.fn(),
}));

const pool = require('../src/config/postgres');
const { collectionQuiz } = require('../src/config/mongo');
const coursDepot = require('../src/depots/cours.depot');
const quizDepot = require('../src/depots/quiz.depot');
const nettoyageDepot = require('../src/depots/nettoyageQuiz.depot');
const { reprendreNettoyage } = require('../src/services/nettoyageQuiz.service');
const { ObjectId } = require('mongodb');

beforeEach(() => {
  jest.resetAllMocks();
});

describe('verrou de persistance sur le cours', () => {
  test('verrouille le cours du propriétaire avant l’écriture puis valide et libère la connexion', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [{ id_cours: 3 }] }), release: jest.fn() };
    pool.connect.mockResolvedValue(client);
    const action = jest.fn(async () => 'quiz');

    const resultat = await coursDepot.avecCoursVerrouille(3, 7, action);

    expect(resultat).toBe('quiz');
    expect(client.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FOR UPDATE'), [3, 7]);
    expect(client.query.mock.calls[1][0]).toContain('id_utilisateur = $2');
    expect(client.query).toHaveBeenLastCalledWith('COMMIT');
    expect(action).toHaveBeenCalledWith(client);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('un cours supprimé ou appartenant à autrui empêche l’écriture Mongo', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
    pool.connect.mockResolvedValue(client);
    const action = jest.fn();

    const resultat = await coursDepot.avecCoursVerrouille(3, 8, action);

    expect(resultat).toBeNull();
    expect(action).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('une écriture échouée annule la transaction et libère le verrou', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [{ id_cours: 3 }] }), release: jest.fn() };
    pool.connect.mockResolvedValue(client);
    const panne = new Error('panne simulée');

    await expect(coursDepot.avecCoursVerrouille(3, 7, async () => {
      throw panne;
    })).rejects.toBe(panne);

    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});

describe('révisions atomiques MongoDB', () => {
  test('filtre propriétaire et version puis incrémente la révision en même temps que le contenu', async () => {
    const identifiant = new ObjectId();
    const collection = { findOneAndUpdate: jest.fn().mockResolvedValue({ _id: identifiant, revision: 4 }) };
    collectionQuiz.mockResolvedValue(collection);

    const resultat = await quizDepot.mettreAJour(identifiant.toString(), 7, { statut: 'valide' }, 3);

    expect(resultat.revision).toBe(4);
    expect(collection.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: identifiant, id_utilisateur: 7, revision: 3 },
      { $set: { statut: 'valide' }, $inc: { revision: 1 } },
      { returnDocument: 'after' },
    );
  });

  test('un ancien document sans révision se lit en version zéro', async () => {
    const identifiant = new ObjectId();
    collectionQuiz.mockResolvedValue({ findOne: jest.fn().mockResolvedValue({ _id: identifiant }) });

    const resultat = await quizDepot.trouverParId(identifiant.toString(), 7);

    expect(resultat.revision).toBe(0);
  });

  test('la version zéro autorise uniquement zéro ou le champ absent', async () => {
    const collection = { findOneAndUpdate: jest.fn().mockResolvedValue(null) };
    collectionQuiz.mockResolvedValue(collection);

    const resultat = await quizDepot.mettreAJour(new ObjectId().toString(), 7, { titre: 'Relu' }, 0);

    expect(resultat).toBeNull();
    expect(collection.findOneAndUpdate.mock.calls[0][0].$or).toEqual([
      { revision: 0 },
      { revision: { $exists: false } },
    ]);
  });
});

describe('file durable de nettoyage', () => {
  test('une panne Mongo conserve la demande ; le passage suivant la termine après effacement', async () => {
    const journal = jest.spyOn(console, 'error').mockImplementation(() => {});
    const collection = { deleteMany: jest.fn().mockRejectedValueOnce(new Error('panne')) };
    collection.deleteMany.mockResolvedValue({ deletedCount: 2 });
    collectionQuiz.mockResolvedValue(collection);
    pool.query.mockResolvedValue({ rows: [{ id_cours: 3, id_utilisateur: 7 }] });

    await reprendreNettoyage();

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(collection.deleteMany).toHaveBeenCalledWith({ id_cours: 3, id_utilisateur: 7 });

    await reprendreNettoyage();

    expect(pool.query).toHaveBeenLastCalledWith(
      'DELETE FROM nettoyage_quiz WHERE id_cours = $1 AND id_utilisateur = $2',
      [3, 7],
    );
    journal.mockRestore();
  });

  test('le dépôt supprime la demande avec les deux identifiants paramétrés', async () => {
    pool.query.mockResolvedValue({ rowCount: 1 });

    await nettoyageDepot.terminer(3, 7);

    expect(pool.query.mock.calls[0][1]).toEqual([3, 7]);
  });
});
