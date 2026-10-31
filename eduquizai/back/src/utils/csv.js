// Rôle : transformer un quiz validé en fichier CSV (Excel, LibreOffice).

const { Question } = require('../models/question.modele');

// Point-virgule : séparateur d'Excel en français (la virgule sert aux décimales).
const SEPARATEUR = ';';
// « BOM » UTF-8 : sans ce caractère invisible au début, Excel abîme les accents.
const BOM_UTF8 = '﻿';

// SÉCURITÉ — Injection de formules (« CSV Injection ») : un tableur exécute une
// case qui commence par = + - @ comme une formule. Un énoncé piégé
// (« =HYPERLINK(...) ») pourrait agir sur l'ordinateur de l'enseignant.
// Parade : une apostrophe devant, et le tableur l'affiche comme du simple texte.
const DEBUT_DE_FORMULE = /^[=+\-@\t\r]/;

// Prépare une valeur pour une case du tableau : neutralise les formules, puis
// l'entoure de guillemets.
function cellule(valeur) {
  let texte = String(valeur ?? '');
  if (DEBUT_DE_FORMULE.test(texte)) {
    texte = "'" + texte;
  }
  // Toujours entre guillemets (norme RFC 4180) : un « ; » ou un retour à la
  // ligne dans le texte ne casse pas le tableau.
  return '"' + texte.replace(/"/g, '""') + '"';
}

// contenu : objet renvoyé par quiz.service.js → exporter() (quiz déjà validé).
function quizEnCsv(contenu) {
  const lignes = [['Numéro', 'Type', 'Énoncé', 'Choix', 'Bonne réponse', 'Explication']];
  contenu.questions.forEach((donnees, index) => {
    // Polymorphisme : chaque type de question sait écrire son libellé, ses choix
    // et sa bonne réponse ; plus de « if (type === 'qcm') » ici.
    const question = Question.depuisDocument(donnees);
    lignes.push([
      index + 1,
      question.libelleType(),
      question.enonce,
      question.choixEnTexte(' - ').join(' | '), // « A - … | B - … » (vide hors QCM)
      question.bonneReponseEnTexte(' - '),
      question.explication,
    ]);
  });

  // \r\n : fin de ligne de la norme CSV.
  return BOM_UTF8 + lignes.map((ligne) => ligne.map(cellule).join(SEPARATEUR)).join('\r\n') + '\r\n';
}

module.exports = { quizEnCsv, cellule };
