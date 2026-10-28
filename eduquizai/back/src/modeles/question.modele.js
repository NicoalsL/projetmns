const { ErreurQuestion } = require('../utilitaires/erreurs');

// Rôle : les questions d'un quiz, sous forme de classes.
//
// CHOIX — POO : une question a toujours un énoncé, une explication et parfois
// une citation du cours ; c'est la classe MÈRE Question. Ce qui change selon le
// type (les choix d'un QCM, le vrai/faux, la réponse rédigée) est dans une classe
// FILLE. Chaque classe fille sait se valider et s'afficher elle-même : plus besoin
// de « if (type === 'qcm') … else if … » répétés dans tout le code (polymorphisme).
//
//   Question (abstraite) : enonce, explication, source
//    ├── QuestionQcm      : choix (2 à 6) + index du bon choix
//    ├── QuestionVraiFaux : vrai ou faux + explication obligatoire
//    └── QuestionOuverte  : réponse attendue, en texte
//
// SÉCURITÉ — Les mêmes règles valident la réponse de l'IA (jamais fiable par
// principe) et les modifications de l'enseignant : aucune porte dérobée.
// Format en base (document MongoDB) : documentation/conception/base-de-donnees.md.

const LONGUEUR_MAX_ENONCE = 500;
const LONGUEUR_MAX_CHOIX = 200;
const LONGUEUR_MAX_REPONSE = 1000;
const LONGUEUR_MAX_EXPLICATION = 1000;
const LONGUEUR_MAX_SOURCE = 500;
const NOMBRE_MIN_CHOIX = 2;
const NOMBRE_MAX_CHOIX = 6;
const LETTRES = 'ABCDEF'; // une lettre par choix possible (6 au maximum)

// Texte non vide, sans dépasser la longueur maximale.
function texteValide(valeur, longueurMax) {
  return typeof valeur === 'string' && valeur.trim().length > 0 && valeur.trim().length <= longueurMax;
}

class Question {
  // Reçoit des champs DÉJÀ vérifiés (par depuisDonnees) ou lus en base (par depuisDocument).
  constructor({ type, enonce, explication, source, source_trouvee }) {
    // Classe « abstraite » : on crée toujours une QuestionQcm, QuestionVraiFaux ou QuestionOuverte.
    if (new.target === Question) {
      throw new TypeError('Question est abstraite : créer une QuestionQcm, QuestionVraiFaux ou QuestionOuverte.');
    }
    this.type = type;
    this.enonce = enonce;
    this.explication = explication;
    // Citation du cours (facultative). source_trouvee : la citation figure-t-elle
    // vraiment dans le cours ? (calculé par genererQuiz.js)
    if (source) {
      this.source = source;
      if (typeof source_trouvee === 'boolean') {
        this.source_trouvee = source_trouvee;
      }
    }
  }

  // Fabrique la bonne classe fille à partir de données NON fiables (IA ou enseignant),
  // en vérifiant tout. Renvoie une question propre, avec SEULEMENT les champs prévus
  // pour son type (un champ en trop est jeté, jamais enregistré).
  static depuisDonnees(donnees, numero) {
    if (!donnees || typeof donnees !== 'object' || Array.isArray(donnees)) {
      throw new ErreurQuestion(numero, 'format invalide', 'enonce');
    }
    // SÉCURITÉ — Map plutôt qu'un objet : un type piégé comme « constructor » ou
    // « __proto__ » ne peut pas désigner une autre classe que les trois prévues.
    const ClasseFille = CLASSES_PAR_TYPE.get(donnees.type);
    if (!ClasseFille) {
      throw new ErreurQuestion(numero, 'le type doit être qcm, vrai_faux ou ouverte', 'enonce');
    }

    const champsCommuns = Question.validerChampsCommuns(donnees, numero);
    // Polymorphisme : chaque classe fille vérifie ses propres champs.
    const champsPropres = ClasseFille.validerChampsPropres(donnees, numero, champsCommuns);
    return new ClasseFille({ ...champsCommuns, ...champsPropres });
  }

  // Recrée une question à partir d'un document déjà enregistré (donc déjà vérifié).
  static depuisDocument(document) {
    const ClasseFille = CLASSES_PAR_TYPE.get(document.type);
    return new ClasseFille(document);
  }

  // Règles communes à tous les types : énoncé, explication, citation.
  static validerChampsCommuns(donnees, numero) {
    if (!texteValide(donnees.enonce, LONGUEUR_MAX_ENONCE)) {
      throw new ErreurQuestion(
        numero,
        `l'énoncé doit contenir entre 1 et ${LONGUEUR_MAX_ENONCE} caractères`,
        'enonce',
      );
    }

    const explication = typeof donnees.explication === 'string' ? donnees.explication.trim() : '';
    if (explication.length > LONGUEUR_MAX_EXPLICATION) {
      throw new ErreurQuestion(
        numero,
        `l'explication ne doit pas dépasser ${LONGUEUR_MAX_EXPLICATION} caractères`,
        'explication',
      );
    }

    // Citation coupée si trop longue plutôt que refusée : c'est juste une aide à la relecture.
    const source = typeof donnees.source === 'string' ? donnees.source.trim().slice(0, LONGUEUR_MAX_SOURCE) : '';
    return {
      type: donnees.type,
      enonce: donnees.enonce.trim(),
      explication,
      source,
      source_trouvee: undefined, // Attestation recalculée exclusivement côté serveur.
    };
  }

  // Méthodes que chaque classe fille DOIT redéfinir.
  static validerChampsPropres() {
    throw new Error('validerChampsPropres() doit être redéfinie par la classe fille.');
  }

  // Nom du type affiché dans les exports (« QCM », « Vrai ou faux »…).
  libelleType() {
    throw new Error('libelleType() doit être redéfinie par la classe fille.');
  }

  bonneReponseEnTexte() {
    throw new Error('bonneReponseEnTexte() doit être redéfinie par la classe fille.');
  }

  // Choix à afficher (« A - Paris »…). Vide par défaut : seul le QCM en a.
  choixEnTexte() {
    return [];
  }

  // Version « données seules », pour MongoDB et pour l'API (sans les méthodes).
  versDocument() {
    return { ...this };
  }
}

class QuestionQcm extends Question {
  constructor(champs) {
    super(champs); // énoncé, explication, citation : gérés par la classe mère
    this.choix = champs.choix;
    this.bonne_reponse = champs.bonne_reponse; // index du bon choix (0 = A)
  }

  static validerChampsPropres(donnees, numero) {
    const choix = donnees.choix;
    if (!Array.isArray(choix) || choix.length < NOMBRE_MIN_CHOIX || choix.length > NOMBRE_MAX_CHOIX) {
      throw new ErreurQuestion(
        numero,
        `un QCM doit proposer entre ${NOMBRE_MIN_CHOIX} et ${NOMBRE_MAX_CHOIX} choix`,
        'choix',
      );
    }
    if (!choix.every((choixPossible) => texteValide(choixPossible, LONGUEUR_MAX_CHOIX))) {
      throw new ErreurQuestion(
        numero,
        `chaque choix doit contenir entre 1 et ${LONGUEUR_MAX_CHOIX} caractères`,
        'choix',
      );
    }

    const choixNettoyes = choix.map((choixPossible) => choixPossible.trim());
    // Deux choix identiques rendraient la question ambiguë.
    const sansDoublon = new Set(choixNettoyes.map((choixPossible) => choixPossible.toLowerCase()));
    if (sansDoublon.size !== choixNettoyes.length) {
      throw new ErreurQuestion(numero, 'les choix doivent être tous différents', 'choix');
    }

    const index = donnees.bonne_reponse;
    if (!Number.isInteger(index) || index < 0 || index >= choixNettoyes.length) {
      throw new ErreurQuestion(numero, 'la bonne réponse doit désigner un des choix proposés', 'bonne_reponse');
    }
    return { choix: choixNettoyes, bonne_reponse: index };
  }

  libelleType() {
    return 'QCM';
  }

  // Ex. « B - Paris » (séparateur choisi par l'export : « - » en CSV, « . » en PDF).
  bonneReponseEnTexte(separateur = ' - ') {
    return LETTRES[this.bonne_reponse] + separateur + this.choix[this.bonne_reponse];
  }

  choixEnTexte(separateur = ' - ') {
    return this.choix.map((choix, index) => LETTRES[index] + separateur + choix);
  }
}

// Façons d'écrire vrai / faux qu'on accepte de l'IA quand elle n'écrit pas un booléen.
const ECRITURES_VRAI = ['true', 'vrai'];
const ECRITURES_FAUX = ['false', 'faux'];

class QuestionVraiFaux extends Question {
  constructor(champs) {
    super(champs);
    this.bonne_reponse = champs.bonne_reponse; // true ou false
  }

  static validerChampsPropres(donnees, numero, champsCommuns) {
    if (typeof donnees.bonne_reponse !== 'boolean') {
      throw new ErreurQuestion(numero, 'la réponse d\'un vrai/faux doit être vrai ou faux', 'bonne_reponse');
    }
    // Le CDC exige une explication pour chaque vrai/faux.
    if (!champsCommuns.explication) {
      throw new ErreurQuestion(numero, 'un vrai/faux doit être accompagné d\'une explication', 'explication');
    }
    return { bonne_reponse: donnees.bonne_reponse };
  }

  // Répare un vrai/faux mal écrit par l'IA : "Faux", "false" ou un numéro de choix
  // au lieu de true/false (vu avec qwen3:4b). Le sens est clair, on le convertit
  // AVANT la validation stricte, qui refuse toujours toute autre forme.
  // Concerne seulement l'IA, jamais les saisies de l'enseignant.
  static reparerReponseIa(donnees) {
    if (donnees?.type !== 'vrai_faux' || typeof donnees.bonne_reponse === 'boolean') {
      return donnees;
    }
    let valeur = donnees.bonne_reponse;
    // Numéro de choix : on lit le texte du choix désigné.
    if (Number.isInteger(valeur) && Array.isArray(donnees.choix)) {
      valeur = donnees.choix[valeur];
    }
    if (typeof valeur !== 'string') {
      return donnees;
    }
    const ecriture = valeur.trim().toLowerCase();
    if (ECRITURES_VRAI.includes(ecriture)) {
      return { ...donnees, bonne_reponse: true };
    }
    if (ECRITURES_FAUX.includes(ecriture)) {
      return { ...donnees, bonne_reponse: false };
    }
    return donnees;
  }

  libelleType() {
    return 'Vrai ou faux';
  }

  bonneReponseEnTexte() {
    return this.bonne_reponse ? 'Vrai' : 'Faux';
  }
}

class QuestionOuverte extends Question {
  constructor(champs) {
    super(champs); // pas de choix pour une question ouverte : choixEnTexte() de la mère renvoie []
    this.bonne_reponse = champs.bonne_reponse; // la réponse attendue, en texte
  }

  static validerChampsPropres(donnees, numero) {
    if (!texteValide(donnees.bonne_reponse, LONGUEUR_MAX_REPONSE)) {
      throw new ErreurQuestion(
        numero,
        `la réponse attendue doit contenir entre 1 et ${LONGUEUR_MAX_REPONSE} caractères`,
        'bonne_reponse',
      );
    }
    return { bonne_reponse: donnees.bonne_reponse.trim() };
  }

  libelleType() {
    return 'Question ouverte';
  }

  bonneReponseEnTexte() {
    return this.bonne_reponse;
  }
}

// Le type écrit dans les données -> la classe fille à utiliser.
const CLASSES_PAR_TYPE = new Map([
  ['qcm', QuestionQcm],
  ['vrai_faux', QuestionVraiFaux],
  ['ouverte', QuestionOuverte],
]);

// Les types connus, dans un ordre fixe : qcm, vrai_faux, ouverte.
const TYPES_QUESTION = [...CLASSES_PAR_TYPE.keys()];

module.exports = { Question, QuestionQcm, QuestionVraiFaux, QuestionOuverte, TYPES_QUESTION, LONGUEUR_MAX_SOURCE };
