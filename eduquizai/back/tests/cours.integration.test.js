// Tests HTTP des cours : vraies requêtes à travers Express, l'authentification,
// la validation, le contrôleur, le service et le dépôt. Seul le pool PostgreSQL
// est simulé : on vérifie les requêtes SQL et les paramètres envoyés à la base,
// sans prétendre tester la base elle-même (voir scripts/verifier-cours-reel.js).

jest.mock('../src/config/postgres', () => ({ query: jest.fn() }));
jest.mock('../src/services/nettoyageQuiz.service');
// La suppression d'un cours supprime aussi ses quiz MongoDB : dépôt simulé.
jest.mock('../src/depots/quiz.depot', () => ({ supprimerParCours: jest.fn().mockResolvedValue(0) }));
// Contrôle de révocation des sessions simulé (testé dans session.test.js) :
// fonction ordinaire, que jest.resetAllMocks ne réinitialise pas.
jest.mock('../src/services/session.service', () => ({
  sessionEstValide: async () => true,
  revoquerSessions: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const pool = require('../src/config/postgres');
const app = require('../src/app');

const ID_ENSEIGNANT = 7;
const coursValide = { titre: 'Biologie', contenuTexte: 'La cellule est une unité du vivant.' };

let serveur;
let urlBase;
let jetonEnseignant;

beforeAll(async () => {
  process.env.JWT_SECRET = 'c'.repeat(64);
  jetonEnseignant = jwt.sign({ id_utilisateur: ID_ENSEIGNANT }, process.env.JWT_SECRET, { expiresIn: '1h' });

  await new Promise((resolve) => {
    serveur = app.listen(0, '127.0.0.1', resolve);
  });
  urlBase = 'http://127.0.0.1:' + serveur.address().port;
});

afterAll(() => new Promise((resolve) => {
  serveur.close(resolve);
  serveur.closeAllConnections();
}));

beforeEach(() => pool.query.mockReset());

// jeton: null permet de tester une requête sans authentification.
function appelerCours(chemin, { method = 'GET', corps, jeton = jetonEnseignant } = {}) {
  const enTetes = { 'Content-Type': 'application/json' };
  if (jeton) {
    enTetes.Authorization = 'Bearer ' + jeton;
  }
  return fetch(urlBase + '/api/cours' + chemin, {
    method,
    headers: enTetes,
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
}

describe('authentification des routes /api/cours', () => {
  test.each(['GET', 'POST', 'DELETE'])('refuse une requête %s sans jeton, avant tout accès SQL', async (method) => {
    const chemin = method === 'DELETE' ? '/1' : '';
    const corps = method === 'POST' ? coursValide : undefined;

    const reponse = await appelerCours(chemin, { method, corps, jeton: null });

    expect(reponse.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('refuse un jeton correctement signé mais sans identifiant utilisateur', async () => {
    const jetonSansIdentite = jwt.sign({}, process.env.JWT_SECRET, { expiresIn: '1h' });

    const reponse = await appelerCours('', { jeton: jetonSansIdentite });

    expect(reponse.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('création de cours', () => {
  test('ignore un propriétaire envoyé par le client et passe le titre en paramètre SQL', async () => {
    const titreMalveillant = "Cours'); DROP TABLE cours; --";
    const coursEnregistre = {
      id_cours: 3,
      titre: titreMalveillant,
      contenu_texte: coursValide.contenuTexte,
      date_creation: '2026-10-03T00:00:00Z',
    };
    pool.query.mockResolvedValue({ rows: [coursEnregistre] });

    const reponse = await appelerCours('', {
      method: 'POST',
      corps: { ...coursValide, titre: titreMalveillant, id_utilisateur: 999 },
    });

    expect(reponse.status).toBe(201);
    expect(reponse.headers.get('location')).toBe('/api/cours/3');
    const [requeteSql, parametres] = pool.query.mock.calls[0];
    // Le titre n'est jamais concaténé dans le SQL…
    expect(requeteSql).not.toContain(titreMalveillant);
    // …et le propriétaire est celui du JWT (7), pas celui envoyé (999).
    expect(parametres).toEqual([titreMalveillant, coursValide.contenuTexte, ID_ENSEIGNANT]);
  });

  test('accepte un cours d\'exactement 50 000 caractères', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_cours: 3 }] });

    const reponse = await appelerCours('', {
      method: 'POST',
      corps: { ...coursValide, contenuTexte: '\t'.repeat(49999) + 'a' },
    });

    expect(reponse.status).toBe(201);
  });

  test.each([
    ['corps nul', null],
    ['corps tableau', []],
    ['corps vide', {}],
    ['titre vide', { ...coursValide, titre: '   ' }],
    ['titre numérique', { ...coursValide, titre: 3 }],
    ['titre trop long', { ...coursValide, titre: 'x'.repeat(201) }],
    ['contenu vide', { ...coursValide, contenuTexte: ' ' }],
    ['contenu objet', { ...coursValide, contenuTexte: {} }],
    ['contenu trop long', { ...coursValide, contenuTexte: 'x'.repeat(50001) }],
    ['caractère nul dans le titre', { ...coursValide, titre: 'a\0b' }],
    ['caractère nul dans le contenu', { ...coursValide, contenuTexte: 'a\0b' }],
  ])('refuse avant SQL : %s', async (_description, corps) => {
    const reponse = await appelerCours('', { method: 'POST', corps });

    expect(reponse.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('refuse un corps trop volumineux (413) avant SQL', async () => {
    const reponse = await appelerCours('', {
      method: 'POST',
      corps: { ...coursValide, contenuTexte: 'x'.repeat(600000) },
    });

    expect(reponse.status).toBe(413);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('compte supprimé entre-temps : 401 au lieu d\'exposer une erreur SQL', async () => {
    const erreurCleEtrangere = Object.assign(new Error('FK'), {
      code: '23503',
      constraint: 'cours_id_utilisateur_fkey',
    });
    pool.query.mockRejectedValue(erreurCleEtrangere);

    const reponse = await appelerCours('', { method: 'POST', corps: coursValide });

    expect(reponse.status).toBe(401);
  });
});

describe('liste et lecture', () => {
  test('la liste filtre sur le propriétaire et ne charge pas les textes', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const reponse = await appelerCours('');

    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual([]);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id_utilisateur = $1'), [ID_ENSEIGNANT]);
    expect(pool.query.mock.calls[0][0]).not.toContain('contenu_texte');
  });

  test('la lecture combine identifiant ET propriétaire dans la même requête', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_cours: 3, titre: 'Biologie' }] });

    const reponse = await appelerCours('/3');

    expect(reponse.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('id_cours = $1 AND id_utilisateur = $2'),
      [3, ID_ENSEIGNANT],
    );
  });

  test.each(['0', '-1', 'abc', '1.2', '2147483648', '01', '1%20OR%201=1'])(
    'refuse l\'identifiant invalide %s avant SQL',
    async (identifiant) => {
      const reponse = await appelerCours('/' + identifiant);

      expect(reponse.status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    },
  );
});

describe('cours absent ou appartenant à un autre enseignant', () => {
  test.each(['GET', 'DELETE'])('%s renvoie le même 404', async (method) => {
    pool.query.mockResolvedValue({ rows: [], rowCount: 0 });

    const reponse = await appelerCours('/4', { method });

    expect(reponse.status).toBe(404);
    expect(await reponse.json()).toEqual({ erreur: 'Cours introuvable' });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('id_cours = $1 AND id_utilisateur = $2'),
      [4, ID_ENSEIGNANT],
    );
  });
});

describe('suppression', () => {
  test('le propriétaire supprime en une seule requête atomique, réponse 204 vide', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_cours: 4 }], rowCount: 1 });

    const reponse = await appelerCours('/4', { method: 'DELETE' });

    expect(reponse.status).toBe(204);
    expect(await reponse.text()).toBe('');
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

describe('modification', () => {
  test('modifie le cours en filtrant sur le propriétaire dans la requête UPDATE elle-même', async () => {
    const coursModifie = {
      id_cours: 4,
      titre: 'Biologie (révisé)',
      contenu_texte: 'Texte révisé.',
      date_creation: 'x',
    };
    pool.query.mockResolvedValue({ rows: [coursModifie], rowCount: 1 });

    const reponse = await appelerCours('/4', {
      method: 'PUT',
      corps: { titre: '  Biologie (révisé)  ', contenuTexte: 'Texte révisé.', id_utilisateur: 99 },
    });

    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual(coursModifie);
    const [requeteSql, parametres] = pool.query.mock.calls[0];
    expect(requeteSql).toContain('WHERE id_cours = $3 AND id_utilisateur = $4');
    // Titre nettoyé, propriétaire issu du JWT (le id_utilisateur du corps est ignoré).
    expect(parametres).toEqual(['Biologie (révisé)', 'Texte révisé.', 4, ID_ENSEIGNANT]);
  });

  test('le cours d\'un autre enseignant (ou absent) renvoie 404', async () => {
    pool.query.mockResolvedValue({ rows: [], rowCount: 0 });

    const reponse = await appelerCours('/4', { method: 'PUT', corps: coursValide });

    expect(reponse.status).toBe(404);
    expect(await reponse.json()).toEqual({ erreur: 'Cours introuvable' });
  });

  test('un titre vide est refusé avant tout accès SQL', async () => {
    const reponse = await appelerCours('/4', { method: 'PUT', corps: { ...coursValide, titre: '   ' } });

    expect(reponse.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
