const pool = require('../config/postgres');

// Rôle : classe MÈRE de tous les dépôts PostgreSQL (patron Dépôt / Repository).
// Elle contient ce que tous les dépôts SQL font de la même façon : envoyer une
// requête paramétrée, lire une ligne ou toutes les lignes, ouvrir une transaction.
// Chaque classe fille (CoursDepot, UtilisateurDepot…) n'écrit que SES requêtes.
//
//   DepotPostgres (abstraite)
//    ├── CoursDepot, UtilisateurDepot, NettoyageQuizDepot
//    └── JournalPostgres (abstraite : purge RGPD)
//         ├── GenerationIaDepot
//         └── JournalSecuriteDepot
//
// SÉCURITÉ — Requêtes paramétrées ($1, $2…) : les valeurs ne sont jamais collées
// dans le texte SQL, donc pas d'injection SQL possible.
// Image : la requête est un formulaire à trous ; PostgreSQL remplit les trous,
// et ce qu'on y met reste une donnée, jamais un ordre SQL.
// CHOIX — SQL écrit à la main (bibliothèque pg) plutôt qu'un ORM (Sequelize,
// Prisma) : peu de tables, et chaque requête se lit et s'explique telle quelle.
class DepotPostgres {
  constructor() {
    // Classe « abstraite » : on crée toujours un dépôt précis (CoursDepot…).
    if (new.target === DepotPostgres) {
      throw new TypeError('DepotPostgres est abstraite : créer un dépôt précis (CoursDepot…).');
    }
  }

  // Envoie une requête paramétrée : le texte SQL avec ses $1, $2… et les valeurs à part.
  // client : une connexion de transaction (voir avecTransaction) ; sinon le pool partagé.
  executer(sql, valeurs, client = pool) {
    // Requête sans valeur ($1…) : on n'envoie que le texte SQL.
    return valeurs === undefined ? client.query(sql) : client.query(sql, valeurs);
  }

  // Première ligne du résultat, ou null s'il n'y en a pas.
  async trouverUne(sql, valeurs) {
    const resultat = await this.executer(sql, valeurs);
    return resultat.rows[0] || null;
  }

  // Toutes les lignes du résultat (liste vide s'il n'y en a pas).
  async trouverToutes(sql, valeurs) {
    const resultat = await this.executer(sql, valeurs);
    return resultat.rows;
  }

  // Exécute « action » dans une transaction : tout est enregistré (COMMIT) ou
  // rien (ROLLBACK), même en cas d'erreur. La connexion est toujours rendue au pool.
  async avecTransaction(action) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN'); // début de la transaction
      const valeur = await action(client);
      await client.query('COMMIT');
      return valeur;
    } catch (erreur) {
      await client.query('ROLLBACK');
      throw erreur;
    } finally {
      client.release(); // rend la connexion au pool, même en cas d'erreur
    }
  }
}

module.exports = DepotPostgres;
