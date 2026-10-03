// Tests unitaires des composants de sécurité : contrôle de la configuration,
// limitation des tentatives (force brute) et masquage des erreurs internes.

const verifierEnvironnement = require('../src/config/environnement');
const creerLimiteur = require('../src/middlewares/limitationAuth');
const gestionErreurs = require('../src/middlewares/gestionErreurs');

const configurationValide = {
  JWT_SECRET: 'a'.repeat(64),
  DATABASE_URL: 'postgresql://user:password@localhost/base',
};

// Faux objet "reponse" Express qui enregistre les appels.
function creerFausseReponse() {
  return { set: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('verifierEnvironnement', () => {
  test('accepte une configuration correcte', () => {
    expect(() => verifierEnvironnement(configurationValide)).not.toThrow();
  });

  test.each([
    ['secret JWT vide', { JWT_SECRET: '' }],
    ['secret JWT faible', { JWT_SECRET: 'changeme' }],
    ['URL de base absente', { DATABASE_URL: '' }],
    ['URL de base non PostgreSQL', { DATABASE_URL: 'https://example.com' }],
    ['port non numérique', { PORT: 'abc' }],
    ['port hors limites', { PORT: '65536' }],
    ['origine front avec chemin', { ORIGINE_FRONT: 'https://example.com/path' }],
  ])('refuse : %s', (_description, modification) => {
    expect(() => verifierEnvironnement({ ...configurationValide, ...modification })).toThrow();
  });
});

describe('limitationAuth', () => {
  test('bloque une IP au-delà du maximum, renvoie Retry-After, puis la débloque après la fenêtre', () => {
    let instant = 0;
    const limiter = creerLimiteur({ maximum: 2, fenetreMs: 1000, maintenant: () => instant });
    const suite = jest.fn();
    const reponse = creerFausseReponse();

    limiter({ ip: '127.0.0.1' }, reponse, suite);
    limiter({ ip: '127.0.0.1' }, reponse, suite);
    limiter({ ip: '127.0.0.1' }, reponse, suite); // 3e tentative : bloquée
    expect(suite).toHaveBeenCalledTimes(2);
    expect(reponse.status).toHaveBeenCalledWith(429);
    expect(reponse.set).toHaveBeenCalledWith('Retry-After', '1');

    // Une autre IP n'est pas concernée.
    limiter({ ip: '127.0.0.2' }, reponse, suite);
    expect(suite).toHaveBeenCalledTimes(3);

    // Une fois la fenêtre écoulée, la première IP peut réessayer.
    instant = 1000;
    limiter({ ip: '127.0.0.1' }, reponse, suite);
    expect(suite).toHaveBeenCalledTimes(4);
  });

  test('limite le nombre d\'adresses suivies en mémoire', () => {
    const limiter = creerLimiteur({ maximumAdresses: 1 });
    const suite = jest.fn();
    const reponse = creerFausseReponse();

    limiter({ ip: 'a' }, reponse, suite);
    limiter({ ip: 'b' }, reponse, suite);

    expect(suite).toHaveBeenCalledTimes(1);
    expect(reponse.status).toHaveBeenCalledWith(429);
  });
});

describe('gestionErreurs', () => {
  test.each([400, 413])('conserve le statut client %i', (statut) => {
    const reponse = creerFausseReponse();
    gestionErreurs({ status: statut }, {}, reponse, jest.fn());
    expect(reponse.status).toHaveBeenCalledWith(statut);
  });

  test('ne renvoie jamais le message d\'une erreur interne au client', () => {
    const espionLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    const reponse = creerFausseReponse();

    gestionErreurs(new Error('secret confidentiel'), {}, reponse, jest.fn());

    expect(reponse.status).toHaveBeenCalledWith(500);
    expect(reponse.json).toHaveBeenCalledWith({ erreur: 'Erreur interne du serveur' });
    espionLog.mockRestore();
  });
});
