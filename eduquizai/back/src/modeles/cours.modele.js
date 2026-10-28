// Rôle : un cours d'enseignant (table cours), avec ses règles métier.
// CHOIX — POO : la règle « un cours trop court ne permet pas de générer un quiz »
// appartient au cours lui-même ; on la demande au cours (cours.estAssezLongPourUnQuiz())
// au lieu de la recalculer ailleurs.

// Taille minimale d'un cours pour générer un quiz.
// Testé : avec un cours de deux mots, l'IA invente des questions hors sujet
// (noyau, mitochondries…). Ces seuils réduisent le risque, sans le supprimer.
const LONGUEUR_MIN_POUR_QUIZ = 300;
const PHRASES_MIN_POUR_QUIZ = 3;

class Cours {
  // ligne : une ligne de la table cours (id_cours, titre, contenu_texte, date_creation).
  constructor({ id_cours, titre, contenu_texte, date_creation }) {
    this.id_cours = id_cours;
    this.titre = titre;
    this.contenu_texte = contenu_texte;
    this.date_creation = date_creation;
  }

  // Compte les phrases : texte terminé par . ! ? ou un retour à la ligne, avec
  // au moins 3 mots (un titre seul comme « La cellule. » ne compte pas).
  nombreDePhrases() {
    return this.contenu_texte
      .split(/[.!?\n]+/)
      .filter((phrase) => phrase.trim().split(/\s+/).length >= 3)
      .length;
  }

  // Assez de matière pour que l'IA ne doive pas inventer ?
  estAssezLongPourUnQuiz() {
    return this.contenu_texte.length >= LONGUEUR_MIN_POUR_QUIZ
      && this.nombreDePhrases() >= PHRASES_MIN_POUR_QUIZ;
  }
}

// Les seuils, lisibles depuis la classe (ex. pour le message d'erreur).
Cours.LONGUEUR_MIN_POUR_QUIZ = LONGUEUR_MIN_POUR_QUIZ;
Cours.PHRASES_MIN_POUR_QUIZ = PHRASES_MIN_POUR_QUIZ;

module.exports = Cours;
