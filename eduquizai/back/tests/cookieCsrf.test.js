const jwt = require('jsonwebtoken');
const { NOM_SESSION, NOM_CSRF, deposerSession, verifierCsrf, verifierOrigine } = require('../src/middlewares/sessionCookie');

const SECRET = 'b'.repeat(64);
beforeAll(() => { process.env.JWT_SECRET = SECRET; });

function simuler(jetonCookie, csrf) {
  const contenu = {};
  const reponse = { cookie: (nom, valeur) => { contenu[nom] = valeur; } };
  deposerSession(reponse, jetonCookie);
  const req = {
    method: 'POST',
    headers: { cookie: Object.entries(contenu).map(([k,v]) => k + '=' + encodeURIComponent(v)).join('; ') },
    get: jest.fn(nom => nom === 'x-csrf-token' ? csrf ?? '' : undefined),
  };
  const resp = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const suite = jest.fn();
  return { req, resp, suite, contenu };
}

test('cookie de session HttpOnly et cookie CSRF lisible', () => {
  const jeton = jwt.sign({ id_utilisateur: 1 }, SECRET);
  const options = {};
  const resp = { cookie: (nom, _valeur, opts) => { options[nom] = opts; } };
  deposerSession(resp, jeton);
  expect(options[NOM_SESSION]).toMatchObject({ httpOnly: true, sameSite: 'strict' });
  expect(options[NOM_CSRF]).toMatchObject({ httpOnly: false, sameSite: 'strict' });
});

test('refuse les écritures avec cookie sans jeton CSRF', () => {
  const ctx = simuler('jwt-de-test');
  verifierCsrf(ctx.req, ctx.resp, ctx.suite);
  expect(ctx.resp.status).toHaveBeenCalledWith(403);
  expect(ctx.suite).not.toHaveBeenCalled();
});

test('accepte un jeton CSRF signé et lié au cookie JWT', () => {
  const ctx = simuler('jwt-de-test');
  ctx.req.get.mockReturnValue(ctx.contenu[NOM_CSRF]);
  verifierCsrf(ctx.req, ctx.resp, ctx.suite);
  expect(ctx.suite).toHaveBeenCalled();
});

test('refuse un jeton CSRF repris depuis une autre session', () => {
  const a = simuler('jwt-A'), b = simuler('jwt-B');
  b.req.get.mockReturnValue(a.contenu[NOM_CSRF]);
  verifierCsrf(b.req, b.resp, b.suite);
  expect(b.resp.status).toHaveBeenCalledWith(403);
});

test('refuse une origine étrangère', () => {
  const req = { get: jest.fn(() => 'https://attaquant.example'), headers: {} };
  const resp = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const suite = jest.fn();
  verifierOrigine(req, resp, suite);
  expect(resp.status).toHaveBeenCalledWith(403);
});

test('autorise une requête same-origin sans Origin (navigation et restauration)', () => {
  const req = { get: jest.fn(() => undefined), headers: { 'sec-fetch-site': 'same-origin' } };
  const resp = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const suite = jest.fn();
  verifierOrigine(req, resp, suite);
  expect(suite).toHaveBeenCalled();
  expect(resp.status).not.toHaveBeenCalled();
});

test('refuse une requête cross-site sans Origin', () => {
  const req = { get: jest.fn(() => undefined), headers: { 'sec-fetch-site': 'cross-site' } };
  const resp = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const suite = jest.fn();
  verifierOrigine(req, resp, suite);
  expect(resp.status).toHaveBeenCalledWith(403);
  expect(suite).not.toHaveBeenCalled();
});
