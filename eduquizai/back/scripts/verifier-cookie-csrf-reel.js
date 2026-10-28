// Test HTTP réel (PostgreSQL) : cookie HttpOnly, CSRF et suppression du compte de test.
// Ne modifie que son compte synthétique, supprimé en fin d'exécution.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const api = process.env.API_URL || 'http://127.0.0.1:3000';
const email = 'csrf-' + randomUUID() + '@example.test';
const motDePasse = 'Verification-' + randomUUID();
let cookieHeader = '';
let csrf = '';
let inscrit = false;
let total = 0;
function check(reel, attendu, description) {
  assert.equal(reel, attendu, description); total++;
}
async function appel(chemin, method = 'GET', corps, avecCsrf = true) {
  return fetch(api + chemin, {
    method,
    headers: {
      Origin: 'http://localhost:5173',
      Cookie: cookieHeader,
      ...(corps ? { 'Content-Type': 'application/json' } : {}),
      ...(avecCsrf && csrf ? { 'X-CSRF-Token': csrf } : {}),
    },
    ...(corps ? { body: JSON.stringify(corps) } : {}),
  });
}
function releverCookies(reponse) {
  const cookiePairs = reponse.headers.getSetCookie().map(c => c.split(';')[0]);
  cookieHeader = cookiePairs.join('; ');
  const entree = cookiePairs.find(x => x.startsWith('eduquizai_csrf='));
  csrf = entree ? decodeURIComponent(entree.split('=').slice(1).join('=')) : '';
}
async function executer() {
  try {
    const inscription = await appel('/api/auth/inscription', 'POST', {
      nom: 'Test cookie CSRF', email, motDePasse, consentementRgpd: true,
    });
    check(inscription.status, 201, 'inscription');
    inscrit = true;
    const profil = await inscription.json();
    check(Object.hasOwn(profil, 'jeton'), false, 'JWT absent du JSON');
    const cookies = inscription.headers.getSetCookie();
    check(cookies.some(x => x.startsWith('eduquizai_session=') && /httponly/i.test(x)), true, 'session HttpOnly');
    check(cookies.some(x => x.startsWith('eduquizai_csrf=') && !/httponly/i.test(x)), true, 'cookie CSRF lisible');
    releverCookies(inscription);
    check((await appel('/api/compte/session')).status, 200, 'cookie authentifie');

    const cours = { titre: 'Test CSRF', contenuTexte: 'Texte de test' };
    check((await appel('/api/cours', 'POST', cours, false)).status, 403, 'CSRF manquant refusé');
    const mauvais = await fetch(api + '/api/cours', {
      method: 'POST',
      headers: { Origin: 'http://localhost:5173', Cookie: cookieHeader,
        'Content-Type': 'application/json', 'X-CSRF-Token': 'faux' },
      body: JSON.stringify(cours),
    });
    check(mauvais.status, 403, 'CSRF incorrect refusé');
    check((await appel('/api/cours', 'POST', cours)).status, 201, 'CSRF valide autorisé');
    check((await appel('/api/compte/session', 'POST')).status, 200, 'prolongation');
    console.log(total + ' vérifications HTTP cookies / CSRF réussies.');
  } finally {
    if (inscrit) {
      const r = await appel('/api/compte', 'DELETE', { motDePasse });
      if (r.status !== 204) console.error('Nettoyage à vérifier :', r.status, email);
    }
  }
}
executer().catch(err => { console.error(err); process.exitCode = 1; });
