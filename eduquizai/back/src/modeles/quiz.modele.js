const { Question } = require('./question.modele');
const { ErreurDonneesInvalides } = require('../utilitaires/erreurs');

// Rôle : un quiz (ligne PostgreSQL + questions JSONB), avec ses règles métier.
// CHOIX — POO : le cycle de vie (brouillon -> validé -> exportable) et la façon
// de présenter un quiz à l'export appartiennent au quiz ; le service les lui demande.
// Les règles sur sa LISTE de questions (nombre, répartition des types) sont des
// méthodes statiques : elles servent avant même que le quiz existe (réponse de l'IA).
// La règle d'UNE question est dans sa classe : voir question.modele.js.
// SÉCURITÉ — CHOIX : les mêmes règles contrôlent la réponse de l'IA (jamais fiable
// par principe) et les modifications de l'enseignant, donc aucune porte dérobée.

const STATUT_BROUILLON = 'brouillon';
const STATUT_VALIDE = 'valide';
const NOMBRE_MAX_QUESTIONS = 20; // = CHECK jsonb_array_length(questions) BETWEEN 1 AND 20 dans schema.sql

class Quiz {
  // document : un quiz tel que le renvoie quiz.depot.js (id_quiz, titre, statut,
  // questions, fournisseur, modele, revision, dates…). Tous ses champs sont repris :
  // l'API renvoie donc exactement les mêmes données qu'avant.
  constructor(document) {
    Object.assign(this, document);
  }

  // Règle éthique du CDC : seul un quiz relu et validé par l'enseignant s'exporte.
  estExportable() {
    return this.statut === STATUT_VALIDE;
  }

  // La question n° numero (à partir de 0), ou null si elle n'existe pas.
  question(numero) {
    return this.questions[numero] ?? null;
  }

  // D'où vient le contenu (affiché dans l'export, par transparence sur l'IA).
  libelleOrigine() {
    if (this.fournisseur === 'simulation') {
      return 'simulation (sans IA)';
    }
    if (this.fournisseur === 'ollama') {
      return `IA locale Ollama (${this.modele})`;
    }
    return `IA OpenAI (${this.modele})`;
  }

  // Contenu exporté (le contrôleur le convertit en CSV ou PDF si besoin) :
  // seulement les données utiles, sans identifiants techniques.
  contenuExport() {
    return {
      titre: this.titre,
      date_validation: this.date_validation,
      genere_par: this.libelleOrigine(),
      // source_trouvee sert seulement à la relecture : retiré du fichier.
      questions: this.questions.map((question) => {
        const copie = { ...question };
        delete copie.source_trouvee;
        return copie;
      }),
    };
  }

  // Vérifie une question et renvoie une copie propre (données seules) avec
  // SEULEMENT les champs prévus pour son type.
  static #normaliserQuestion(question, numero) {
    return Question.depuisDonnees(question, numero).versDocument();
  }

  // Vérifie toutes les questions (enseignant). Erreur dès le premier défaut.
  static normaliserQuestions(questions) {
    if (!Array.isArray(questions) || questions.length === 0 || questions.length > NOMBRE_MAX_QUESTIONS) {
      throw new ErreurDonneesInvalides(`Un quiz doit contenir entre 1 et ${NOMBRE_MAX_QUESTIONS} questions`);
    }
    return questions.map((question, index) => Quiz.#normaliserQuestion(question, index + 1));
  }

  // Version tolérante, pour l'IA : une question mal formée est écartée au lieu
  // de tout refuser (l'appel à l'IA est déjà payé). La liste peut être vide.
  static normaliserQuestionsValides(questions) {
    if (!Array.isArray(questions)) {
      throw new ErreurDonneesInvalides('La réponse ne contient pas de liste de questions');
    }

    const valides = [];
    questions.forEach((question, index) => {
      try {
        valides.push(Quiz.#normaliserQuestion(question, index + 1));
      } catch {
        // Question écartée : l'enseignant relira de toute façon les autres.
      }
    });
    return valides.slice(0, NOMBRE_MAX_QUESTIONS);
  }

  // Répartit les questions entre les types choisis, le plus équitablement possible.
  // Exemple : 5 questions, [qcm, vrai_faux, ouverte] -> { qcm: 2, vrai_faux: 2, ouverte: 1 }.
  static repartirTypes(nombreQuestions, types) {
    const repartition = {};
    types.forEach((type, index) => {
      const part = Math.floor(nombreQuestions / types.length);
      const reste = index < nombreQuestions % types.length ? 1 : 0;
      repartition[type] = part + reste;
    });
    return repartition;
  }

  // Impose la répartition demandée à la réponse de l'IA (qui ne la respecte pas toujours) :
  // - une question d'un type NON demandé est écartée ;
  // - les questions en trop d'un type servent de réserve, pour compléter un
  //   autre type demandé qui manque ;
  // - l'ordre d'origine est gardé.
  static selectionnerSelonRepartition(questions, repartition) {
    const total = Object.values(repartition).reduce((somme, nombre) => somme + nombre, 0);
    const restants = { ...repartition };
    const retenues = new Set();
    const reserve = [];

    questions.forEach((question, index) => {
      if (!(question.type in repartition)) {
        return;
      }
      if (restants[question.type] > 0) {
        retenues.add(index);
        restants[question.type] -= 1;
      } else {
        reserve.push(index);
      }
    });

    while (retenues.size < total && reserve.length > 0) {
      retenues.add(reserve.shift());
    }

    return questions.filter((_, index) => retenues.has(index));
  }
}

Quiz.STATUT_BROUILLON = STATUT_BROUILLON;
Quiz.STATUT_VALIDE = STATUT_VALIDE;
Quiz.NOMBRE_MAX_QUESTIONS = NOMBRE_MAX_QUESTIONS;

module.exports = Quiz;
