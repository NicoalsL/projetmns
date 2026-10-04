// Tests unitaires des règles de structure des questions (utilitaires/questions.js),
// appliquées à la réponse de l'IA comme aux modifications de l'enseignant.

const { normaliserQuestions, repartirTypes, selectionnerSelonRepartition } = require('../src/utilitaires/questions');

const qcmValide = {
  type: 'qcm',
  enonce: 'Quelle est l\'unité de base du vivant ?',
  choix: ['La cellule', 'L\'atome', 'L\'organe', 'Le tissu'],
  bonne_reponse: 0,
  explication: 'Tout être vivant est constitué de cellules.',
};
const vraiFauxValide = {
  type: 'vrai_faux',
  enonce: 'Une bactérie est constituée d\'une seule cellule.',
  bonne_reponse: true,
  explication: 'Les bactéries sont des organismes unicellulaires.',
};
const ouverteValide = {
  type: 'ouverte',
  enonce: 'Qu\'est-ce qu\'une cellule ?',
  choix: null,
  bonne_reponse: 'L\'unité de base de tout être vivant.',
  explication: '',
};

describe('normaliserQuestions', () => {
  test('accepte les trois types et ne garde que les champs prévus', () => {
    const resultat = normaliserQuestions([
      { ...qcmValide, champInconnu: 'ignoré' },
      vraiFauxValide,
      ouverteValide,
    ]);

    expect(resultat).toHaveLength(3);
    expect(resultat[0]).not.toHaveProperty('champInconnu');
    // Une question ouverte n'a pas de champ "choix", même s'il valait null.
    expect(resultat[2]).not.toHaveProperty('choix');
  });

  test('retire les espaces superflus des textes', () => {
    const [question] = normaliserQuestions([{ ...qcmValide, enonce: '  Question ?  ' }]);
    expect(question.enonce).toBe('Question ?');
  });

  test.each([
    ['liste vide', []],
    ['pas une liste', 'texte'],
    ['plus de 20 questions', Array(21).fill(vraiFauxValide)],
  ])('refuse une liste invalide : %s', (_description, questions) => {
    expect(() => normaliserQuestions(questions)).toThrow();
  });

  test.each([
    ['type inconnu', { ...qcmValide, type: 'dessin' }],
    ['énoncé vide', { ...qcmValide, enonce: '  ' }],
    ['énoncé trop long', { ...qcmValide, enonce: 'x'.repeat(501) }],
    ['QCM avec un seul choix', { ...qcmValide, choix: ['La cellule'], bonne_reponse: 0 }],
    ['QCM avec 7 choix', { ...qcmValide, choix: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }],
    ['QCM avec choix en double', { ...qcmValide, choix: ['Cellule', 'cellule', 'Atome'] }],
    ['QCM avec un choix vide', { ...qcmValide, choix: ['Cellule', ' ', 'Atome'] }],
    ['QCM dont la réponse sort des choix', { ...qcmValide, bonne_reponse: 4 }],
    ['QCM dont la réponse est un texte', { ...qcmValide, bonne_reponse: 'La cellule' }],
    ['vrai/faux répondu en texte', { ...vraiFauxValide, bonne_reponse: 'vrai' }],
    ['vrai/faux sans explication', { ...vraiFauxValide, explication: '' }],
    ['question ouverte sans réponse attendue', { ...ouverteValide, bonne_reponse: '' }],
    ['explication trop longue', { ...ouverteValide, explication: 'x'.repeat(1001) }],
  ])('refuse une question invalide : %s', (_description, question) => {
    expect(() => normaliserQuestions([question])).toThrow(/Question 1/);
  });

  test('indique le numéro de la question fautive', () => {
    expect(() => normaliserQuestions([qcmValide, { ...vraiFauxValide, explication: '' }])).toThrow(/^Question 2/);
  });

  // L'interface s'en sert pour marquer le champ précis en erreur (RGAA 11.10).
  test.each([
    ['énoncé vide', { ...qcmValide, enonce: '  ' }, 'enonce'],
    ['choix en double', { ...qcmValide, choix: ['A', 'a', 'B', 'C'] }, 'choix'],
    ['bonne réponse hors des choix', { ...qcmValide, bonne_reponse: 9 }, 'bonne_reponse'],
    ['vrai/faux sans explication', { ...vraiFauxValide, explication: '' }, 'explication'],
    ['réponse attendue vide', { ...ouverteValide, bonne_reponse: '' }, 'bonne_reponse'],
  ])('précise le champ en cause : %s', (_description, question, champAttendu) => {
    let erreur;
    try {
      normaliserQuestions([question]);
    } catch (e) {
      erreur = e;
    }

    expect(erreur).toMatchObject({ numero: 1, champ: champAttendu });
  });
});

describe('repartirTypes', () => {
  test.each([
    [5, ['qcm', 'vrai_faux', 'ouverte'], { qcm: 2, vrai_faux: 2, ouverte: 1 }],
    [6, ['qcm', 'vrai_faux', 'ouverte'], { qcm: 2, vrai_faux: 2, ouverte: 2 }],
    [3, ['qcm'], { qcm: 3 }],
    [7, ['qcm', 'ouverte'], { qcm: 4, ouverte: 3 }],
  ])('%i questions sur %j -> %j', (nombre, types, attendu) => {
    expect(repartirTypes(nombre, types)).toEqual(attendu);
  });
});

describe('selectionnerSelonRepartition', () => {
  const question = (type, numero) => ({ type, enonce: 'Q' + numero });

  test('écarte les types non demandés et conserve l\'ordre', () => {
    const questions = [question('qcm', 1), question('vrai_faux', 2), question('ouverte', 3), question('qcm', 4)];

    const resultat = selectionnerSelonRepartition(questions, { qcm: 2, ouverte: 1 });

    expect(resultat.map((q) => q.enonce)).toEqual(['Q1', 'Q3', 'Q4']);
  });

  test('complète un type manquant avec le surplus d\'un autre type demandé', () => {
    const questions = [question('qcm', 1), question('qcm', 2), question('qcm', 3)];

    expect(selectionnerSelonRepartition(questions, { qcm: 2, ouverte: 1 })).toHaveLength(3);
  });

  test('ne dépasse jamais le nombre total demandé', () => {
    const questions = Array.from({ length: 8 }, (_, index) => question('qcm', index));

    expect(selectionnerSelonRepartition(questions, { qcm: 3 })).toHaveLength(3);
  });
});
