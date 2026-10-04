// Tests de la révocation des sessions : middleware verifierJeton et
// session.service. Seul le dépôt des utilisateurs est simulé.

jest.mock('../src/depots/utilisateur.depot');

const jwt = require('jsonwebtoken');
const utilisateurDepot = require('../src/depots/utilisateur.depot');
const verifierJeton = require('../src/middlewares/authentification');
const { revoquerSessions } = require('../src/services/session.service');

const SECRET = 'f'.repeat(64);

// Exécute le middleware avec un jeton et renvoie ce qui s'est passé.
async function executer(contenuJeton) {
  const jeton = jwt.sign(contenuJeton, SECRET, { expiresIn: '1h' });
  const requete = { headers: { authorization: 'Bearer ' + jeton } };
  const reponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const suite = jest.fn();
  await verifierJeton(requete, reponse, suite);
  return { requete, reponse, suite };
}

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

beforeEach(() => jest.resetAllMocks());

describe('verifierJeton : révocation des sessions', () => {
  test('accepte un jeton dont la version est celle du compte', async () => {
    utilisateurDepot.trouverVersionJeton.mockResolvedValue(2);

    const resultat = await executer({ id_utilisateur: 7, version: 2 });

    expect(resultat.suite).toHaveBeenCalledWith();
    expect(resultat.requete.utilisateur.id_utilisateur).toBe(7);
    expect(utilisateurDepot.trouverVersionJeton).toHaveBeenCalledWith(7);
  });

  test('refuse un jeton émis avant une déconnexion (version dépassée), même non expiré', async () => {
    utilisateurDepot.trouverVersionJeton.mockResolvedValue(3);

    const resultat = await executer({ id_utilisateur: 7, version: 2 });

    expect(resultat.reponse.status).toHaveBeenCalledWith(401);
    expect(resultat.suite).not.toHaveBeenCalled();
  });

  test('refuse le jeton d\'un compte supprimé', async () => {
    utilisateurDepot.trouverVersionJeton.mockResolvedValue(null);

    const resultat = await executer({ id_utilisateur: 7, version: 0 });

    expect(resultat.reponse.status).toHaveBeenCalledWith(401);
  });

  test('un jeton émis avant ce contrôle (sans version) compte comme version 0', async () => {
    utilisateurDepot.trouverVersionJeton.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    const avantDeconnexion = await executer({ id_utilisateur: 7 });
    const apresDeconnexion = await executer({ id_utilisateur: 7 });

    expect(avantDeconnexion.suite).toHaveBeenCalled();
    expect(apresDeconnexion.reponse.status).toHaveBeenCalledWith(401);
  });

  test.each([
    ['version négative', -1],
    ['version décimale', 1.5],
    ['version en texte', '0'],
  ])('refuse une %s sans interroger la base', async (_description, version) => {
    const resultat = await executer({ id_utilisateur: 7, version });

    expect(resultat.reponse.status).toHaveBeenCalledWith(401);
    expect(utilisateurDepot.trouverVersionJeton).not.toHaveBeenCalled();
  });

  test('base injoignable : erreur transmise (500), pas un 401 qui déconnecterait à tort', async () => {
    const panne = Object.assign(new Error('base arrêtée'), { code: 'ECONNREFUSED' });
    utilisateurDepot.trouverVersionJeton.mockRejectedValue(panne);

    const resultat = await executer({ id_utilisateur: 7, version: 0 });

    expect(resultat.suite).toHaveBeenCalledWith(panne);
    expect(resultat.reponse.status).not.toHaveBeenCalled();
  });
});

describe('revoquerSessions', () => {
  test('incrémente la version du compte', async () => {
    await revoquerSessions(7);

    expect(utilisateurDepot.incrementerVersionJeton).toHaveBeenCalledWith(7);
  });
});
