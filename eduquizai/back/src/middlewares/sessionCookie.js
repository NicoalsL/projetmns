const { createHmac, timingSafeEqual } = require('node:crypto');
const { signalerEvenementSecurite } = require('../services/alertesSecurite.service');

const PRODUCTION = process.env.NODE_ENV === 'production';
const NOM_SESSION = PRODUCTION ? '__Host-eduquizai_session' : 'eduquizai_session';
const NOM_CSRF = PRODUCTION ? '__Host-eduquizai_csrf' : 'eduquizai_csrf';
const AGE_SESSION_MS = 2 * 60 * 60 * 1000;

function cookies(requete) {
  return Object.fromEntries((requete.headers.cookie || '').split(';').map(item => {
    const index = item.indexOf('=');
    if (index < 0) return ['', ''];
    try { return [item.slice(0, index).trim(), decodeURIComponent(item.slice(index + 1))]; }
    catch { return ['', '']; }
  }).filter(([cle]) => cle));
}

function optionsCookie(httpOnly, maxAge = AGE_SESSION_MS) {
  return { httpOnly, secure: PRODUCTION, sameSite: 'strict', path: '/', maxAge };
}

function csrfPourJeton(jeton) {
  return createHmac('sha256', process.env.JWT_SECRET).update('eduquizai-csrf-v1:' + jeton).digest('hex');
}

function deposerSession(reponse, jeton) {
  reponse.cookie(NOM_SESSION, jeton, optionsCookie(true));
  reponse.cookie(NOM_CSRF, csrfPourJeton(jeton), optionsCookie(false));
}

function effacerSession(reponse) {
  reponse.clearCookie(NOM_SESSION, { httpOnly: true, secure: PRODUCTION, sameSite: 'strict', path: '/' });
  reponse.clearCookie(NOM_CSRF, { httpOnly: false, secure: PRODUCTION, sameSite: 'strict', path: '/' });
}

function origineAttendue() {
  return process.env.ORIGINE_FRONT || (PRODUCTION ? null : 'http://localhost:5173');
}

// Origin est obligatoire pour les écritures du navigateur. Les scripts API sans
// Origin continuent d'utiliser Bearer (voir middleware CSRF).
function verifierOrigine(requete, reponse, suite) {
  const origine = requete.get('origin');
  const attendue = origineAttendue(requete);
  if (origine && (!attendue || origine !== attendue)) {
    signalerEvenementSecurite('origine_refusee');
    return reponse.status(403).json({ erreur: 'Origine non autorisée' });
  }
  if (!origine && requete.headers['sec-fetch-site'] === 'cross-site') {
    signalerEvenementSecurite('origine_refusee');
    return reponse.status(403).json({ erreur: 'Origine requise' });
  }
  suite();
}

function verifierCsrf(requete, reponse, suite) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(requete.method)) return suite();
  // Les clients API Bearer sont authentifiés par leur jeton explicite :
  // ils n'utilisent pas la session cookie même si leur jar contient un cookie.
  if (requete.headers.authorization?.startsWith('Bearer ')) return suite();
  // Inscription et connexion : protection contre le login-CSRF par Origin/SameSite.
  if (requete.path?.startsWith('/auth/')) return suite();
  const valeurs = cookies(requete);
  const jetonSession = valeurs[NOM_SESSION];
  if (!jetonSession) return suite(); // Scripts Bearer uniquement, sans cookie.
  const attendu = csrfPourJeton(jetonSession);
  const envoye = requete.get('x-csrf-token') || '';
  const dansCookie = valeurs[NOM_CSRF] || '';
  const a = Buffer.from(attendu);
  const b = Buffer.from(envoye);
  const c = Buffer.from(dansCookie);
  if (a.length !== b.length || a.length !== c.length
      || !timingSafeEqual(a, b) || !timingSafeEqual(a, c)) {
    signalerEvenementSecurite('csrf_refuse');
    return reponse.status(403).json({ erreur: 'Protection CSRF : jeton absent ou invalide' });
  }
  suite();
}

module.exports = {
  NOM_SESSION, NOM_CSRF, cookies, deposerSession, effacerSession,
  verifierOrigine, verifierCsrf,
};
