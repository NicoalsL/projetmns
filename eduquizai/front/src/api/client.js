import { fermerSession } from '../auth/session'

const URL_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Point d'entrée unique vers le back : ajoute automatiquement le jeton JWT
// stocké après connexion et lève une erreur exploitable en cas d'échec.
async function appelApi(chemin, options = {}) {
  const jeton = localStorage.getItem('jeton')
  // Les routes de connexion/inscription n'ont pas besoin du jeton, et un 401
  // y signifie "mauvais identifiants", pas "session expirée".
  const estRouteAuth = chemin.startsWith('/api/auth/')

  let reponse
  try {
    reponse = await fetch(URL_BASE + chemin, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(jeton && !estRouteAuth ? { Authorization: 'Bearer ' + jeton } : {}),
        ...options.headers,
      },
    })
  } catch {
    // fetch n'échoue que si le serveur est injoignable (réseau, back arrêté).
    throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.')
  }

  const donnees = await reponse.json().catch(() => ({}))

  if (reponse.status === 401 && !estRouteAuth) {
    // Une réponse tardive d'une ancienne session ne déconnecte pas la nouvelle.
    if (localStorage.getItem('jeton') === jeton) fermerSession()
    throw new Error('Votre session a expiré. Reconnectez-vous.')
  }

  if (!reponse.ok) {
    const erreur = new Error(donnees.erreur || 'Erreur de communication avec le serveur')
    // Le statut permet aux pages de réagir différemment (ex. 404).
    erreur.status = reponse.status
    throw erreur
  }

  return donnees
}

export default appelApi
