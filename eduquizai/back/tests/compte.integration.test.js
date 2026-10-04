// Tests HTTP du droit à l'effacement (DELETE /api/compte) et de la purge du
// journal des générations (RGPD). Dépôts et base simulés.

jest.mock('../src/depots/utilisateur.depot');
jest.mock('../src/depots/quiz.depot');
jest.mock('../src/depots/journalSecurite.depot');
jest.mock('../src/services/nettoyageQuiz.service');
jest.mock('../src/config/postgres', () => ({ query: jest.fn() }));
// Contrôle de révocation des sessions simulé (testé dans session.test.js) :
// fonction ordinaire, que jest.resetAllMocks ne réinitialise pas.
jest.mock('../src/services/session.service', () => ({
  sessionEstValide: async () => true,
  revoquerSessions: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const utilisateurDepot = require('../src/depots/utilisateur.depot');
const quizDepot = require('../src/depots/quiz.depot');
const { reprendreNettoyage } = require('../src/services/nettoyageQuiz.service');
const pool = require('../src/config/postgres');
const generationIaDepot = jest.requireActual('../src/depots/generationIa.depot');
const app = require('../src/app');

const MOT_DE_PASSE = 'MotDePasse123';
let hacheMotDePasse;
let serveur;
let urlBase;
// Un enseignant différent par test : le limiteur de confirmations (5 essais)
// est partagé entre les tests.
let prochainId = 500;

function supprimerCompte(idUtilisateur, corps) {
  const jeton = jwt.sign({ id_utilisateur: idUtilisateur }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return fetch(urlBase + '/api/compte', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jeton },
    body: JSON.stringify(corps),
  });
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'e'.repeat(64);
  hacheMotDePasse = await bcrypt.hash(MOT_DE_PASSE, 4);
  await new Promise((resolve) => {
    serveur = app.listen(0, '127.0.0.1', resolve);
  });
  urlBase = 'http://127.0.0.1:' + serveur.address().port;
});

afterAll(() => new Promise((resolve) => {
  serveur.close(resolve);
  serveur.closeAllConnections();
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('déconnexion de toutes les sessions (POST /api/compte/deconnexion)', () => {
  test('révoque les jetons du compte du JWT, réponse 204', async () => {
    const { revoquerSessions } = require('../src/services/session.service');
    const id = prochainId++;
    const jeton = jwt.sign({ id_utilisateur: id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const reponse = await fetch(urlBase + '/api/compte/deconnexion', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + jeton },
    });

    expect(reponse.status).toBe(204);
    expect(revoquerSessions).toHaveBeenCalledWith(id);
  });

  test('sans jeton : 401', async () => {
    const reponse = await fetch(urlBase + '/api/compte/deconnexion', { method: 'POST' });

    expect(reponse.status).toBe(401);
  });
});

describe('suppression du compte (DELETE /api/compte)', () => {
  test('supprime le compte SQL puis reprend les demandes durables de nettoyage, réponse 204', async () => {
    const id = prochainId++;
    const ordreAppels = [];
    utilisateurDepot.trouverParId.mockResolvedValue({ id_utilisateur: id, mot_de_passe_hache: hacheMotDePasse });
    reprendreNettoyage.mockImplementation(async () => ordreAppels.push('nettoyage'));
    utilisateurDepot.supprimer.mockImplementation(async () => ordreAppels.push('sql'));

    const reponse = await supprimerCompte(id, { motDePasse: MOT_DE_PASSE });

    expect(reponse.status).toBe(204);
    expect(reprendreNettoyage).toHaveBeenCalled();
    expect(utilisateurDepot.supprimer).toHaveBeenCalledWith(id);
    expect(ordreAppels).toEqual(['sql', 'nettoyage']);
    // Effacement complet, y compris des quiz orphelins antérieurs à la file de nettoyage.
    expect(quizDepot.supprimerParUtilisateur).toHaveBeenCalledWith(id);
  });

  test('une panne MongoDB après la suppression SQL n\'empêche pas l\'effacement du compte (204)', async () => {
    const id = prochainId++;
    utilisateurDepot.trouverParId.mockResolvedValue({ id_utilisateur: id, mot_de_passe_hache: hacheMotDePasse });
    const panneMongo = Object.assign(new Error('panne'), { code: 'ECONNREFUSED' });
    quizDepot.supprimerParUtilisateur.mockRejectedValueOnce(panneMongo);
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const reponse = await supprimerCompte(id, { motDePasse: MOT_DE_PASSE });

    expect(reponse.status).toBe(204);
    expect(console.error).toHaveBeenCalledWith('Effacement des quiz du compte différé', { code: 'ECONNREFUSED' });
    console.error.mockRestore();
  });

  test('mauvais mot de passe : 403 (pas 401, la session reste valide) et rien n\'est supprimé', async () => {
    const id = prochainId++;
    utilisateurDepot.trouverParId.mockResolvedValue({ id_utilisateur: id, mot_de_passe_hache: hacheMotDePasse });

    const reponse = await supprimerCompte(id, { motDePasse: 'incorrect' });

    expect(reponse.status).toBe(403);
    expect(quizDepot.supprimerParUtilisateur).not.toHaveBeenCalled();
    expect(utilisateurDepot.supprimer).not.toHaveBeenCalled();
  });

  test('mot de passe absent : 400 avant toute lecture en base', async () => {
    const reponse = await supprimerCompte(prochainId++, {});

    expect(reponse.status).toBe(400);
    expect(utilisateurDepot.trouverParId).not.toHaveBeenCalled();
  });

  test('si PostgreSQL échoue, aucun nettoyage Mongo ne commence', async () => {
    const id = prochainId++;
    jest.spyOn(console, 'error').mockImplementation(() => {});
    utilisateurDepot.trouverParId.mockResolvedValue({ id_utilisateur: id, mot_de_passe_hache: hacheMotDePasse });
    utilisateurDepot.supprimer.mockRejectedValue(new Error('SQL indisponible'));

    const reponse = await supprimerCompte(id, { motDePasse: MOT_DE_PASSE });

    expect(reponse.status).toBe(500);
    expect(reprendreNettoyage).not.toHaveBeenCalled();
  });

  test('limite à 5 essais de confirmation par compte et par quart d\'heure', async () => {
    const id = prochainId++;
    utilisateurDepot.trouverParId.mockResolvedValue({ id_utilisateur: id, mot_de_passe_hache: hacheMotDePasse });

    for (let essai = 0; essai < 5; essai += 1) {
      expect((await supprimerCompte(id, { motDePasse: 'mauvais' })).status).toBe(403);
    }

    expect((await supprimerCompte(id, { motDePasse: MOT_DE_PASSE })).status).toBe(429);
  });
});

describe('purge du journal des générations', () => {
  test('supprime les entrées plus anciennes que la durée de conservation, passée en paramètre SQL', async () => {
    pool.query.mockResolvedValue({ rowCount: 3 });

    const nombre = await generationIaDepot.purgerAnciennes();

    expect(nombre).toBe(3);
    const [requeteSql, parametres] = pool.query.mock.calls[0];
    expect(requeteSql).toContain('DELETE FROM generation_ia WHERE date_generation < now() - $1::interval');
    expect(parametres).toEqual(['6 months']);
  });
});
