// Rôle : un quiz (ligne PostgreSQL + questions JSONB), avec ses règles métier.
// CHOIX — POO : le cycle de vie (brouillon -> validé -> exportable) et la façon
// de présenter un quiz à l'export appartiennent au quiz ; le service les lui demande.

const STATUT_BROUILLON = 'brouillon';
const STATUT_VALIDE = 'valide';

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
    if (this.fournisseur === 'simulation') return 'simulation (sans IA)';
    if (this.fournisseur === 'ollama') return `IA locale Ollama (${this.modele})`;
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
}

Quiz.STATUT_BROUILLON = STATUT_BROUILLON;
Quiz.STATUT_VALIDE = STATUT_VALIDE;

module.exports = Quiz;
