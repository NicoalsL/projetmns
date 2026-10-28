// Tests à données aléatoires (« fuzzing ») des contrôles d'entrée.
// On envoie des centaines de valeurs bizarres (types inattendus, caractères
// spéciaux, objets piégés, textes géants…) à chaque middleware de validation.
// Attendu : JAMAIS de plantage. Soit un refus 400, soit le passage à la suite
// avec SEULEMENT les champs prévus.
// Le générateur est « graine fixe » : en cas d'échec, le même cas se reproduit.
const { validerInscription, validerConnexion, validerSuppressionCompte } = require('../src/middlewares/validation');
const { validerCours, validerIdentifiantCours } = require('../src/middlewares/validationCours');
const {
  validerGeneration,
  validerIdentifiantQuiz,
  validerModificationQuiz,
  validerRevisionQuiz,
  validerReponseDonnee,
  validerNumeroQuestion,
  validerFormatExport,
} = require('../src/middlewares/validationQuiz');

const NOMBRE_ESSAIS = 400;
const GRAINE = 20261009;

// Générateur pseudo-aléatoire reproductible (algorithme mulberry32).
function creerAleatoire(graine) {
  let etat = graine;
  return function aleatoire() {
    etat = (etat + 0x6D2B79F5) | 0;
    let t = Math.imul(etat ^ (etat >>> 15), 1 | etat);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VALEURS_PIEGES = [
  null,
  undefined,
  true,
  0,
  -1,
  1.5,
  NaN,
  Infinity,
  '',
  ' ',
  '\0',
  'a\0b',
  '<script>alert(1)</script>',
  "' OR 1=1 --",
  '{"$ne": null}',
  '../../etc/passwd',
  '=HYPERLINK("http://pirate")',
  '😀'.repeat(50),
  'x'.repeat(100000),
  [],
  [1, 2, 3],
  {},
  { $ne: null },
  { $gt: '' },
  JSON.parse('{"__proto__": {"admin": true}}'),
  { toString: 'pas une fonction' },
];

function valeurAleatoire(aleatoire, profondeur = 0) {
  const choix = Math.floor(aleatoire() * 6);
  if (choix === 0 || profondeur > 2) {
    return VALEURS_PIEGES[Math.floor(aleatoire() * VALEURS_PIEGES.length)];
  }
  if (choix === 1) {
    return Math.floor(aleatoire() * 1e12) * (aleatoire() < 0.5 ? -1 : 1);
  }
  if (choix === 2) {
    const longueur = Math.floor(aleatoire() * 300);
    return Array.from({ length: longueur }, () => String.fromCharCode(Math.floor(aleatoire() * 0xFFFF))).join('');
  }
  if (choix === 3) {
    return Array.from({ length: Math.floor(aleatoire() * 5) }, () => valeurAleatoire(aleatoire, profondeur + 1));
  }
  const objet = {};
  const cles = ['nom', 'email', 'motDePasse', 'titre', 'contenuTexte', 'questions', 'revision', 'types', 'role'];
  for (let i = 0; i < Math.floor(aleatoire() * 5); i++) {
    objet[cles[Math.floor(aleatoire() * cles.length)]] = valeurAleatoire(aleatoire, profondeur + 1);
  }
  return objet;
}

// Exécute un middleware avec une fausse requête et note ce qui s'est passé.
function executer(middleware, requete) {
  const resultat = { statut: null, suiteAppelee: false };
  const reponse = {
    status(code) {
      resultat.statut = code;
      return this;
    },
    json() {
      return this;
    },
  };
  middleware(requete, reponse, () => {
    resultat.suiteAppelee = true;
  });
  return resultat;
}

// [nom, middleware, fabrique de requête, champs autorisés dans le corps après passage]
const CIBLES = [
  ['validerInscription', validerInscription, (v) => ({ body: v }), ['nom', 'email', 'motDePasse']],
  ['validerConnexion', validerConnexion, (v) => ({ body: v }), ['email', 'motDePasse']],
  ['validerSuppressionCompte', validerSuppressionCompte, (v) => ({ body: v }), ['motDePasse']],
  ['validerCours', validerCours, (v) => ({ body: v }), ['titre', 'contenuTexte']],
  ['validerGeneration', validerGeneration, (v) => ({ body: v }), ['nombreQuestions', 'types', 'niveau', 'difficulte']],
  ['validerModificationQuiz', validerModificationQuiz, (v) => ({ body: v }), ['titre', 'questions']],
  ['validerRevisionQuiz', validerRevisionQuiz, (v) => ({ body: v }), null],
  ['validerReponseDonnee', validerReponseDonnee, (v) => ({ body: v }), ['reponse']],
  ['validerIdentifiantCours', validerIdentifiantCours, (v) => ({ params: { id: v } }), null],
  ['validerIdentifiantQuiz', validerIdentifiantQuiz, (v) => ({ params: { idQuiz: v } }), null],
  ['validerNumeroQuestion', validerNumeroQuestion, (v) => ({ params: { numero: v } }), null],
  ['validerFormatExport', validerFormatExport, (v) => ({ query: { format: v } }), null],
];

describe('Fuzzing des contrôles d’entrée', () => {
  test.each(CIBLES)('%s : aucune donnée aléatoire ne fait planter le contrôle', (
    nom,
    middleware,
    fabriquer,
    champs,
  ) => {
    const aleatoire = creerAleatoire(GRAINE + nom.length);
    const champsInattendus = [];

    for (let essai = 0; essai < NOMBRE_ESSAIS; essai++) {
      const requete = fabriquer(valeurAleatoire(aleatoire));

      const resultat = executer(middleware, requete);

      // Soit refusé proprement (400), soit accepté : jamais les deux, jamais rien.
      expect(resultat.suiteAppelee !== (resultat.statut === 400)).toBe(true);
      // SÉCURITÉ — Accepté : le corps ne doit contenir QUE les champs prévus.
      const corpsAccepte = resultat.suiteAppelee && champs ? requete.body : {};
      champsInattendus.push(...Object.keys(corpsAccepte).filter((cle) => !champs.includes(cle)));
    }

    expect(champsInattendus).toEqual([]);
  });

  test('un identifiant de cours accepté est toujours un entier positif', () => {
    const aleatoire = creerAleatoire(GRAINE);
    const identifiantsAcceptes = [];

    for (let essai = 0; essai < NOMBRE_ESSAIS; essai++) {
      const requete = { params: { id: valeurAleatoire(aleatoire) } };

      const resultat = executer(validerIdentifiantCours, requete);

      identifiantsAcceptes.push(...(resultat.suiteAppelee ? [requete.idCours] : []));
    }

    expect(identifiantsAcceptes.every((id) => Number.isInteger(id) && id > 0)).toBe(true);
  });
});
