const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

// Rôle : créer ou compléter back/.env (npm run config:init) :
// - génère un JWT_SECRET aléatoire s'il manque ;
// - génère le mot de passe du compte PostgreSQL de l'API (« A_GENERER ») ;
// - met à niveau un ancien .env à un seul compte : l'ancien compte devient
//   DATABASE_URL_ADMIN (propriétaire), et l'API reçoit son propre compte restreint.
// Aucun secret n'est jamais affiché dans la console.

const fichierEnv = path.join(__dirname, '../.env');
const fichierExemple = path.join(__dirname, '../.env.example');
const REGEX_LIGNE_SECRET = /^JWT_SECRET=(.*)$/m;
const REGEX_SECRET_VALIDE = /^[a-f0-9]{64,}$/i;
const REGEX_LIGNE_BASE = /^DATABASE_URL=(.*)$/m;
const COMPTE_API = 'eduquizai_app';

// 32 octets issus du générateur cryptographique du système, en hexadécimal
// (aucun caractère à échapper dans une URL de connexion).
function secretAleatoire() {
  return randomBytes(32).toString('hex');
}

// Ajoute ou remplace une ligne CLE=valeur.
function ecrireLigne(contenu, cle, valeur) {
  const regex = new RegExp('^' + cle + '=.*$', 'm');
  const ligne = cle + '=' + valeur;
  return regex.test(contenu) ? contenu.replace(regex, ligne) : contenu.trimEnd() + '\n' + ligne + '\n';
}

let contenu = fs.existsSync(fichierEnv)
  ? fs.readFileSync(fichierEnv, 'utf8')
  : fs.readFileSync(fichierExemple, 'utf8');
const modifications = [];

// 1. Secret des jetons de connexion.
const secretActuel = contenu.match(REGEX_LIGNE_SECRET)?.[1].trim() || '';
if (!REGEX_SECRET_VALIDE.test(secretActuel)) {
  contenu = ecrireLigne(contenu, 'JWT_SECRET', secretAleatoire());
  modifications.push('Secret JWT généré (les anciennes sessions devront se reconnecter).');
}

// 2. Ancien .env à un seul compte : il devient le compte propriétaire.
const urlBase = contenu.match(REGEX_LIGNE_BASE)?.[1].trim();
if (urlBase && !/^DATABASE_URL_ADMIN=/m.test(contenu)) {
  const adresse = new URL(urlBase);
  contenu = ecrireLigne(contenu, 'DATABASE_URL_ADMIN', urlBase);
  adresse.username = COMPTE_API;
  adresse.password = 'A_GENERER';
  contenu = ecrireLigne(contenu, 'DATABASE_URL', adresse.toString());
  modifications.push('Ancien compte PostgreSQL conservé comme compte propriétaire (DATABASE_URL_ADMIN).');
}

// 3. Mot de passe du compte de l'API.
if (contenu.includes(':A_GENERER@')) {
  contenu = contenu.replace(':A_GENERER@', ':' + secretAleatoire() + '@');
  modifications.push(`Mot de passe du compte PostgreSQL de l'API (${COMPTE_API}) généré.`);
}

if (modifications.length === 0) {
  console.log('Configuration existante conservée.');
} else {
  // mode 0o600 : fichier lisible uniquement par son propriétaire (Linux/Mac).
  fs.writeFileSync(fichierEnv, contenu, { mode: 0o600 });
  modifications.forEach((message) => console.log(message));
  console.log('Lancer ensuite npm run db:init pour créer le compte dans la base.');
}
