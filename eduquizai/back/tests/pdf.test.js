// Tests de l'export PDF d'un quiz (utils/pdf.js) : document valide et
// caractères hors du jeu de la police Helvetica remplacés proprement.

const { quizEnPdf, texteCompatible } = require('../src/utils/pdf');

const quizExporte = {
  titre: 'Quiz – Biologie',
  date_validation: '2026-10-03T10:00:00.000Z',
  genere_par: 'IA locale Ollama (qwen3:4b)',
  questions: [
    {
      type: 'qcm',
      enonce: 'Où se trouve le noyau ?',
      choix: ['Dans la cellule', 'Dans la membrane'],
      bonne_reponse: 0,
      explication: 'Le cours le dit.',
      source: 'Le noyau est dans la cellule.',
    },
    { type: 'vrai_faux', enonce: 'La cellule vit.', bonne_reponse: true, explication: 'Oui.' },
    { type: 'ouverte', enonce: 'Définir « cellule ».', bonne_reponse: 'Unité du vivant.', explication: '' },
  ],
};

describe('quizEnPdf', () => {
  test('produit un document PDF complet pour un quiz des trois types', async () => {
    const fichier = await quizEnPdf(quizExporte);

    expect(Buffer.isBuffer(fichier)).toBe(true);
    expect(fichier.subarray(0, 5).toString()).toBe('%PDF-');
    expect(fichier.subarray(-6).toString()).toContain('%%EOF');
  });

  test('produit un PDF balisé en français, lisible par un lecteur d\'écran (RGAA 13.3)', async () => {
    const fichier = await quizEnPdf(quizExporte);

    // Les dictionnaires PDF ne sont pas compressés : on les lit en texte.
    const texte = fichier.toString('latin1');
    expect(texte).toContain('/StructTreeRoot');
    expect(texte).toContain('/Lang (fr-FR)');
    expect(texte).toContain('/Marked true');
    expect(texte).toContain('/DisplayDocTitle true');
  });

  test('ne plante pas sur un émoji ou une lettre grecque dans une question', async () => {
    const quizAvecSymboles = {
      ...quizExporte,
      questions: [{ type: 'vrai_faux', enonce: 'π vaut 3,14 🙂', bonne_reponse: true, explication: 'Oui.' }],
    };

    const fichier = await quizEnPdf(quizAvecSymboles);

    expect(fichier.subarray(0, 5).toString()).toBe('%PDF-');
  });
});

describe('texteCompatible', () => {
  test('conserve les accents, guillemets français, œ et tirets du français', () => {
    const texte = 'Éléphant « œuvre » — l’été, ça ? À Noël.';

    expect(texteCompatible(texte)).toBe(texte);
  });

  test('remplace par « ? » un caractère que la police ne sait pas afficher', () => {
    expect(texteCompatible('π vaut 3,14 🙂')).toBe('? vaut 3,14 ?');
  });

  test('accepte une valeur absente sans erreur', () => {
    expect(texteCompatible(undefined)).toBe('');
  });
});
