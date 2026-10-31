// Tests de la programmation orientée objet : les 4 hiérarchies de classes du back
// (erreurs, questions, dépôts, fournisseurs d'IA), les classes abstraites,
// l'héritage et l'encapsulation (champs et méthodes privés #).
jest.mock('../src/config/postgres', () => ({ query: jest.fn(), connect: jest.fn() }));

const pool = require('../src/config/postgres');
const erreurs = require('../src/utils/erreurs');
const { Question, QuestionQcm, QuestionVraiFaux, QuestionOuverte } = require('../src/models/question.modele');
const DepotPostgres = require('../src/repositories/depotPostgres');
const JournalPostgres = require('../src/repositories/journalPostgres');
const coursDepot = require('../src/repositories/cours.depot');
const utilisateurDepot = require('../src/repositories/utilisateur.depot');
const quizDepot = require('../src/repositories/quiz.depot');
const generationIaDepot = require('../src/repositories/generationIa.depot');
const journalSecuriteDepot = require('../src/repositories/journalSecurite.depot');
const FournisseurIa = require('../src/ai/providers/fournisseurIa');
const FournisseurDistant = require('../src/ai/providers/fournisseurDistant');
const fournisseurOpenai = require('../src/ai/providers/openai');
const fournisseurOllama = require('../src/ai/providers/ollama');
const fournisseurSimulation = require('../src/ai/providers/simulation');
const { LimiteurDeRequetes } = require('../src/middlewares/limiteurRequetes');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Hiérarchie des erreurs', () => {
  test('ErreurMetier est abstraite : on utilise toujours une classe fille', () => {
    expect(() => new erreurs.ErreurMetier('message', 400)).toThrow(TypeError);
  });

  test.each([
    ['ErreurDonneesInvalides', 400],
    ['ErreurNonAuthentifie', 401],
    ['ErreurAccesRefuse', 403],
    ['ErreurIntrouvable', 404],
    ['ErreurConflit', 409],
    ['ErreurServiceIa', 502],
  ])('%s hérite de ErreurMetier et de Error, avec le statut %i', (nomClasse, statut) => {
    const erreur = new erreurs[nomClasse]('Message pour l’utilisateur');

    expect(erreur).toBeInstanceOf(erreurs.ErreurMetier);
    expect(erreur).toBeInstanceOf(Error);
    expect(erreur).toMatchObject({ name: nomClasse, status: statut, message: 'Message pour l’utilisateur' });
  });

  test('ErreurQuestion est une erreur de données (400) qui indique la question et le champ', () => {
    const erreur = new erreurs.ErreurQuestion(3, 'format invalide', 'enonce');

    expect(erreur).toBeInstanceOf(erreurs.ErreurDonneesInvalides);
    expect(erreur.message).toBe('Question 3 : format invalide');
    expect(erreur).toMatchObject({ status: 400, code: 'QUESTION_INVALIDE', numero: 3, champ: 'enonce' });
  });

  test('ErreurIa est une panne technique, pas une erreur métier montrable', () => {
    const erreur = new erreurs.ErreurIa('IA_INDISPONIBLE', 'Ollama est injoignable');

    expect(erreur).toBeInstanceOf(Error);
    expect(erreur).not.toBeInstanceOf(erreurs.ErreurMetier);
    expect(erreur.code).toBe('IA_INDISPONIBLE');
  });
});

describe('Hiérarchie des questions', () => {
  test('Question est abstraite', () => {
    expect(() => new Question({ type: 'qcm', enonce: 'x', explication: '' })).toThrow(TypeError);
  });

  test.each([
    [{ type: 'qcm', enonce: 'Capitale ?', choix: ['Paris', 'Lyon'], bonne_reponse: 0 }, QuestionQcm],
    [{ type: 'vrai_faux', enonce: 'Vrai ?', bonne_reponse: true, explication: 'Car.' }, QuestionVraiFaux],
    [{ type: 'ouverte', enonce: 'Pourquoi ?', bonne_reponse: 'Parce que.' }, QuestionOuverte],
  ])('depuisDonnees crée la bonne classe fille (%#)', (donnees, ClasseAttendue) => {
    const question = Question.depuisDonnees(donnees, 1);

    expect(question).toBeInstanceOf(ClasseAttendue);
    expect(question).toBeInstanceOf(Question);
  });

  test('SÉCURITÉ : un type piégé (« constructor », « __proto__ ») ne crée aucune classe', () => {
    for (const type of ['constructor', '__proto__', 'toString']) {
      expect(() => Question.depuisDonnees({ type, enonce: 'x' }, 1)).toThrow(erreurs.ErreurQuestion);
    }
  });
});

describe('Hiérarchie des dépôts', () => {
  test('DepotPostgres et JournalPostgres sont abstraites', () => {
    expect(() => new DepotPostgres()).toThrow(TypeError);
    expect(() => new JournalPostgres('table', 'date')).toThrow(TypeError);
  });

  test.each([
    [coursDepot],
    [utilisateurDepot],
    [quizDepot],
  ])('%#. les dépôts SQL héritent de DepotPostgres', (depot) => {
    expect(depot).toBeInstanceOf(DepotPostgres);
    expect(depot).not.toBeInstanceOf(JournalPostgres);
  });

  test('les deux journaux héritent de JournalPostgres, donc aussi de DepotPostgres', () => {
    expect(generationIaDepot).toBeInstanceOf(JournalPostgres);
    expect(journalSecuriteDepot).toBeInstanceOf(JournalPostgres);
    expect(generationIaDepot).toBeInstanceOf(DepotPostgres);
  });

  test('la purge RGPD héritée vise la bonne table, avec la durée en paramètre', async () => {
    pool.query.mockResolvedValue({ rowCount: 2 });

    const nombre = await generationIaDepot.purgerAnciens();

    expect(nombre).toBe(2);
    expect(pool.query).toHaveBeenCalledWith(
      'DELETE FROM generation_ia WHERE date_generation < now() - $1::interval',
      ['6 months'],
    );
  });

  test('avecTransaction annule tout (ROLLBACK) et rend la connexion en cas d’erreur', async () => {
    const client = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
    pool.connect.mockResolvedValue(client);

    const appel = coursDepot.avecTransaction(async () => {
      throw new Error('panne');
    });

    await expect(appel).rejects.toThrow('panne');
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });
});

describe('Hiérarchie des fournisseurs d’IA', () => {
  test('FournisseurIa et FournisseurDistant sont abstraites', () => {
    expect(() => new FournisseurIa('test')).toThrow(TypeError);
    expect(() => new FournisseurDistant('test', 'Test', 1000)).toThrow(TypeError);
  });

  test('OpenAI et Ollama sont des fournisseurs DISTANTS ; la simulation non', () => {
    expect(fournisseurOpenai).toBeInstanceOf(FournisseurDistant);
    expect(fournisseurOllama).toBeInstanceOf(FournisseurDistant);
    expect(fournisseurSimulation).not.toBeInstanceOf(FournisseurDistant);
    expect(fournisseurSimulation).toBeInstanceOf(FournisseurIa);
  });

  test('une classe fille qui oublie modele() ou appeler() échoue clairement', async () => {
    class FournisseurIncomplet extends FournisseurIa {}

    const fournisseur = new FournisseurIncomplet('incomplet');

    expect(() => fournisseur.modele()).toThrow('modele() doit être redéfinie');
    await expect(fournisseur.genererQuestions({})).rejects.toThrow('appeler() doit être redéfinie');
  });

  test('genererQuestions(), héritée, appelle la méthode appeler() de la classe fille', async () => {
    class FournisseurDeTest extends FournisseurIa {
      modele() {
        return 'modele-test';
      }

      async appeler(consignes, schema, nomSchema) {
        return { questions: [{ nomSchema }] };
      }
    }

    const questions = await new FournisseurDeTest('test').genererQuestions({});

    expect(questions).toEqual([{ nomSchema: 'quiz' }]);
  });

  test('seul Ollama ajoute la méthode prechauffer()', () => {
    expect(typeof fournisseurOllama.prechauffer).toBe('function');
    expect(fournisseurOpenai.prechauffer).toBeUndefined();
  });
});

describe('Encapsulation (champs et méthodes privés #)', () => {
  test('la clé API et l’adresse d’Ollama ne sont pas visibles de l’extérieur', () => {
    expect(Object.keys(fournisseurOpenai)).toEqual(['nom', 'libelle', 'delaiMaxMs']);
    expect(fournisseurOpenai.entetes).toBeUndefined();
    expect(fournisseurOllama.urlBase).toBeUndefined();
  });

  test('les compteurs d’un limiteur ne sont modifiables que par lui', () => {
    const limiteur = new LimiteurDeRequetes({ maximum: 1 });

    expect(Object.keys(limiteur)).toEqual([]);
    expect(limiteur.tentatives).toBeUndefined();
  });
});
