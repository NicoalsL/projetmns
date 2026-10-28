// Vérification RÉELLE du fournisseur OpenAI : une génération de 3 questions
// (une de chaque type) envoyée à l'API OpenAI à travers le module de
// l'application (ia/genererQuiz.js), comme le fait le service en production.
//
//   OPENAI_API_KEY=sk-... node scripts/verifier-openai-reel.js
//
// Appel PAYANT (moins d'un centime avec gpt-4o-mini) : jamais lancé par les
// tests automatiques ni par la CI, qui simulent OpenAI. Aucune base n'est
// utilisée : seul le module d'IA est vérifié.

process.env.IA_FOURNISSEUR = 'openai';

const { genererQuiz } = require('../src/ia/genererQuiz');

const OBJECTIF_DUREE_MS = 5000; // critère du CDC : < 5 s pour un quiz simple

const COURS = [
  'La photosynthèse permet aux plantes de produire leur matière organique à partir de lumière.',
  'Elle se déroule principalement dans les chloroplastes des cellules des feuilles.',
  'La chlorophylle, pigment vert, capte l\'énergie lumineuse nécessaire à la réaction.',
  'La plante absorbe du dioxyde de carbone et rejette du dioxygène dans l\'atmosphère.',
  'Les réactifs sont le dioxyde de carbone et l\'eau ; les produits sont le glucose et le dioxygène.',
].join('\n');

async function verifier() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY absente : renseigner la clé pour lancer la vérification réelle.');
    process.exit(1);
  }

  const debut = Date.now();
  const resultat = await genererQuiz(COURS, {
    nombreQuestions: 3,
    types: ['qcm', 'vrai_faux', 'ouverte'],
    difficulte: 'moyen',
  });
  const dureeMs = Date.now() - debut;

  const typesObtenus = resultat.questions.map((question) => question.type).sort();
  const citationsRetrouvees = resultat.questions.filter((question) => question.source_trouvee).length;

  const verifications = [
    ['fournisseur utilisé', resultat.fournisseur === 'openai'],
    ['3 questions valides reçues', resultat.questions.length === 3],
    ['une question de chaque type', typesObtenus.join(',') === 'ouverte,qcm,vrai_faux'],
    ['au moins une citation retrouvée dans le cours', citationsRetrouvees >= 1],
  ];

  console.log(`Modèle : ${resultat.modele} · durée : ${dureeMs} ms (objectif < ${OBJECTIF_DUREE_MS} ms)`);
  console.log(`Citations retrouvées dans le cours : ${citationsRetrouvees} / ${resultat.questions.length}`);
  for (const [libelle, reussie] of verifications) {
    console.log(`${reussie ? 'OK ' : 'ÉCHEC'} ${libelle}`);
  }

  const echecs = verifications.filter(([, reussie]) => !reussie).length;
  if (echecs > 0) {
    process.exit(1);
  }
  console.log('Vérification réelle OpenAI réussie.');
}

verifier().catch((erreur) => {
  // Seul le code d'erreur est affiché : jamais la clé ni le corps de la réponse.
  console.error('Échec de l\'appel réel à OpenAI', { code: erreur.code, message: erreur.message });
  process.exit(1);
});
