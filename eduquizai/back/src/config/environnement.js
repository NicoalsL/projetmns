// Rôle : vérifier les réglages du serveur (fichier .env) au démarrage.
// Si un réglage est absent ou dangereux, le serveur REFUSE de démarrer, avec
// un message clair, plutôt que de tourner mal configuré.
// SÉCURITÉ — Les secrets restent dans .env, jamais dans Git (.gitignore).

// Secret qui signe les jetons de connexion : 64 caractères hexadécimaux minimum
// (32 octets aléatoires). Un secret faible comme « change-moi » permettrait à
// n'importe qui de fabriquer de faux jetons.
const REGEX_SECRET_JWT = /^[a-f0-9]{64,}$/i;

// Point d'entrée : appelé par serveur.js avant tout le reste.
// env est un paramètre (process.env par défaut) pour pouvoir tester la fonction
// avec de faux réglages, sans toucher aux vrais.
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

  if (env.NODE_ENV === 'production' && !env.ORIGINE_FRONT) {
    throw new Error('ORIGINE_FRONT est obligatoire en production.');
  }
  if (env.ORIGINE_FRONT) {
    verifierOrigineFront(env.ORIGINE_FRONT);
  }

  // Nombre de serveurs intermédiaires (proxys) devant l'API, voir app.js.
  // Doit rester un petit entier : une valeur mal réglée permettrait à un client
  // de faire croire à n'importe quelle adresse IP (et de contourner les limites).
  if (env.TRUST_PROXY !== undefined && !/^[1-5]$/.test(env.TRUST_PROXY)) {
    throw new Error('TRUST_PROXY doit être un entier entre 1 et 5 (nombre de proxys devant l\'API).');
  }
}

function verifierUrlMongo(valeur) {
  if (typeof valeur !== 'string' || !/^mongodb(\+srv)?:\/\/.+/.test(valeur)) {
    throw new Error('MONGO_URL est requise et doit commencer par mongodb://');
  }
}

// Les 3 fournisseurs d'IA possibles :
// - « simulation » (par défaut) : faux quiz sans IA, pour développer et tester sans clé ;
// - « openai » : exige une clé, sinon chaque génération échouerait ;
// - « ollama » : IA locale ; son adresse, si elle est donnée, doit être sûre (voir plus bas).
function verifierFournisseurIa(env) {
  const fournisseur = env.IA_FOURNISSEUR || 'simulation';
  if (!['simulation', 'openai', 'ollama'].includes(fournisseur)) {
    throw new Error('IA_FOURNISSEUR doit valoir simulation, openai ou ollama.');
  }
  if (fournisseur === 'openai' && !env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY est requise quand IA_FOURNISSEUR=openai.');
  }
  // Durée pendant laquelle Ollama garde le modèle en mémoire : 30m, 2h… ou -1 (toujours).
  if (env.OLLAMA_CONSERVATION && !/^(\d+[smh]|-1)$/.test(env.OLLAMA_CONSERVATION)) {
    throw new Error('OLLAMA_CONSERVATION doit valoir par exemple 30m, 2h ou -1.');
  }
  if (fournisseur === 'ollama' && env.OLLAMA_URL) {
    verifierUrlOllama(env.OLLAMA_URL);
  }
}

// Adresses « locales » : la machine elle-même, ou la machine hôte vue depuis
// un conteneur Docker. Vers elles, les cours ne passent jamais sur un réseau.
const HOTES_LOCAUX = ['localhost', '127.0.0.1', '[::1]', 'host.docker.internal'];

// SÉCURITÉ — Ollama n'a pas de mot de passe. On accepte donc le HTTP non chiffré
// seulement en local ; vers une autre machine, HTTPS est obligatoire, sinon les
// cours des enseignants circuleraient en clair sur le réseau.
function verifierUrlOllama(valeur) {
  let adresse;
  try {
    adresse = new URL(valeur);
  } catch {
    throw new Error('OLLAMA_URL doit être une URL HTTP(S), par exemple http://host.docker.internal:11434.');
  }
  if (!['http:', 'https:'].includes(adresse.protocol)) {
    throw new Error('OLLAMA_URL doit être une URL HTTP(S), par exemple http://host.docker.internal:11434.');
  }
  if (adresse.protocol === 'http:' && !HOTES_LOCAUX.includes(adresse.hostname)) {
    throw new Error('OLLAMA_URL vers une autre machine doit utiliser HTTPS (les cours ne circulent pas en clair).');
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

// Adresse du site autorisé à appeler l'API (règle CORS du navigateur).
// Elle doit être exacte : protocole + nom + port, sans chemin ni « / » final.
// Sinon elle ne correspondrait jamais et le site serait bloqué.
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
