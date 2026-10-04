// Jeu d'essai : remplit la base de développement avec des données de
// démonstration réalistes (comptes, cours, quiz, journal des générations).
//
//   docker compose exec -T back node scripts/jeu-essai.js
//
// Le script est rejouable : il supprime d'abord les comptes de démonstration
// (adresses en @demo.eduquizai.test) et tout ce qui leur est rattaché, puis
// les recrée. Les autres comptes ne sont jamais touchés.
// Les mots de passe ci-dessous sont publics : base de développement uniquement.

const bcrypt = require('bcryptjs');
const pool = require('../src/config/postgres');
const { collectionQuiz, fermerMongo } = require('../src/config/mongo');

const DOMAINE_DEMO = '@demo.eduquizai.test';
const MOT_DE_PASSE_DEMO = 'Demo-EduQuizAI-2026';

const COMPTES = [
  { nom: 'Claire Martin (démo)', email: 'claire.martin' + DOMAINE_DEMO },
  { nom: 'Karim Benali (démo)', email: 'karim.benali' + DOMAINE_DEMO },
];

const COURS = [
  {
    compte: 0,
    titre: 'SVT — La photosynthèse',
    contenu: [
      '# La photosynthèse',
      'La photosynthèse permet aux plantes de produire leur propre matière organique à partir de lumière.',
      'Elle se déroule principalement dans les chloroplastes des cellules des feuilles.',
      'La chlorophylle, pigment vert, capte l\'énergie lumineuse nécessaire à la réaction.',
      'La plante absorbe du dioxyde de carbone par les stomates et de l\'eau par les racines.',
      'Elle produit du glucose, source d\'énergie, et rejette du dioxygène dans l\'atmosphère.',
    ].join('\n'),
  },
  {
    compte: 0,
    titre: 'Histoire — Les débuts de la Révolution française',
    contenu: [
      'La Révolution française commence en 1789, dans un contexte de crise financière.',
      'Les états généraux se réunissent à Versailles le 5 mai 1789.',
      'La prise de la Bastille, le 14 juillet 1789, devient le symbole de la Révolution.',
      'La Déclaration des droits de l\'homme et du citoyen est adoptée le 26 août 1789.',
    ].join('\n'),
  },
  {
    compte: 1,
    titre: 'Mathématiques — Le théorème de Pythagore',
    contenu: [
      'Dans un triangle rectangle, le carré de l\'hypoténuse est égal à la somme des carrés '
        + 'des deux autres côtés.',
      'L\'hypoténuse est le côté opposé à l\'angle droit ; c\'est le plus long côté du triangle.',
      'Si un triangle a des côtés de 3, 4 et 5 centimètres, il est rectangle car 9 + 16 = 25.',
      '## Réciproque',
      'La réciproque permet de démontrer qu\'un triangle est rectangle à partir des longueurs de ses côtés.',
    ].join('\n'),
  },
];

// Quiz validé rattaché au premier cours : montre un quiz "fini" dans la démo.
const QUESTIONS_PHOTOSYNTHESE = [
  {
    type: 'qcm',
    enonce: 'Dans quel organite se déroule principalement la photosynthèse ?',
    choix: ['Le chloroplaste', 'La mitochondrie', 'Le noyau', 'La vacuole'],
    bonne_reponse: 0,
    explication: 'Le cours précise que la photosynthèse se déroule dans les chloroplastes.',
  },
  {
    type: 'vrai_faux',
    enonce: 'La plante rejette du dioxyde de carbone pendant la photosynthèse.',
    bonne_reponse: false,
    explication: 'Elle absorbe du dioxyde de carbone et rejette du dioxygène.',
  },
  {
    type: 'ouverte',
    enonce: 'Quel est le rôle de la chlorophylle ?',
    bonne_reponse: 'Capter l\'énergie lumineuse nécessaire à la photosynthèse.',
    explication: '',
  },
];

async function supprimerDonneesDemo(collection) {
  const anciens = await pool.query(
    'SELECT id_utilisateur FROM utilisateur WHERE email LIKE $1',
    ['%' + DOMAINE_DEMO],
  );
  const ids = anciens.rows.map((ligne) => ligne.id_utilisateur);
  if (ids.length > 0) {
    await collection.deleteMany({ id_utilisateur: { $in: ids } });
    // Cours et journal suivent par ON DELETE CASCADE.
    await pool.query('DELETE FROM utilisateur WHERE id_utilisateur = ANY($1::int[])', [ids]);
  }
  return ids.length;
}

async function principal() {
  const collection = await collectionQuiz();
  const supprimes = await supprimerDonneesDemo(collection);
  const hache = await bcrypt.hash(MOT_DE_PASSE_DEMO, 10);

  const idsComptes = [];
  for (const compte of COMPTES) {
    const resultat = await pool.query(
      `INSERT INTO utilisateur (nom, email, mot_de_passe_hache, consentement_rgpd, date_consentement)
       VALUES ($1, $2, $3, true, now())
       RETURNING id_utilisateur`,
      [compte.nom, compte.email, hache],
    );
    idsComptes.push(resultat.rows[0].id_utilisateur);
  }

  const idsCours = [];
  for (const cours of COURS) {
    const resultat = await pool.query(
      'INSERT INTO cours (titre, contenu_texte, id_utilisateur) VALUES ($1, $2, $3) RETURNING id_cours',
      [cours.titre, cours.contenu, idsComptes[cours.compte]],
    );
    idsCours.push(resultat.rows[0].id_cours);
  }

  // Journal : une génération réussie (à l'origine du quiz) et un échec, pour
  // illustrer l'historique visible sur la page du cours.
  const generation = await pool.query(
    `INSERT INTO generation_ia (statut, duree_ms, nombre_questions_demandees, id_utilisateur, id_cours)
     VALUES ('succes', 21450, 3, $1, $2), ('echec', 30000, 5, $1, $2)
     RETURNING id_generation`,
    [idsComptes[0], idsCours[0]],
  );

  const maintenant = new Date();
  await collection.insertOne({
    id_generation: generation.rows[0].id_generation,
    id_cours: idsCours[0],
    id_utilisateur: idsComptes[0],
    titre: 'Quiz – SVT — La photosynthèse',
    statut: 'valide',
    fournisseur: 'ollama',
    modele: 'qwen3:8b',
    questions: QUESTIONS_PHOTOSYNTHESE,
    date_creation: maintenant,
    date_modification: maintenant,
    date_validation: maintenant,
  });

  console.log(`Jeu d'essai créé (${supprimes} ancien(s) compte(s) de démo remplacé(s)) :`);
  console.log(`- ${COMPTES.length} comptes, ${COURS.length} cours, 2 générations journalisées, 1 quiz validé`);
  console.log(`- Connexion : ${COMPTES[0].email} / ${MOT_DE_PASSE_DEMO}`);
}

principal()
  .catch((erreur) => {
    console.error('Jeu d\'essai impossible :', erreur.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    await fermerMongo();
  });
