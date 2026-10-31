const { EventEmitter } = require('node:events');
const jwt = require('jsonwebtoken');
const {
  verifierTentativesCompte, enregistrerEchecConnexion, reinitialiserTentativesCompte,
} = require('../src/middlewares/limitationCompteConnexion');
const { prolongerSession } = require('../src/services/session.service');

const SECRET = 'a'.repeat(64);
beforeAll(() => { process.env.JWT_SECRET = SECRET; });

// Fausse réponse Express : un émetteur d'événements, pour pouvoir déclencher « finish ».
function fausseReponse() {
  const resp = new EventEmitter();
  resp.set = jest.fn();
  resp.status = jest.fn().mockReturnValue(resp);
  resp.json = jest.fn();
  return resp;
}

function tentative(email) {
  const req = { body: { email } };
  const resp = fausseReponse();
  const suite = jest.fn();
  verifierTentativesCompte(req, resp, suite);
  return { resp, suite };
}

// Simule une connexion complète : le middleware laisse passer, puis la réponse part.
function connexionTerminee(email, statut) {
  const { resp } = tentative(email);
  resp.statusCode = statut;
  resp.emit('finish');
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

test('le middleware compte lui-même les 401 et remet le compteur à zéro après une réussite', () => {
  const email = 'suivi-' + Date.now() + '@example.test';

  for (let i = 0; i < 10; i += 1) {
    connexionTerminee(email, 401);
  }
  const refus = tentative(email);

  expect(refus.resp.status).toHaveBeenCalledWith(429);

  reinitialiserTentativesCompte(email);
  for (let i = 0; i < 9; i += 1) {
    connexionTerminee(email, 401);
  }
  connexionTerminee(email, 200);
  connexionTerminee(email, 401);

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
