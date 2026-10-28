const jwt = require('jsonwebtoken');
const {
  verifierTentativesCompte, enregistrerEchecConnexion, reinitialiserTentativesCompte,
} = require('../src/middlewares/limitationCompteConnexion');
const { prolongerSession } = require('../src/services/session.service');

const SECRET = 'a'.repeat(64);
beforeAll(() => { process.env.JWT_SECRET = SECRET; });

function tentative(email) {
  const req = { body: { email } };
  const resp = { set: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
  const suite = jest.fn();
  verifierTentativesCompte(req, resp, suite);
  return { resp, suite };
}

test('blocage par compte, même en alternant les adresses IP', () => {
  const email = 'bloque-' + Date.now() + '@example.test';
  for (let i = 0; i < 10; i += 1) {
    expect(tentative(email).suite).toHaveBeenCalled();
    enregistrerEchecConnexion(email);
  }
  const refus = tentative(email);
  expect(refus.resp.status).toHaveBeenCalledWith(429);
  expect(refus.suite).not.toHaveBeenCalled();
  expect(tentative('autre-' + email).suite).toHaveBeenCalled();
  reinitialiserTentativesCompte(email);
  expect(tentative(email).suite).toHaveBeenCalled();
});

test('le renouvellement garde le début de session et ne dépasse jamais 12 heures', () => {
  const maintenant = Math.floor(Date.now() / 1000);
  const debut = maintenant - 11 * 60 * 60;
  const jeton = prolongerSession({
    id_utilisateur: 7, role: 'enseignant', version: 2, debut_session: debut,
  });
  const contenu = jwt.verify(jeton, SECRET);
  expect(contenu.debut_session).toBe(debut);
  expect(contenu.exp).toBeLessThanOrEqual(debut + 12 * 60 * 60);
  expect(contenu.exp).toBeGreaterThan(maintenant);
});

test('une session vieille de 12 heures ne peut plus être renouvelée', () => {
  const debut = Math.floor(Date.now() / 1000) - 12 * 60 * 60;
  expect(() => prolongerSession({
    id_utilisateur: 7, role: 'enseignant', version: 2, debut_session: debut,
  })).toThrow(/Durée maximale/);
});
