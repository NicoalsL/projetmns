// Tests d'intégration HTTP de l'authentification : de vraies requêtes passent
// par Express, la validation, bcrypt et JWT. Seule la base est simulée
// (mock), pour des tests rapides qui n'ont pas besoin de PostgreSQL.

jest.mock('../src/depots/utilisateur.depot', () => ({
  trouverParEmail: jest.fn(),
  creer: jest.fn(),
}));
jest.mock('../src/config/postgres', () => ({ query: jest.fn() }));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const depot = require('../src/depots/utilisateur.depot');
const pool = require('../src/config/postgres');
const app = require('../src/app');
const verifierJeton = require('../src/middlewares/authentification');

let serveur;
let urlBase;

const utilisateurTest = { nom: 'Alice', email: 'alice@example.com', motDePasse: 'MotDePasse123' };

beforeAll(async () => {
  process.env.JWT_SECRET = 'b'.repeat(64);

  // Ajoute une route protégée de test devant l'application pour tester le
  // middleware JWT, en attendant les vraies routes protégées (/api/cours).
  const hote = express();
  hote.get('/prive', verifierJeton, (requete, reponse) => {
    reponse.json({ id: requete.utilisateur.id_utilisateur });
  });
  hote.use(app);

  // Port 0 : le système choisit un port libre (pas de conflit avec le dev).
  await new Promise((resolve) => {
    serveur = hote.listen(0, '127.0.0.1', resolve);
  });
  urlBase = 'http://127.0.0.1:' + serveur.address().port;
});

afterAll(async () => {
  await new Promise((resolve) => {
    serveur.close(resolve);
    serveur.closeAllConnections();
  });
});

beforeEach(() => jest.clearAllMocks());

function envoyerJson(route, corps) {
  return fetch(urlBase + route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
}

function appelerAvecJeton(route, jeton) {
  return fetch(urlBase + route, { headers: { Authorization: 'Bearer ' + jeton } });
}

test('inscription : hache le mot de passe et renvoie un jeton signé', async () => {
  depot.trouverParEmail.mockResolvedValue(null);
  depot.creer.mockResolvedValue({ id_utilisateur: 7, nom: 'Alice', email: utilisateurTest.email, role: 'enseignant' });

  const reponse = await envoyerJson('/api/auth/inscription', utilisateurTest);
  expect(reponse.status).toBe(201);

  // Ce qui a été envoyé à la base : une empreinte bcrypt, jamais le mot de passe en clair.
  const donneesInserees = depot.creer.mock.calls[0][0];
  expect(donneesInserees.motDePasseHache).not.toBe(utilisateurTest.motDePasse);
  expect(await bcrypt.compare(utilisateurTest.motDePasse, donneesInserees.motDePasseHache)).toBe(true);

  // Ce qui est renvoyé au client : pas de hash, et un jeton vérifiable.
  const resultat = await reponse.json();
  expect(resultat.utilisateur).toEqual({ id_utilisateur: 7, nom: 'Alice', email: utilisateurTest.email });
  const contenuJeton = jwt.verify(resultat.jeton, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  expect(contenuJeton.id_utilisateur).toBe(7);
});

test('inscription : un doublon détecté par la base renvoie 409', async () => {
  depot.trouverParEmail.mockResolvedValue(null);
  const erreurUnicite = Object.assign(new Error('duplicate'), { code: '23505', constraint: 'utilisateur_email_key' });
  depot.creer.mockRejectedValue(erreurUnicite);

  const reponse = await envoyerJson('/api/auth/inscription', utilisateurTest);
  expect(reponse.status).toBe(409);
});

test('inscription : des données invalides sont refusées avant d\'atteindre la base', async () => {
  const reponse = await envoyerJson('/api/auth/inscription', { ...utilisateurTest, motDePasse: {} });

  expect(reponse.status).toBe(400);
  expect(depot.trouverParEmail).not.toHaveBeenCalled();
});

test('connexion : réussit avec le bon mot de passe, message identique si email inconnu ou mot de passe faux', async () => {
  const hache = await bcrypt.hash(utilisateurTest.motDePasse, 4);
  depot.trouverParEmail.mockResolvedValue({
    id_utilisateur: 7, nom: 'Alice', email: utilisateurTest.email, role: 'enseignant', mot_de_passe_hache: hache,
  });

  const correcte = await envoyerJson('/api/auth/connexion', utilisateurTest);
  expect(correcte.status).toBe(200);

  const mauvaisMotDePasse = await envoyerJson('/api/auth/connexion', { ...utilisateurTest, motDePasse: 'incorrect' });
  expect(mauvaisMotDePasse.status).toBe(401);
  const messageMauvaisMotDePasse = await mauvaisMotDePasse.json();

  depot.trouverParEmail.mockResolvedValue(null);
  const emailInconnu = await envoyerJson('/api/auth/connexion', utilisateurTest);
  expect(emailInconnu.status).toBe(401);
  // Même message : on ne révèle pas si l'email existe.
  expect(await emailInconnu.json()).toEqual(messageMauvaisMotDePasse);
});

test('JSON mal formé : 400 ; corps trop volumineux : 413', async () => {
  const jsonCasse = await fetch(urlBase + '/api/auth/connexion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  expect(jsonCasse.status).toBe(400);

  const tropGros = await envoyerJson('/api/auth/connexion', { ...utilisateurTest, extra: 'x'.repeat(20000) });
  expect(tropGros.status).toBe(413);
});

test('une route inexistante renvoie un 404 en JSON', async () => {
  const reponse = await fetch(urlBase + '/api/inexistante');

  expect(reponse.status).toBe(404);
  expect(await reponse.json()).toEqual({ erreur: 'Ressource introuvable' });
});

test('/pret : 200 si le schéma existe, 503 sinon ou si la base est injoignable', async () => {
  pool.query
    .mockResolvedValueOnce({ rows: [{ pret: true }] })
    .mockResolvedValueOnce({ rows: [{ pret: false }] })
    .mockRejectedValueOnce(new Error('Base injoignable'));

  expect((await fetch(urlBase + '/pret')).status).toBe(200);
  expect((await fetch(urlBase + '/pret')).status).toBe(503);
  expect((await fetch(urlBase + '/pret')).status).toBe(503);
});

test('route protégée : refuse un jeton absent, expiré ou signé avec un autre secret', async () => {
  expect((await fetch(urlBase + '/prive')).status).toBe(401);

  const jetonExpire = jwt.sign({ id_utilisateur: 7 }, process.env.JWT_SECRET, { expiresIn: -1 });
  expect((await appelerAvecJeton('/prive', jetonExpire)).status).toBe(401);

  const jetonFalsifie = jwt.sign({ id_utilisateur: 7 }, 'autre-secret');
  expect((await appelerAvecJeton('/prive', jetonFalsifie)).status).toBe(401);

  const jetonValide = jwt.sign({ id_utilisateur: 7 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const reponse = await appelerAvecJeton('/prive', jetonValide);
  expect(reponse.status).toBe(200);
  expect(await reponse.json()).toEqual({ id: 7 });
});
