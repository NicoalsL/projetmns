// Tests du moindre privilège sur PostgreSQL : création du compte de l'API
// (scripts/initialiser-base.js) et contrôle au démarrage (verificationSchema.js).
jest.mock('../src/config/postgres', () => ({ query: jest.fn() }));

const pool = require('../src/config/postgres');
const { compteDepuisUrl, creerCompteApplicatif } = require('../scripts/initialiser-base');
const { compteApiEstRestreint } = require('../src/config/verificationSchema');

// Faux client pg : garde les requêtes envoyées, et imite les fonctions d'échappement.
function creerClient({ compteExiste }) {
  const requetes = [];
  return {
    requetes,
    escapeIdentifier: (texte) => '"' + texte.replace(/"/g, '""') + '"',
    escapeLiteral: (texte) => "'" + texte.replace(/'/g, "''") + "'",
    query: jest.fn(async (sql) => {
      requetes.push(sql);
      if (sql.startsWith('SELECT 1 FROM pg_roles')) {
        return { rowCount: compteExiste ? 1 : 0 };
      }
      if (sql.startsWith('SELECT current_database()')) {
        return { rows: [{ nom: 'eduquizai' }] };
      }
      return {};
    }),
  };
}

describe('compteDepuisUrl', () => {
  test('lit le nom et le mot de passe d’une URL de connexion', () => {
    const compte = compteDepuisUrl('postgresql://eduquizai_app:abc%40123@postgres:5432/eduquizai');

    expect(compte).toEqual({ utilisateur: 'eduquizai_app', motDePasse: 'abc@123' });
  });
});

describe('creerCompteApplicatif', () => {
  test('crée le compte sans aucun pouvoir d’administration', async () => {
    const client = creerClient({ compteExiste: false });

    await creerCompteApplicatif(client, { utilisateur: 'eduquizai_app', motDePasse: 'secret' });

    const creation = client.requetes.find((sql) => sql.includes('ROLE "eduquizai_app"'));
    expect(creation).toMatch(/^CREATE ROLE/);
    expect(creation).toContain('NOSUPERUSER NOCREATEDB NOCREATEROLE');
  });

  test('met seulement à jour le mot de passe si le compte existe déjà', async () => {
    const client = creerClient({ compteExiste: true });

    await creerCompteApplicatif(client, { utilisateur: 'eduquizai_app', motDePasse: 'nouveau' });

    expect(client.requetes.some((sql) => sql.startsWith('ALTER ROLE "eduquizai_app"'))).toBe(true);
    expect(client.requetes.some((sql) => sql.startsWith('CREATE ROLE'))).toBe(false);
  });

  test('donne uniquement la lecture et l’écriture des lignes, et protège le journal de sécurité', async () => {
    const client = creerClient({ compteExiste: false });

    await creerCompteApplicatif(client, { utilisateur: 'eduquizai_app', motDePasse: 'secret' });

    expect(client.requetes).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "eduquizai_app"',
    );
    expect(client.requetes).toContain('REVOKE UPDATE ON journal_securite FROM "eduquizai_app"');
    expect(client.requetes.some((sql) => /GRANT (ALL|CREATE)/.test(sql))).toBe(false);
  });

  test('SÉCURITÉ : un mot de passe piégé reste une simple donnée (apostrophe doublée)', async () => {
    const client = creerClient({ compteExiste: false });

    await creerCompteApplicatif(client, { utilisateur: 'eduquizai_app', motDePasse: "x'; DROP TABLE cours; --" });

    const creation = client.requetes.find((sql) => sql.startsWith('CREATE ROLE'));
    expect(creation).toContain("PASSWORD 'x''; DROP TABLE cours; --'");
  });

  test.each([
    ['majuscules', 'Eduquizai'],
    ['guillemet', 'app"; DROP'],
    ['vide', ''],
  ])('refuse un nom de compte invalide : %s', async (_description, utilisateur) => {
    const client = creerClient({ compteExiste: false });

    await expect(creerCompteApplicatif(client, { utilisateur, motDePasse: 'secret' }))
      .rejects.toThrow('Nom du compte applicatif invalide');
    expect(client.query).not.toHaveBeenCalled();
  });

  test('refuse un compte sans mot de passe', async () => {
    const client = creerClient({ compteExiste: false });

    await expect(creerCompteApplicatif(client, { utilisateur: 'eduquizai_app', motDePasse: '' }))
      .rejects.toThrow('doit avoir un mot de passe');
  });
});

describe('compteApiEstRestreint (contrôle au démarrage)', () => {
  test('vrai pour le compte restreint de l’API', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ restreint: true }] });

    expect(await compteApiEstRestreint()).toBe(true);
  });

  test('faux pour un compte d’administration ou propriétaire des tables', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ restreint: false }] });

    expect(await compteApiEstRestreint()).toBe(false);
  });

  test('faux si le compte est introuvable (aucune ligne)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    expect(await compteApiEstRestreint()).toBe(false);
  });
});
