import { fermerSession } from '../auth/session'

// ?? et non || : en production, le front et l'API sont servis par le même
// serveur (nginx) et VITE_API_URL vaut "" (chemins relatifs /api/...).
const URL_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// Délai avant de libérer l'adresse temporaire du fichier téléchargé (en ms).
const DELAI_LIBERATION_FICHIER_MS = 1000

// Envoie la requête avec le jeton JWT et traite les erreurs communes.
// Renvoie la réponse HTTP brute (corps non lu) si elle est réussie.
async function envoyer(chemin, options = {}) {
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

  if (reponse.status === 401 && !estRouteAuth) {
    // Une réponse tardive d'une ancienne session ne déconnecte pas la nouvelle.
    if (localStorage.getItem('jeton') === jeton) {
      fermerSession()
    }
    throw new Error('Votre session a expiré. Reconnectez-vous.')
  }

  if (!reponse.ok) {
    const donnees = await reponse.json().catch(() => ({}))
    const erreur = new Error(donnees.erreur || 'Erreur de communication avec le serveur')
    // Le statut permet aux pages de réagir différemment (ex. 404).
    erreur.status = reponse.status
    // Précisions éventuelles de l'API (ex. { question: 3, champ: 'choix' }) :
    // la page peut marquer le champ fautif.
    erreur.details = donnees
    throw erreur
  }

  return reponse
}

// Point d'entrée unique vers le back : ajoute automatiquement le jeton JWT
// stocké après connexion et lève une erreur exploitable en cas d'échec.
async function appelApi(chemin, options = {}) {
  const reponse = await envoyer(chemin, options)
  return reponse.json().catch(() => ({}))
}

// Télécharge un fichier renvoyé par l'API (export JSON ou CSV d'un quiz).
// Un simple lien <a href> ne suffit pas : l'API exige le jeton JWT dans
// l'en-tête Authorization, qu'un lien ne peut pas envoyer.
export async function telechargerFichier(chemin, nomFichier) {
  const reponse = await envoyer(chemin)
  const fichier = await reponse.blob()

  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(fichier)
  lien.download = nomFichier
  lien.click()
  // Libération différée : révoquer l'adresse tout de suite peut annuler le
  // téléchargement dans certains navigateurs.
  setTimeout(() => URL.revokeObjectURL(lien.href), DELAI_LIBERATION_FICHIER_MS)
}

export default appelApi
