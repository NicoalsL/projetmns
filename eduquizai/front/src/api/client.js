import { fermerSession } from '../auth/session'

// Rôle : seul point d'appel à l'API. Il ajoute le cookie de session et le jeton
// CSRF, et transforme toute réponse en erreur lisible par l'utilisateur.

const URL_BASE = import.meta.env.VITE_API_URL ?? ''
const DELAI_LIBERATION_FICHIER_MS = 1000
// En production, le préfixe __Host- interdit au cookie d'être posé par un sous-domaine.
const NOM_COOKIE_CSRF = import.meta.env.PROD ? '__Host-eduquizai_csrf' : 'eduquizai_csrf'
// Méthodes qui ne modifient rien : elles n'ont pas besoin du jeton CSRF.
const METHODES_SANS_MODIFICATION = ['GET', 'HEAD', 'OPTIONS']

function lireCookie(nom) {
  const valeur = document.cookie.split('; ').find((cookie) => cookie.startsWith(nom + '='))
  return valeur ? decodeURIComponent(valeur.slice(nom.length + 1)) : ''
}

// SÉCURITÉ — Le jeton CSRF (lisible par notre page, pas par un autre site) est
// recopié dans un en-tête : le serveur vérifie que les deux correspondent.
function enTeteCsrf(methode) {
  const csrf = lireCookie(NOM_COOKIE_CSRF)
  if (METHODES_SANS_MODIFICATION.includes(methode) || !csrf) {
    return {}
  }
  return { 'X-CSRF-Token': csrf }
}

async function envoyer(chemin, options = {}) {
  const estRouteAuth = chemin.startsWith('/api/auth/')
  const methode = (options.method || 'GET').toUpperCase()

  let reponse
  try {
    reponse = await fetch(URL_BASE + chemin, {
      ...options,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...enTeteCsrf(methode),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.')
  }

  // 401 hors connexion / inscription : la session a expiré ou a été révoquée.
  if (reponse.status === 401 && !estRouteAuth) {
    fermerSession()
    throw new Error('Votre session a expiré. Reconnectez-vous.')
  }

  if (!reponse.ok) {
    const donnees = await reponse.json().catch(() => ({}))
    const erreur = new Error(donnees.erreur || 'Erreur de communication avec le serveur')
    erreur.status = reponse.status
    erreur.details = donnees
    throw erreur
  }
  return reponse
}

// Appel classique : renvoie le corps JSON de la réponse ({} si elle est vide).
async function appelApi(chemin, options = {}) {
  const reponse = await envoyer(chemin, options)
  return reponse.status === 204 ? {} : reponse.json().catch(() => ({}))
}

// Téléchargement (export d'un quiz) : le fichier reçu est proposé à l'enregistrement.
export async function telechargerFichier(chemin, nomFichier) {
  const reponse = await envoyer(chemin)
  const fichier = await reponse.blob()
  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(fichier)
  lien.download = nomFichier
  lien.click()
  setTimeout(() => URL.revokeObjectURL(lien.href), DELAI_LIBERATION_FICHIER_MS)
}

export default appelApi
