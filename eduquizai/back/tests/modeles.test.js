// Tests du comportement des modèles métier : Question (et ses classes filles),
// Cours, Quiz et Utilisateur.
const bcrypt = require('bcryptjs');
const { Question, QuestionVraiFaux } = require('../src/modeles/question.modele');
const Cours = require('../src/modeles/cours.modele');
const Quiz = require('../src/modeles/quiz.modele');
const Utilisateur = require('../src/modeles/utilisateur.modele');

const QCM = { type: 'qcm', enonce: 'Capitale de la France ?', choix: ['Lyon', 'Paris'], bonne_reponse: 1 };
const VRAI_FAUX = { type: 'vrai_faux', enonce: 'Paris est en France.', bonne_reponse: true, explication: 'Oui.' };
const OUVERTE = { type: 'ouverte', enonce: 'Pourquoi ?', bonne_reponse: 'Parce que.' };

describe('Question (polymorphisme)', () => {
  test.each([
    [QCM, 'QCM', 'B - Paris', ['A - Lyon', 'B - Paris']],
    [VRAI_FAUX, 'Vrai ou faux', 'Vrai', []],
    [OUVERTE, 'Question ouverte', 'Parce que.', []],
  ])('chaque type répond à sa façon (%#)', (donnees, libelle, bonneReponse, choix) => {
    const question = Question.depuisDonnees(donnees, 1);

    expect(question.libelleType()).toBe(libelle);
    expect(question.bonneReponseEnTexte(' - ')).toBe(bonneReponse);
    expect(question.choixEnTexte(' - ')).toEqual(choix);
  });

  test('versDocument ne garde que les données prévues pour le type', () => {
    const question = Question.depuisDonnees({ ...QCM, role: 'admin', enonce: '  Capitale ?  ' }, 1);

    expect(question.versDocument()).toEqual({
      type: 'qcm',
      enonce: 'Capitale ?',
      explication: '',
      choix: ['Lyon', 'Paris'],
      bonne_reponse: 1,
    });
  });

  test('depuisDocument recrée la bonne classe à partir d’un document enregistré', () => {
    const question = Question.depuisDocument(VRAI_FAUX);

    expect(question).toBeInstanceOf(QuestionVraiFaux);
    expect(question.bonneReponseEnTexte()).toBe('Vrai');
  });

  test.each([
    ['« Faux » écrit en texte', { bonne_reponse: 'Faux' }, false],
    ['numéro de choix', { bonne_reponse: 0, choix: ['Vrai', 'Faux'] }, true],
  ])('QuestionVraiFaux répare une réponse de l’IA : %s', (_description, modification, attendu) => {
    const reparee = QuestionVraiFaux.reparerReponseIa({ ...VRAI_FAUX, ...modification });

    expect(reparee.bonne_reponse).toBe(attendu);
  });
});

describe('Cours', () => {
  test('un cours de 3 vraies phrases et 300 caractères suffit pour un quiz', () => {
    const phrase = 'La photosynthèse permet aux plantes de produire leur propre énergie à partir de la lumière. ';
    const cours = new Cours({ id_cours: 1, titre: 'Biologie', contenu_texte: phrase.repeat(4) });

    expect(cours.nombreDePhrases()).toBe(4);
    expect(cours.estAssezLongPourUnQuiz()).toBe(true);
  });

  test('un cours trop court est refusé (cas réel : l’IA inventait des questions)', () => {
    const cours = new Cours({ id_cours: 1, titre: 'Biologie', contenu_texte: 'La cellule.' });

    expect(cours.estAssezLongPourUnQuiz()).toBe(false);
  });
});

describe('Quiz', () => {
  const document = {
    id_quiz: 'a'.repeat(24),
    titre: 'Quiz – Géographie',
    statut: 'brouillon',
    fournisseur: 'ollama',
    modele: 'qwen3:4b',
    date_validation: null,
    questions: [{ ...QCM, source: 'Paris est la capitale.', source_trouvee: true }],
  };

  test('seul un quiz validé est exportable (règle éthique du CDC)', () => {
    expect(new Quiz(document).estExportable()).toBe(false);
    expect(new Quiz({ ...document, statut: Quiz.STATUT_VALIDE }).estExportable()).toBe(true);
  });

  test('le contenu exporté indique l’origine et retire les données de relecture', () => {
    const contenu = new Quiz(document).contenuExport();

    expect(contenu.genere_par).toBe('IA locale Ollama (qwen3:4b)');
    expect(contenu.questions[0]).not.toHaveProperty('source_trouvee');
    expect(contenu).not.toHaveProperty('id_quiz');
  });

  test('question(numero) renvoie null pour un numéro inexistant', () => {
    expect(new Quiz(document).question(5)).toBeNull();
  });
});

describe('Utilisateur', () => {
  test('SÉCURITÉ : l’empreinte du mot de passe est privée, invisible en JSON', async () => {
    const empreinte = await bcrypt.hash('motdepasse-test', 4);
    const utilisateur = new Utilisateur({
      id_utilisateur: 7,
      nom: 'Alice',
      email: 'a@x.fr',
      mot_de_passe_hache: empreinte,
    });

    expect(JSON.stringify(utilisateur)).not.toContain(empreinte);
    expect(utilisateur.mot_de_passe_hache).toBeUndefined();
    expect(await utilisateur.motDePasseCorrespond('motdepasse-test')).toBe(true);
    expect(await utilisateur.motDePasseCorrespond('autre')).toBe(false);
  });

  test('le profil public ne contient que l’identifiant, le nom et l’email', () => {
    const utilisateur = new Utilisateur({
      id_utilisateur: 7,
      nom: 'Alice',
      email: 'a@x.fr',
      role: 'enseignant',
      version_jeton: 3,
    });

    expect(utilisateur.versProfilPublic()).toEqual({ id_utilisateur: 7, nom: 'Alice', email: 'a@x.fr' });
  });
});
