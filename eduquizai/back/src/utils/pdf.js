// Rôle : transformer un quiz validé en PDF (export « Document PDF »).
// CHOIX — pdfkit écrit le PDF en JavaScript : pas besoin d'installer un
// navigateur (Puppeteer) ni un outil externe sur le serveur.
// ACCESSIBILITÉ — PDF « balisé » (RGAA 13.3) : langue, titre et structure
// (titres, paragraphes, liste des choix) sont déclarés, pour qu'un lecteur
// d'écran lise le document dans l'ordre, comme la page web.
const PDFDocument = require('pdfkit');
const { Question } = require('../models/question.modele');


// Couleurs de la charte graphique (documentation/conception/charte-graphique.md).
const COULEUR_TITRE = '#5F33DB';
const COULEUR_TEXTE = '#1B1530';
const COULEUR_SECONDAIRE = '#5B5670';
const COULEUR_BONNE_REPONSE = '#1F7A4D';

const MARGE = 56; // points PDF (2 cm)

// Helvetica (police intégrée au PDF) ne connaît que les caractères « WinAnsi »
// (latin + €, œ, guillemets, tirets). Les autres (émoji, grec…) deviendraient
// illisibles : on les remplace par « ? ».
const CARACTERES_WINANSI_EN_PLUS = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';

// Remplace par « ? » les caractères que la police intégrée ne sait pas afficher.
function texteCompatible(valeur) {
  return Array.from(String(valeur ?? ''))
    .map((caractere) => {
      const code = caractere.codePointAt(0);
      const estLatin1 = (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff);
      const estSautDeLigne = caractere === '\n';
      if (estLatin1 || estSautDeLigne || CARACTERES_WINANSI_EN_PLUS.includes(caractere)) {
        return caractere;
      }
      return '?';
    })
    .join('');
}

// Ajoute un élément de structure (H1, H2, P, Quote…) pour le balisage.
function ajouterBloc(document, parent, type, ecrire) {
  parent.add(document.struct(type, ecrire));
}

// Écrit une question complète : titre, énoncé, choix, bonne réponse, explication.
// Polymorphisme : la question (classe fille de Question) donne elle-même son
// libellé, ses choix et sa bonne réponse.
function ecrireQuestion(document, racine, donnees, numero) {
  const question = Question.depuisDocument(donnees);
  document.moveDown(0.8);
  ajouterBloc(document, racine, 'H2', () => {
    document
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(COULEUR_TITRE)
      .text(`Question ${numero} — ${question.libelleType()}`);
  });

  document.moveDown(0.2);
  ajouterBloc(document, racine, 'P', () => {
    document
      .font('Helvetica')
      .fontSize(11)
      .fillColor(COULEUR_TEXTE)
      .text(texteCompatible(question.enonce));
  });

  // Les choix d'un QCM forment une liste : le lecteur d'écran annonce leur nombre.
  const choix = question.choixEnTexte('. '); // « A. … », vide hors QCM
  if (choix.length > 0) {
    const liste = document.struct('L');
    racine.add(liste);
    choix.forEach((ligne) => {
      liste.add(document.struct('LI', () => {
        document.text(`   ${texteCompatible(ligne)}`);
      }));
    });
    liste.end();
  }

  document.moveDown(0.2);
  ajouterBloc(document, racine, 'P', () => {
    document
      .font('Helvetica-Bold')
      .fillColor(COULEUR_BONNE_REPONSE)
      .text('Réponse : ' + texteCompatible(question.bonneReponseEnTexte('. ')));
  });

  if (question.explication) {
    ajouterBloc(document, racine, 'P', () => {
      document
        .font('Helvetica')
        .fillColor(COULEUR_TEXTE)
        .text('Explication : ' + texteCompatible(question.explication));
    });
  }
  if (question.source) {
    ajouterBloc(document, racine, 'Quote', () => {
      document
        .font('Helvetica-Oblique')
        .fontSize(10)
        .fillColor(COULEUR_SECONDAIRE)
        .text('Extrait du cours : « ' + texteCompatible(question.source) + ' »');
    });
  }
}

// contenu : objet renvoyé par quiz.service.js → exporter() (quiz déjà validé).
// Renvoie le PDF complet. pdfkit le produit par morceaux, rassemblés à la fin.
function quizEnPdf(contenu) {
  return new Promise((resoudre, rejeter) => {
    const document = new PDFDocument({
      size: 'A4',
      margin: MARGE,
      // PDF balisé : version 1.7, langue déclarée, titre affiché par le lecteur PDF.
      pdfVersion: '1.7',
      tagged: true,
      lang: 'fr-FR',
      displayTitle: true,
      info: { Title: texteCompatible(contenu.titre), Creator: 'EduQuizAI' },
    });
    const morceaux = [];
    document.on('data', (morceau) => morceaux.push(morceau));
    document.on('end', () => resoudre(Buffer.concat(morceaux)));
    document.on('error', rejeter);

    const racine = document.struct('Document');
    document.addStructure(racine);

    ajouterBloc(document, racine, 'H1', () => {
      document
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor(COULEUR_TITRE)
        .text(texteCompatible(contenu.titre));
    });

    // Transparence : l'origine (IA ou simulation) et la date de validation
    // humaine sont écrites sur le document distribué.
    const dateValidation = new Date(contenu.date_validation).toLocaleDateString('fr-FR');
    document.moveDown(0.3);
    ajouterBloc(document, racine, 'P', () => {
      document
        .font('Helvetica')
        .fontSize(10)
        .fillColor(COULEUR_SECONDAIRE)
        .text(`Validé par l'enseignant le ${dateValidation} · généré par ${texteCompatible(contenu.genere_par)}`);
    });

    contenu.questions.forEach((question, index) => ecrireQuestion(document, racine, question, index + 1));
    racine.end();
    document.end();
  });
}

module.exports = { quizEnPdf, texteCompatible };
