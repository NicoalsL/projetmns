// Fournisseur de SIMULATION, sans IA : fabrique des questions simples à partir
// des phrases du cours. Il sert à développer, tester et faire une démonstration
// sans clé OpenAI ni coût. Les quiz produits sont marqués "simulation" et
// l'interface l'affiche : ils ne sont jamais présentés comme générés par une IA.

const LONGUEUR_MIN_PHRASE = 25;
const LONGUEUR_MIN_MOT_CLE = 6;
const NOMBRE_CHOIX_QCM = 4;
const LONGUEUR_MAX_SOURCE = 500; // = LONGUEUR_MAX_SOURCE de utilitaires/questions.js
// Correction simulée : part des mots attendus retrouvés pour juger la réponse.
const SEUIL_JUSTE = 0.6;
const SEUIL_PARTIEL = 0.3;

// Découpe le texte en phrases suffisamment longues pour faire une question.
function extrairePhrases(texte) {
  return texte
    .split(/(?<=[.!?])\s+|\n+/)
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length >= LONGUEUR_MIN_PHRASE);
}

// Mots "porteurs de sens" (assez longs) d'un texte, sans doublon.
function extraireMotsCles(texte) {
  const mots = texte.match(/[\p{L}-]+/gu) || [];
  const motsLongs = mots.filter((mot) => mot.length >= LONGUEUR_MIN_MOT_CLE);
  return [...new Set(motsLongs.map((mot) => mot.toLowerCase()))];
}

function raccourcir(texte, longueurMax) {
  return texte.length <= longueurMax ? texte : texte.slice(0, longueurMax - 1) + '…';
}

// QCM "texte à trous" : un mot de la phrase est masqué, les distracteurs sont
// d'autres mots longs du cours. Renvoie null si le cours manque de vocabulaire.
function creerQcm(phrase, motsDuCours, numero) {
  const motsDeLaPhrase = extraireMotsCles(phrase);
  if (motsDeLaPhrase.length === 0) return null;

  const motCache = motsDeLaPhrase[numero % motsDeLaPhrase.length];
  // Distracteurs pris de préférence HORS de la phrase : un mot visible juste à
  // côté du trou rendrait la question trop facile.
  const motsHorsPhrase = motsDuCours.filter((mot) => !motsDeLaPhrase.includes(mot));
  const autresMots = motsHorsPhrase.length >= NOMBRE_CHOIX_QCM - 1
    ? motsHorsPhrase
    : motsDuCours.filter((mot) => mot !== motCache);
  if (autresMots.length < NOMBRE_CHOIX_QCM - 1) return null;

  // Parcours circulaire de la liste : chaque question prend des distracteurs
  // différents, sans jamais sortir de la liste.
  const debut = numero % autresMots.length;
  const distracteurs = [];
  for (let decalage = 0; decalage < NOMBRE_CHOIX_QCM - 1; decalage += 1) {
    distracteurs.push(autresMots[(debut + decalage) % autresMots.length]);
  }

  // Position de la bonne réponse qui varie d'une question à l'autre.
  const indexBonneReponse = numero % NOMBRE_CHOIX_QCM;
  const choix = [...distracteurs];
  choix.splice(indexBonneReponse, 0, motCache);

  // Mot entier uniquement : « cellule » ne doit pas être masqué à l'intérieur
  // de « cellules ». \b ne connaît pas les lettres accentuées : on vérifie
  // donc qu'aucune lettre (\p{L}) ni trait d'union n'entoure le mot.
  const motEntier = new RegExp('(?<![\\p{L}-])' + motCache + '(?![\\p{L}-])', 'iu');
  const phraseATrou = phrase.replace(motEntier, '_____');
  return {
    type: 'qcm',
    enonce: raccourcir(`Complétez : « ${phraseATrou} »`, 500),
    choix,
    bonne_reponse: indexBonneReponse,
    explication: 'Le mot manquant figure dans le cours.',
  };
}

function creerVraiFaux(phrase) {
  return {
    type: 'vrai_faux',
    enonce: raccourcir(`D'après le cours : « ${phrase} »`, 500),
    bonne_reponse: true,
    explication: 'Cette affirmation reprend mot pour mot une phrase du cours.',
  };
}

function creerQuestionOuverte(phrase) {
  return {
    type: 'ouverte',
    enonce: raccourcir(`Expliquez avec vos propres mots l'idée suivante : « ${phrase} »`, 500),
    choix: null,
    bonne_reponse: raccourcir(phrase, 1000),
    explication: 'Réponse attendue : reformulation de la phrase du cours.',
  };
}

// Ordre des types : on alterne entre les types demandés tant que leur quota
// n'est pas épuisé. { qcm: 2, ouverte: 1 } -> [qcm, ouverte, qcm].
function sequenceDeTypes(repartition) {
  const restants = { ...repartition };
  const sequence = [];
  let ajoutEffectue = true;
  while (ajoutEffectue) {
    ajoutEffectue = false;
    for (const type of Object.keys(restants)) {
      if (restants[type] > 0) {
        sequence.push(type);
        restants[type] -= 1;
        ajoutEffectue = true;
      }
    }
  }
  return sequence;
}

// Crée une question du type voulu à partir d'une phrase, ou null si c'est
// impossible. Un QCM impossible (vocabulaire insuffisant) est remplacé par un
// autre type DEMANDÉ ; jamais par un type que l'enseignant n'a pas choisi.
function creerQuestion(typeVoulu, phrase, motsDuCours, numero, repartition) {
  if (typeVoulu === 'vrai_faux') {
    return creerVraiFaux(phrase);
  }
  if (typeVoulu === 'ouverte') {
    return creerQuestionOuverte(phrase);
  }
  const qcm = creerQcm(phrase, motsDuCours, numero);
  if (qcm) {
    return qcm;
  }
  if ('vrai_faux' in repartition) {
    return creerVraiFaux(phrase);
  }
  if ('ouverte' in repartition) {
    return creerQuestionOuverte(phrase);
  }
  return null;
}

// questionsAEviter (régénération d'une question) : on décale le choix des
// phrases d'autant, pour ne pas reproduire une question déjà présente.
async function genererQuestions({ texteCours, repartition, questionsAEviter = [] }) {
  const phrases = extrairePhrases(texteCours);
  // Cours trop court : on se sert du texte entier comme unique "phrase".
  const sources = phrases.length > 0 ? phrases : [texteCours.trim()];
  const motsDuCours = extraireMotsCles(texteCours);
  const decalage = questionsAEviter.length;
  const questions = [];

  sequenceDeTypes(repartition).forEach((typeVoulu, numero) => {
    const phraseComplete = sources[(numero + decalage) % sources.length];
    const question = creerQuestion(typeVoulu, raccourcir(phraseComplete, 400), motsDuCours, numero, repartition);
    if (question) {
      // La phrase d'origine est recopiée telle quelle : elle sera retrouvée dans le cours.
      questions.push({ ...question, source: phraseComplete.slice(0, LONGUEUR_MAX_SOURCE) });
    }
  });
  return questions;
}

// Mots de plus de 3 lettres, en minuscules et sans accents.
function motsSignificatifs(texte) {
  const sansAccents = texte.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  return new Set((sansAccents.match(/\p{L}{4,}/gu) || []));
}

// Correction sans IA d'une réponse ouverte : part des mots de la réponse
// attendue retrouvés dans la réponse donnée. Approximation grossière,
// présentée comme telle à l'enseignant (le commentaire le précise).
async function evaluerReponse({ reponseAttendue, reponseDonnee }) {
  const motsAttendus = motsSignificatifs(reponseAttendue);
  const motsDonnes = motsSignificatifs(reponseDonnee);
  const retrouves = [...motsAttendus].filter((mot) => motsDonnes.has(mot)).length;
  const proportion = motsAttendus.size === 0 ? 0 : retrouves / motsAttendus.size;

  let appreciation = 'fausse';
  if (proportion >= SEUIL_JUSTE) {
    appreciation = 'juste';
  } else if (proportion >= SEUIL_PARTIEL) {
    appreciation = 'partielle';
  }
  return {
    appreciation,
    commentaire: `Simulation sans IA : ${retrouves} mot(s) clé(s) de la réponse attendue `
      + `sur ${motsAttendus.size} retrouvé(s) dans votre réponse.`,
  };
}

module.exports = { nom: 'simulation', modele: () => 'simulation-locale', genererQuestions, evaluerReponse };
