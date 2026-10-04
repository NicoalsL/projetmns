// Tests de l'export CSV d'un quiz (utilitaires/csv.js) : format attendu par
// les tableurs et protection contre l'injection de formules.

const { quizEnCsv, cellule } = require('../src/utilitaires/csv');

const quizExporte = {
  titre: 'Quiz – Biologie',
  questions: [
    {
      type: 'qcm',
      enonce: 'Où se trouve le noyau ?',
      choix: ['Dans la cellule', 'Dans la membrane'],
      bonne_reponse: 0,
      explication: 'Le cours le dit ; page 2.',
    },
    { type: 'vrai_faux', enonce: 'La cellule vit.', bonne_reponse: true, explication: 'Oui.' },
    { type: 'ouverte', enonce: 'Définir "cellule".', bonne_reponse: 'Unité du vivant.', explication: '' },
  ],
};

describe('quizEnCsv', () => {
  test('produit un en-tête puis une ligne par question, séparées par ; et lisibles par Excel', () => {
    const csv = quizEnCsv(quizExporte);

    const lignes = csv.replace('﻿', '').trim().split('\r\n');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lignes).toHaveLength(4);
    expect(lignes[0]).toBe('"Numéro";"Type";"Énoncé";"Choix";"Bonne réponse";"Explication"');
  });

  test('écrit la bonne réponse en clair pour chaque type de question', () => {
    const lignes = quizEnCsv(quizExporte).trim().split('\r\n');

    expect(lignes[1]).toContain('"A - Dans la cellule | B - Dans la membrane";"A - Dans la cellule"');
    expect(lignes[2]).toContain('"Vrai"');
    expect(lignes[3]).toContain('"Unité du vivant."');
  });

  test('double les guillemets et garde le point-virgule à l\'intérieur de la cellule', () => {
    const lignes = quizEnCsv(quizExporte).trim().split('\r\n');

    expect(lignes[3]).toContain('"Définir ""cellule""."');
    expect(lignes[1]).toContain('"Le cours le dit ; page 2."');
  });
});

describe('cellule : protection contre l\'injection de formules', () => {
  test.each([
    ['=HYPERLINK("http://pirate.example")'],
    ['+1+1'],
    ['-2+3'],
    ['@SUM(A1)'],
  ])('neutralise une cellule qui commence comme une formule : %s', (valeurPiegee) => {
    const resultat = cellule(valeurPiegee);

    expect(resultat.startsWith('"\'')).toBe(true);
  });

  test('laisse intact un texte ordinaire', () => {
    expect(cellule('La cellule')).toBe('"La cellule"');
  });
});
