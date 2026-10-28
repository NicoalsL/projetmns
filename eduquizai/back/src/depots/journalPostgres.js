const DepotPostgres = require('./depotPostgres');

// Rôle : classe MÈRE des deux journaux (generation_ia et journal_securite).
// Elle hérite de DepotPostgres et AJOUTE ce que les deux journaux ont en commun :
// une durée de conservation limitée, et la purge des lignes trop anciennes.

// RGPD — Durée de conservation annoncée dans la politique de confidentialité.
// Écrite ici en dur, jamais venue d'une saisie.
const DUREE_CONSERVATION = '6 months';

class JournalPostgres extends DepotPostgres {
  // table, colonneDate : fixés par chaque classe fille (constantes du code).
  constructor(table, colonneDate) {
    super();
    if (new.target === JournalPostgres) {
      throw new TypeError('JournalPostgres est abstraite : créer un journal précis.');
    }
    this.table = table;
    this.colonneDate = colonneDate;
  }

  // RGPD — Supprime les lignes plus anciennes que la durée de conservation
  // (lancé chaque jour par serveur.js). Renvoie le nombre de lignes supprimées.
  // SÉCURITÉ — Le nom de la table et de la colonne viennent du CODE (constantes
  // des classes filles), jamais d'une saisie : ils peuvent être écrits dans le SQL.
  // La durée, elle, reste une valeur paramétrée ($1).
  async purgerAnciens() {
    const resultat = await this.executer(
      `DELETE FROM ${this.table} WHERE ${this.colonneDate} < now() - $1::interval`,
      [DUREE_CONSERVATION],
    );
    return resultat.rowCount;
  }
}

JournalPostgres.DUREE_CONSERVATION = DUREE_CONSERVATION;

module.exports = JournalPostgres;
