// Rôle : petits contrôles partagés par les middlewares de validation.

// Plus grand nombre accepté par PostgreSQL pour un identifiant : au-delà,
// la requête planterait (500) au lieu d'un refus propre (400).
const ID_SQL_MAX = 2147483647;

// SÉCURITÉ — Le corps doit être un objet JSON. null, un tableau ou un texte
// seraient acceptés par Express mais feraient planter la suite.
function estObjetJson(corps) {
  return corps !== null && typeof corps === 'object' && !Array.isArray(corps);
}

// Identifiant SQL valide : entier positif dans la plage INTEGER.
function estIdentifiantSql(valeur) {
  return Number.isInteger(valeur) && valeur > 0 && valeur <= ID_SQL_MAX;
}

module.exports = { ID_SQL_MAX, estObjetJson, estIdentifiantSql };
