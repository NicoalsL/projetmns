// Contrôles d'entrée partagés par les middlewares de validation.

// Plus grand INTEGER PostgreSQL (colonnes SERIAL de schema.sql) : un
// identifiant plus grand ferait échouer la requête SQL au lieu d'un refus 400.
const ID_SQL_MAX = 2147483647;

// Le corps doit être un objet JSON : null, un tableau ou une chaîne seraient
// acceptés par express.json() mais feraient planter la déstructuration.
function estObjetJson(corps) {
  return corps !== null && typeof corps === 'object' && !Array.isArray(corps);
}

// Identifiant SQL valide : entier positif dans la plage INTEGER.
function estIdentifiantSql(valeur) {
  return Number.isInteger(valeur) && valeur > 0 && valeur <= ID_SQL_MAX;
}

module.exports = { ID_SQL_MAX, estObjetJson, estIdentifiantSql };
