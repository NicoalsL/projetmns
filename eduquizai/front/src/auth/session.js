// Le JWT n'est jamais exposé à React : le navigateur garde un cookie HttpOnly.
// Les informations ci-dessous décrivent seulement l'interface (non sensibles).
const URL_BASE = import.meta.env?.VITE_API_URL ?? '';
let etat = null;
let sequence = 0;
const observateurs = new Set();
let minuteurExpiration = null;
function programmerExpiration() {
  clearTimeout(minuteurExpiration);
  if (etat?.expiration > Date.now()) {
    minuteurExpiration = setTimeout(() => {
      if (etat && etat.expiration <= Date.now()) fermerSession();
      else programmerExpiration();
    }, Math.min(etat.expiration - Date.now(), 2147483647));
  }
}

export function sessionValide() {
  return Boolean(etat && etat.expiration > Date.now());
}
export function compteDuJeton() { return etat?.id_utilisateur ?? null; }
export function tempsRestantSession() { return Math.max(0, (etat?.expiration ?? 0) - Date.now()); }
export function obtenirSession() { return etat; }

function notifier() { for (const fn of observateurs) fn(etat); }
export function definirSession(nouvelEtat) {
  sequence += 1;
  etat = nouvelEtat && nouvelEtat.expiration > Date.now() ? nouvelEtat : null;
  programmerExpiration();
  notifier();
  window.dispatchEvent(new Event('session-modifiee'));
}
export function fermerSession() { definirSession(null); }

export async function chargerSession() {
  localStorage.removeItem('jeton'); // purge de l'ancien mode de stockage
  const requete = ++sequence;
  try {
    const reponse = await fetch(URL_BASE + '/api/compte/session', { credentials: 'same-origin', cache: 'no-store' });
    if (!reponse.ok) throw new Error('Session indisponible');
    const donnees = await reponse.json();
    if (requete === sequence) {
      etat = donnees;
      programmerExpiration();
      notifier();
    }
  } catch {
    if (requete === sequence) { etat = null; programmerExpiration(); notifier(); }
  }
  return etat;
}

export function surveillerSession(notifierEtat) {
  observateurs.add(notifierEtat);
  notifierEtat(etat);
  const surFocus = () => { chargerSession(); };
  const surOnglet = (event) => { if (event.key === 'eduquizai-session-changed') chargerSession(); };
  window.addEventListener('focus', surFocus);
  window.addEventListener('storage', surOnglet);
  return () => {
    observateurs.delete(notifierEtat);
    window.removeEventListener('focus', surFocus);
    window.removeEventListener('storage', surOnglet);
  };
}
export function signalerAutresOnglets() {
  localStorage.setItem('eduquizai-session-changed', String(Date.now()));
}
