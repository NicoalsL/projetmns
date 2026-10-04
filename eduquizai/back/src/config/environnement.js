// Un secret JWT faible ("change-moi") permettrait à n'importe qui de fabriquer
// un jeton valide : on exige 32 octets aléatoires, soit 64 caractères hexa.
const REGEX_SECRET_JWT = /^[a-f0-9]{64,}$/i;

// Vérifie la configuration au démarrage : mieux vaut refuser de démarrer avec
// un message clair que tourner avec une configuration dangereuse ou cassée.
// Reçoit env en paramètre pour pouvoir être testée sans toucher process.env.
function verifierEnvironnement(env = process.env) {
  if (!REGEX_SECRET_JWT.test(env.JWT_SECRET || '')) {
    throw new Error(
      'JWT_SECRET doit être un secret aléatoire hexadécimal de 64 caractères minimum. '
      + 'Exécuter npm run config:init.',
    );
  }

  verifierUrlBase(env.DATABASE_URL);
  verifierUrlMongo(env.MONGO_URL);
  verifierFournisseurIa(env);

  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT doit être compris entre 1 et 65535.');
  }

  if (env.ORIGINE_FRONT) {
    verifierOrigineFront(env.ORIGINE_FRONT);
  }

  // Nombre de proxys de confiance (voir app.js) : un petit entier, sinon un
  // client pourrait faire croire à n'importe quelle adresse IP.
  if (env.TRUST_PROXY !== undefined && !/^[1-5]$/.test(env.TRUST_PROXY)) {
    throw new Error('TRUST_PROXY doit être un entier entre 1 et 5 (nombre de proxys devant l\'API).');
  }
}

function verifierUrlMongo(valeur) {
  if (typeof valeur !== 'string' || !/^mongodb(\+srv)?:\/\/.+/.test(valeur)) {
    throw new Error('MONGO_URL est requise et doit commencer par mongodb://');
  }
}

// "simulation" (par défaut) génère des quiz sans IA, pour développer sans clé.
// "openai" exige une clé : sans elle, chaque génération échouerait.
// "ollama" utilise un modèle local ; son URL, si elle est fournie, doit être valide.
function verifierFournisseurIa(env) {
  const fournisseur = env.IA_FOURNISSEUR || 'simulation';
  if (!['simulation', 'openai', 'ollama'].includes(fournisseur)) {
    throw new Error('IA_FOURNISSEUR doit valoir simulation, openai ou ollama.');
  }
  if (fournisseur === 'openai' && !env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY est requise quand IA_FOURNISSEUR=openai.');
  }
  if (fournisseur === 'ollama' && env.OLLAMA_URL && !/^https?:\/\/[^/]+/.test(env.OLLAMA_URL)) {
    throw new Error('OLLAMA_URL doit être une URL HTTP(S), par exemple http://host.docker.internal:11434.');
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
