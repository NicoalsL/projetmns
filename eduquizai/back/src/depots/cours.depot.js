const DepotPostgres = require('./depotPostgres');

// Rôle : seul fichier qui écrit du SQL pour la table cours (PostgreSQL).
// Classe fille de DepotPostgres : elle hérite de executer(), trouverUne(),
// trouverToutes() et avecTransaction(), et n'écrit que ses propres requêtes.
// SÉCURITÉ — Requêtes paramétrées ($1, $2…) : voir depotPostgres.js.

// Signal interne : le cours a disparu pendant la transaction (on annule tout).
class CoursAbsent extends Error {}

class CoursDepot extends DepotPostgres {
  // Crée un cours. RETURNING renvoie la ligne créée, sans deuxième requête.
  creer({ titre, contenuTexte, idUtilisateur }) {
    return this.trouverUne(
      `INSERT INTO cours (titre, contenu_texte, id_utilisateur)
       VALUES ($1, $2, $3)
       RETURNING id_cours, titre, contenu_texte, date_creation`,
      [titre, contenuTexte, idUtilisateur],
    );
  }

  // La liste ne charge pas le texte (jusqu'à 50 000 caractères par cours) :
  // il est lu seulement sur la page du cours (éco-conception).
  lister(idUtilisateur) {
    return this.trouverToutes(
      `SELECT id_cours, titre, date_creation
       FROM cours
       WHERE id_utilisateur = $1
       ORDER BY date_creation DESC, id_cours DESC`,
      [idUtilisateur],
    );
  }

  // SÉCURITÉ — « AND id_utilisateur = $2 » DANS la requête : impossible de lire
  // le cours d'un autre, même en devinant son numéro.
  trouverParId(idCours, idUtilisateur) {
    return this.trouverUne(
      `SELECT id_cours, titre, contenu_texte, date_creation
       FROM cours
       WHERE id_cours = $1 AND id_utilisateur = $2`,
      [idCours, idUtilisateur],
    );
  }

  // Modifie un cours (propriétaire vérifié dans la requête).
  // Renvoie le cours modifié, ou null s'il n'est pas à cet enseignant.
  mettreAJour(idCours, idUtilisateur, { titre, contenuTexte }) {
    return this.trouverUne(
      `UPDATE cours
       SET titre = $1, contenu_texte = $2
       WHERE id_cours = $3 AND id_utilisateur = $4
       RETURNING id_cours, titre, contenu_texte, date_creation`,
      [titre, contenuTexte, idCours, idUtilisateur],
    );
  }

  // Vérifier le propriétaire ET supprimer en une seule requête : aucun
  // moment entre les deux où quelque chose pourrait changer.
  async supprimer(idCours, idUtilisateur) {
    const resultat = await this.executer(
      `DELETE FROM cours
       WHERE id_cours = $1 AND id_utilisateur = $2
       RETURNING id_cours`,
      [idCours, idUtilisateur],
    );
    return resultat.rowCount === 1;
  }

  // Transaction qui « verrouille » le cours (FOR UPDATE) pendant une action.
  // Image : on pose la main sur la ligne du cours ; personne ne peut la supprimer
  // tant qu'on ne l'a pas relâchée (COMMIT ou ROLLBACK).
  // Sert à écrire un quiz en PostgreSQL seulement si le cours existe encore.
  // Renvoie le résultat de l'action, ou null si le cours n'existe plus.
  async avecCoursVerrouille(idCours, idUtilisateur, action) {
    try {
      return await this.avecTransaction(async (client) => {
        const resultat = await this.executer(
          `SELECT id_cours FROM cours
           WHERE id_cours = $1 AND id_utilisateur = $2 FOR UPDATE`,
          [idCours, idUtilisateur],
          client,
        );
        if (resultat.rows.length === 0) {
          throw new CoursAbsent(); // cours absent ou pas à lui : la transaction est annulée
        }
        return action(client);
      });
    } catch (erreur) {
      if (erreur instanceof CoursAbsent) {
        return null;
      }
      throw erreur;
    }
  }
}

// Une seule instance, partagée par toute l'application.
module.exports = new CoursDepot();
