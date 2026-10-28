// Mesure de la durée de génération d'un « quiz simple » (3 questions, une de
// chaque type) avec le fournisseur Ollama, à travers le vrai code de
// l'application (ia/genererQuiz.js : consignes, réparation, validation,
// vérification des citations). Critère du CDC : moins de 5 secondes.
//
//   npm run mesure:performance              (10 générations, modèle de .env)
//   npm run mesure:performance -- 20        (20 générations)
//
// Conditions de mesure : machine de démonstration, Ollama démarré, AUCUNE autre
// application gourmande en carte graphique (jeu, montage vidéo…). Le 5 octobre
// 2026, un jeu ouvert en parallèle a fait passer la médiane de 5 s à 11 s.

process.env.IA_FOURNISSEUR = 'ollama';
// Le script tourne sur la machine hôte, où Ollama écoute sur localhost.
process.env.OLLAMA_URL = process.env.OLLAMA_URL_MESURE || 'http://localhost:11434';

const { genererQuiz, prechaufferIa } = require('../src/ia/genererQuiz');

const OBJECTIF_DUREE_MS = 5000;
const NOMBRE_GENERATIONS_PAR_DEFAUT = 10;

// Cours réel de 9 phrases (≈ 1 100 caractères), le même que pour les mesures
// rapportées dans documentation/qualite/plan-tests.md.
const COURS = [
  'La photosynthèse permet aux plantes vertes de fabriquer leur propre matière organique à partir de lumière.',
  'Elle se déroule principalement dans les chloroplastes, présents dans les cellules des feuilles.',
  'La chlorophylle, un pigment vert, capte l\'énergie lumineuse nécessaire à la réaction.',
  'La plante absorbe du dioxyde de carbone par de petits orifices appelés stomates.',
  'L\'eau est puisée dans le sol par les racines, puis transportée jusqu\'aux feuilles par la sève brute.',
  'La réaction produit du glucose, qui sert de source d\'énergie et de matériau de construction.',
  'Elle rejette du dioxygène dans l\'atmosphère, ce qui permet la respiration des êtres vivants.',
  'Sans lumière, la photosynthèse s\'arrête : la plante puise alors dans ses réserves.',
  'Le bilan s\'écrit : dioxyde de carbone + eau donne glucose + dioxygène, en présence de lumière.',
].join('\n');

async function genererUneFois() {
  const debut = Date.now();
  try {
    const resultat = await genererQuiz(COURS, {
      nombreQuestions: 3,
      types: ['qcm', 'vrai_faux', 'ouverte'],
      difficulte: 'moyen',
    });
    const questionsCitees = resultat.questions.filter((question) => question.source);
    return {
      dureeMs: Date.now() - debut,
      questionsValides: resultat.questions.length,
      citationsRetrouvees: questionsCitees.filter((question) => question.source_trouvee).length,
      citationsTotal: questionsCitees.length,
    };
  } catch (erreur) {
    return {
      dureeMs: Date.now() - debut,
      questionsValides: 0,
      citationsRetrouvees: 0,
      citationsTotal: 0,
      erreur: erreur.code,
    };
  }
}

// Valeur au rang donné d'une liste triée (0,5 = médiane, 0,9 = 90e centile).
function centile(dureesTriees, rang) {
  const position = Math.min(dureesTriees.length - 1, Math.floor(dureesTriees.length * rang));
  return dureesTriees[position];
}

async function mesurer() {
  const nombreGenerations = Number(process.argv[2] || NOMBRE_GENERATIONS_PAR_DEFAUT);

  // Comme au démarrage de l'API : le modèle est chargé avant la première génération.
  const debutPrechauffage = Date.now();
  await prechaufferIa();
  console.log(`Modèle ${process.env.OLLAMA_MODELE || 'qwen3:4b'} préchargé en ${Date.now() - debutPrechauffage} ms`);

  // Un modèle qui ne tient pas entièrement en mémoire vidéo déborde sur le
  // processeur et devient plusieurs fois plus lent : la mesure serait faussée.
  // (Ollama ne voit pas, en revanche, une autre application qui occupe le
  // calcul de la carte graphique : d'où les conditions rappelées en tête.)
  const modelesCharges = await fetch(process.env.OLLAMA_URL + '/api/ps').then((reponse) => reponse.json());
  for (const modele of modelesCharges.models ?? []) {
    if (modele.size_vram < modele.size) {
      console.warn(`ATTENTION : ${modele.name} n'est pas entièrement en mémoire vidéo, mesure faussée.`);
    }
  }

  const resultats = [];
  for (let numero = 1; numero <= nombreGenerations; numero++) {
    const resultat = await genererUneFois();
    resultats.push(resultat);
    const etat = resultat.erreur ? 'erreur ' + resultat.erreur : `${resultat.questionsValides} questions valides`;
    console.log(`Génération ${numero} : ${resultat.dureeMs} ms (${etat})`);
  }

  const reussies = resultats.filter((resultat) => !resultat.erreur);
  const durees = reussies.map((resultat) => resultat.dureeMs).sort((a, b) => a - b);
  if (durees.length === 0) {
    console.error('Aucune génération réussie : vérifier qu\'Ollama est démarré et le modèle téléchargé.');
    process.exit(1);
  }
  const somme = (cle) => reussies.reduce((total, resultat) => total + resultat[cle], 0);

  console.log('\nRésultat');
  console.log(`  Médiane : ${centile(durees, 0.5)} ms · 90e centile : ${centile(durees, 0.9)} ms`);
  console.log(`  Minimum : ${durees[0]} ms · maximum : ${durees[durees.length - 1]} ms`);
  const sousObjectif = durees.filter((duree) => duree < OBJECTIF_DUREE_MS).length;
  console.log(`  Sous ${OBJECTIF_DUREE_MS} ms : ${sousObjectif} / ${durees.length}`);
  console.log(`  Questions valides : ${somme('questionsValides')} / ${reussies.length * 3}`);
  console.log(`  Citations retrouvées dans le cours : ${somme('citationsRetrouvees')} / ${somme('citationsTotal')}`);
  console.log(`  Générations en erreur : ${resultats.length - reussies.length}`);
}

mesurer().catch((erreur) => {
  console.error('Mesure impossible', { code: erreur.code, message: erreur.message });
  process.exit(1);
});
