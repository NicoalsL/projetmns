const { randomBytes } = require('node:crypto');
const DepotPostgres = require('./depotPostgres');

// Tous les quiz sont stockés en PostgreSQL. Les questions de formes variables
// (QCM, vrai/faux, ouverte) restent dans une colonne JSONB du même enregistrement.
// Les identifiants restent sur 24 caractères hexadécimaux pour conserver
// les liens/API historiques lors de la migration depuis MongoDB.
class QuizDepot extends DepotPostgres {
  // Nouveau quiz, révision 1 (+1 à chaque modification).
  // client optionnel : partage la transaction avec generation_ia et cours.
  async creer(quiz, client) {
    const idQuiz = randomBytes(12).toString('hex');
    const parametres = quiz.parametres === null || quiz.parametres === undefined
      ? null
      : JSON.stringify(quiz.parametres);

    const resultat = await this.executer(
      `INSERT INTO quiz
       (id_quiz, id_generation, id_cours, id_utilisateur, titre, statut,
        fournisseur, modele, parametres, questions, date_creation,
        date_modification, date_validation, revision)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb,
               $10::jsonb, $11, $12, $13, 1)
       RETURNING *`,
      [
        idQuiz,
        quiz.id_generation,
        quiz.id_cours,
        quiz.id_utilisateur,
        quiz.titre,
        quiz.statut,
        quiz.fournisseur ?? null,
        quiz.modele ?? null,
        parametres,
        JSON.stringify(quiz.questions),
        quiz.date_creation,
        quiz.date_modification,
        quiz.date_validation,
      ],
      client,
    );

    return resultat.rows[0] || null;
  }

  // Liste résumée : pas les questions, seulement leur nombre (moins de données).
  async listerParCours(idCours, idUtilisateur) {
    const lignes = await this.trouverToutes(
      `SELECT id_quiz, titre, statut, fournisseur, date_creation,
              jsonb_array_length(questions) AS nombre_questions, revision
       FROM quiz WHERE id_cours = $1 AND id_utilisateur = $2
       ORDER BY date_creation DESC`,
      [idCours, idUtilisateur],
    );

    return lignes;
  }

  // Un quiz par son identifiant ET son propriétaire (null sinon).
  async trouverParId(idQuiz, idUtilisateur) {
    return this.trouverUne(
      'SELECT * FROM quiz WHERE id_quiz = $1 AND id_utilisateur = $2',
      [idQuiz, idUtilisateur],
    );
  }

  // Verrou optimiste : modifier seulement si la révision attendue est encore là.
  // Seules ces colonnes peuvent être modifiées : la liste empêche qu'un nom
  // de colonne envoyé par un appelant devienne une instruction SQL.
  async mettreAJour(idQuiz, idUtilisateur, modifications, revision, client) {
    const champsAutorises = [
      'titre',
      'statut',
      'questions',
      'parametres',
      'date_validation',
      'date_modification',
    ];
    const champs = Object.entries(modifications);

    if (champs.length === 0 || champs.some(([nom]) => !champsAutorises.includes(nom))) {
      throw new TypeError('Colonnes de quiz non autorisées');
    }

    const valeurs = [];
    const affectations = [];

    for (const [nom, valeur] of champs) {
      const estJson = nom === 'questions' || nom === 'parametres';
      const valeurSql = estJson && valeur !== null ? JSON.stringify(valeur) : valeur;
      valeurs.push(valeurSql);

      const numeroParametre = valeurs.length;
      const conversion = estJson ? '::jsonb' : '';
      affectations.push(`${nom} = $${numeroParametre}${conversion}`);
    }

    valeurs.push(idQuiz, idUtilisateur, revision);
    const numeroQuiz = valeurs.length - 2;
    const numeroUtilisateur = valeurs.length - 1;
    const numeroRevision = valeurs.length;

    const resultat = await this.executer(
      `UPDATE quiz SET ${affectations.join(', ')}, revision = revision + 1
       WHERE id_quiz = $${numeroQuiz} AND id_utilisateur = $${numeroUtilisateur}
         AND revision = $${numeroRevision}
       RETURNING *`,
      valeurs,
      client,
    );

    return resultat.rows[0] || null;
  }

  // Supprime un quiz seulement s'il appartient à l'enseignant connecté.
  async supprimer(idQuiz, idUtilisateur) {
    const resultat = await this.executer(
      'DELETE FROM quiz WHERE id_quiz = $1 AND id_utilisateur = $2',
      [idQuiz, idUtilisateur],
    );

    return resultat.rowCount === 1;
  }
}

// Une seule instance, partagée par toute l'application.
module.exports = new QuizDepot();
