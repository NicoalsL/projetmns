import { fermerSession } from '../auth/session';

const URL_BASE = import.meta.env.VITE_API_URL ?? '';
const DELAI_LIBERATION_FICHIER_MS = 1000;

function lireCookie(nom) {
  const valeur = document.cookie.split('; ').find(x => x.startsWith(nom + '='));
  return valeur ? decodeURIComponent(valeur.slice(nom.length + 1)) : '';
}

async function envoyer(chemin, options = {}) {
  const estRouteAuth = chemin.startsWith('/api/auth/');
  const methode = (options.method || 'GET').toUpperCase();
  const csrf = lireCookie(import.meta.env.PROD ? '__Host-eduquizai_csrf' : 'eduquizai_csrf');
  let reponse;
  try {
    reponse = await fetch(URL_BASE + chemin, {
      ...options,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(!['GET','HEAD','OPTIONS'].includes(methode) && csrf ? { 'X-CSRF-Token': csrf } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.');
  }
  if (reponse.status === 401 && !estRouteAuth) {
    fermerSession();
    throw new Error('Votre session a expiré. Reconnectez-vous.');
  }
  if (!reponse.ok) {
    const donnees = await reponse.json().catch(() => ({}));
    const erreur = new Error(donnees.erreur || 'Erreur de communication avec le serveur');
    erreur.status = reponse.status;
    erreur.details = donnees;
    throw erreur;
  }
  return reponse;
}
async function appelApi(chemin, options = {}) {
  const reponse = await envoyer(chemin, options);
  return reponse.status === 204 ? {} : reponse.json().catch(() => ({}));
}
export async function telechargerFichier(chemin, nomFichier) {
  const reponse = await envoyer(chemin);
  const fichier = await reponse.blob();
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(fichier);
  lien.download = nomFichier;
  lien.click();
  setTimeout(() => URL.revokeObjectURL(lien.href), DELAI_LIBERATION_FICHIER_MS);
}
export default appelApi;
