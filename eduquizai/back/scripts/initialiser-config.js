const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

// Crée back/.env à partir de .env.example (npm run config:init) et y génère
// un JWT_SECRET aléatoire. Le secret n'est jamais affiché dans la console.

const fichierEnv = path.join(__dirname, '../.env');
const fichierExemple = path.join(__dirname, '../.env.example');
const REGEX_LIGNE_SECRET = /^JWT_SECRET=(.*)$/m;
const REGEX_SECRET_VALIDE = /^[a-f0-9]{64,}$/i;

let contenu = fs.existsSync(fichierEnv)
  ? fs.readFileSync(fichierEnv, 'utf8')
  : fs.readFileSync(fichierExemple, 'utf8');

const secretActuel = contenu.match(REGEX_LIGNE_SECRET)?.[1].trim() || '';

if (REGEX_SECRET_VALIDE.test(secretActuel)) {
  console.log('Configuration existante conservée.');
} else {
  // 32 octets issus du générateur cryptographique du système, en hexadécimal.
  const nouvelleLigne = 'JWT_SECRET=' + randomBytes(32).toString('hex');
  contenu = REGEX_LIGNE_SECRET.test(contenu)
    ? contenu.replace(REGEX_LIGNE_SECRET, nouvelleLigne)
    : contenu + '\n' + nouvelleLigne + '\n';

  // mode 0o600 : fichier lisible uniquement par son propriétaire (Linux/Mac).
  fs.writeFileSync(fichierEnv, contenu, { mode: 0o600 });
  console.log('Secret JWT généré. Les anciennes sessions devront se reconnecter.');
}
