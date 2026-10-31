const DepotPostgres = require('./depotPostgres');

// Rôle : seul fichier SQL pour la table utilisateur.
// Classe fille de DepotPostgres. Requêtes paramétrées ($1…) : pas d'injection SQL.
// Le dépôt renvoie les lignes de la base ; le service les transforme en objets
// Utilisateur (models/utilisateur.modele.js), qui gardent l'empreinte privée.

class UtilisateurDepot extends DepotPostgres {
  // Recherche sans tenir compte des majuscules (lower), pour retrouver aussi
  // les vieux comptes enregistrés avant la mise en minuscules.
  trouverParEmail(email) {
    return this.trouverUne(
      `SELECT id_utilisateur, nom, email, mot_de_passe_hache, role, version_jeton
       FROM utilisateur
       WHERE lower(email) = lower($1)`,
      [email],
    );
  }

  // Lu pour vérifier le mot de passe avant la suppression du compte.
  trouverParId(idUtilisateur) {
    return this.trouverUne(
      'SELECT id_utilisateur, mot_de_passe_hache FROM utilisateur WHERE id_utilisateur = $1',
      [idUtilisateur],
    );
  }

  // RGPD — Consentement enregistré AVEC sa date : c'est la preuve demandée par
  // l'article 7. (Sans case cochée, la validation a déjà refusé l'inscription.)
  creer({ nom, email, motDePasseHache }) {
    return this.trouverUne(
      `INSERT INTO utilisateur (nom, email, mot_de_passe_hache, consentement_rgpd, date_consentement)
       VALUES ($1, $2, $3, true, now())
       RETURNING id_utilisateur, nom, email, role, version_jeton`,
      [nom, email, motDePasseHache],
    );
  }

  // Numéro de version des jetons du compte, ou null si le compte n'existe plus.
  async trouverVersionJeton(idUtilisateur) {
    const ligne = await this.trouverUne(
      'SELECT version_jeton FROM utilisateur WHERE id_utilisateur = $1',
      [idUtilisateur],
    );
    return ligne ? ligne.version_jeton : null;
  }

  // SÉCURITÉ — +1 en une seule requête (pas « lire puis écrire ») : annule tous
  // les jetons déjà émis pour ce compte.
  async incrementerVersionJeton(idUtilisateur) {
    await this.executer(
      'UPDATE utilisateur SET version_jeton = version_jeton + 1 WHERE id_utilisateur = $1',
      [idUtilisateur],
    );
  }

  // RGPD — Droit à l'effacement : ON DELETE CASCADE supprime aussi ses cours et
  // son journal generation_ia, dans la même opération.
  async supprimer(idUtilisateur) {
    const resultat = await this.executer(
      'DELETE FROM utilisateur WHERE id_utilisateur = $1 RETURNING id_utilisateur',
      [idUtilisateur],
    );
    return resultat.rowCount === 1;
  }
}

// Une seule instance, partagée par toute l'application.
module.exports = new UtilisateurDepot();
