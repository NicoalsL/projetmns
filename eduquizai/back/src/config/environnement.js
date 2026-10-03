// Un secret JWT faible ("change-moi") permettrait à n'importe qui de fabriquer
// un jeton valide : on exige 32 octets aléatoires, soit 64 caractères hexa.
const REGEX_SECRET_JWT = /^[a-f0-9]{64,}$/i;

// Vérifie la configuration au démarrage : mieux vaut refuser de démarrer avec
// un message clair que tourner avec une configuration dangereuse ou cassée.
// Reçoit env en paramètre pour pouvoir être testée sans toucher process.env.
function verifierEnvironnement(env = process.env) {
  if (!REGEX_SECRET_JWT.test(env.JWT_SECRET || '')) {
    throw new Error('JWT_SECRET doit être un secret aléatoire hexadécimal de 64 caractères minimum. Exécuter npm run config:init.');
  }

  verifierUrlBase(env.DATABASE_URL);

  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT doit être compris entre 1 et 65535.');
  }

  if (env.ORIGINE_FRONT) {
    verifierOrigineFront(env.ORIGINE_FRONT);
  }
}

function verifierUrlBase(valeur) {
  let adresse;
  try {
    adresse = new URL(valeur);
  } catch {
    throw new Error('DATABASE_URL PostgreSQL est requise et doit être une URL valide.');
  }
  if (!['postgres:', 'postgresql:'].includes(adresse.protocol)) {
    throw new Error('DATABASE_URL doit utiliser PostgreSQL.');
  }
}

// CORS compare l'origine exacte (protocole + hôte + port) : un chemin ou une
// barre finale ("http://site/") ne correspondrait jamais et bloquerait le front.
function verifierOrigineFront(valeur) {
  let origine;
  try {
    origine = new URL(valeur);
  } catch {
    throw new Error('ORIGINE_FRONT invalide.');
  }
  if (!['http:', 'https:'].includes(origine.protocol) || origine.origin !== valeur) {
    throw new Error('ORIGINE_FRONT doit contenir uniquement une origine HTTP(S).');
  }
}

module.exports = verifierEnvironnement;
