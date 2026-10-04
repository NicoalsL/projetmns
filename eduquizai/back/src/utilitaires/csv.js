// Conversion d'un quiz exporté en fichier CSV (ouvrable dans Excel ou LibreOffice).

// Point-virgule : séparateur attendu par Excel en français (la virgule y
// sert de séparateur décimal).
const SEPARATEUR = ';';
// Marque d'ordre des octets UTF-8 : sans elle, Excel affiche mal les accents.
const BOM_UTF8 = '﻿';
const LETTRES = 'ABCDEF';
const LIBELLES_TYPE = { qcm: 'QCM', vrai_faux: 'Vrai ou faux', ouverte: 'Question ouverte' };

// Sécurité — injection de formules (OWASP « CSV Injection ») : un tableur
// exécute une cellule qui commence par = + - @ (ou tabulation / retour) comme
// une formule. Un énoncé piégé (« =HYPERLINK(...) ») pourrait alors agir sur
// le poste de l'enseignant. On préfixe ces cellules d'une apostrophe, qui
// force le tableur à les traiter comme du texte.
const DEBUT_DE_FORMULE = /^[=+\-@\t\r]/;

function cellule(valeur) {
  let texte = String(valeur ?? '');
  if (DEBUT_DE_FORMULE.test(texte)) {
    texte = "'" + texte;
  }
  // Toujours entre guillemets, guillemets internes doublés (norme RFC 4180) :
  // un point-virgule ou un retour à la ligne dans le texte ne casse pas la ligne.
  return '"' + texte.replace(/"/g, '""') + '"';
}

// Réponse attendue en clair : la lettre et le texte du bon choix pour un QCM.
function bonneReponseEnTexte(question) {
  if (question.type === 'qcm') {
    return LETTRES[question.bonne_reponse] + ' - ' + question.choix[question.bonne_reponse];
  }
  if (question.type === 'vrai_faux') {
    return question.bonne_reponse ? 'Vrai' : 'Faux';
  }
  return question.bonne_reponse;
}

function choixEnTexte(question) {
  if (question.type !== 'qcm') {
    return '';
  }
  return question.choix.map((choix, index) => LETTRES[index] + ' - ' + choix).join(' | ');
}

// contenu : objet renvoyé par quiz.service.js → exporter() (quiz déjà validé).
function quizEnCsv(contenu) {
  const lignes = [['Numéro', 'Type', 'Énoncé', 'Choix', 'Bonne réponse', 'Explication']];
  contenu.questions.forEach((question, index) => {
    lignes.push([
      index + 1,
      LIBELLES_TYPE[question.type],
      question.enonce,
      choixEnTexte(question),
      bonneReponseEnTexte(question),
      question.explication,
    ]);
  });

  // \r\n : fin de ligne prévue par la norme CSV (RFC 4180).
  return BOM_UTF8 + lignes.map((ligne) => ligne.map(cellule).join(SEPARATEUR)).join('\r\n') + '\r\n';
}

module.exports = { quizEnCsv, cellule };
