const pool = require('../config/postgres');

// Seul fichier qui parle SQL pour la table generation_ia (PostgreSQL).
// Chaque appel à l'IA y est tracé, réussi ou non : c'est l'historique des
// générations et la preuve mesurée du critère de performance du CDC (< 5 s).

// Durée de conservation annoncée dans la politique de confidentialité (RGPD :
// limitation de la conservation). Constante SQL, jamais issue d'une saisie.
const DUREE_CONSERVATION = '6 months';

// $1::varchar : $1 sert deux fois (valeur de la colonne statut et comparaison
// avec 'succes'). Sans type explicite, PostgreSQL déduit deux types
// différents et refuse la requête (« inconsistent types deduced for
// parameter $1 ») : toute génération échouait alors en erreur 500.
async function enregistrer({ statut, dureeMs, nombreQuestionsDemandees, idUtilisateur, idCours }) {
  const resultat = await pool.query(
    `INSERT INTO generation_ia (statut, duree_ms, nombre_questions_demandees, id_utilisateur, id_cours, livraison)
     VALUES ($1::varchar, $2, $3, $4, $5, CASE WHEN $1::varchar = 'succes' THEN 'en_attente' ELSE 'echec' END)
     RETURNING id_generation, date_generation`,
    [statut, dureeMs, nombreQuestionsDemandees, idUtilisateur, idCours],
  );
  return resultat.rows[0];
}

// Historique d'un cours, du plus récent au plus ancien (filtré sur le propriétaire).
async function listerParCours(idCours, idUtilisateur) {
  const resultat = await pool.query(
    `SELECT id_generation, date_generation, statut, livraison, duree_ms, nombre_questions_demandees
     FROM generation_ia
     WHERE id_cours = $1 AND id_utilisateur = $2
     ORDER BY date_generation DESC
     LIMIT 20`,
    [idCours, idUtilisateur],
  );
  return resultat.rows;
}

// Supprime les traces plus anciennes que la durée de conservation.
async function purgerAnciennes() {
  const resultat = await pool.query(
    'DELETE FROM generation_ia WHERE date_generation < now() - $1::interval',
    [DUREE_CONSERVATION],
  );
  return resultat.rowCount;
}

// Peut participer à la transaction qui verrouille le cours pendant l'écriture.
async function marquerLivraison(idGeneration, idUtilisateur, livraison, client = pool) {
  await client.query(
    `UPDATE generation_ia SET livraison = $1
     WHERE id_generation = $2 AND id_utilisateur = $3`,
    [livraison, idGeneration, idUtilisateur],
  );
}

module.exports = { enregistrer, listerParCours, purgerAnciennes, marquerLivraison, DUREE_CONSERVATION };
