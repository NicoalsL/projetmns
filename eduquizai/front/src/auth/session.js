// Rôle : état de la session côté navigateur (qui est connecté, jusqu'à quand),
// partagé par toutes les pages, et prévenu des changements faits dans un autre onglet.
// Le JWT n'est jamais exposé à React : le navigateur garde un cookie HttpOnly.
// Les informations ci-dessous décrivent seulement l'interface (non sensibles).

// import.meta.env n'existe pas hors de Vite (tests lancés par Node) : d'où le « ?. ».
const URL_BASE = import.meta.env?.VITE_API_URL ?? ''
// Délai maximal accepté par setTimeout (environ 24,8 jours) : au-delà, il se déclenche aussitôt.
const DELAI_MAX_MINUTEUR_MS = 2147483647
// Clé localStorage écrite par un onglet pour prévenir les autres (événement « storage »).
const CLE_CHANGEMENT_SESSION = 'eduquizai-session-changed'

let etat = null
// Numéro de la dernière demande : une réponse arrivée trop tard est ignorée.
let sequence = 0
const observateurs = new Set()
let minuteurExpiration = null

// Ferme la session dès son expiration, sans attendre une requête refusée par l'API.
function programmerExpiration() {
  clearTimeout(minuteurExpiration)
  if (etat?.expiration > Date.now()) {
    const delai = Math.min(etat.expiration - Date.now(), DELAI_MAX_MINUTEUR_MS)
    minuteurExpiration = setTimeout(() => {
      if (etat && etat.expiration <= Date.now()) {
        fermerSession()
      } else {
        programmerExpiration()
      }
    }, delai)
  }
}

export function sessionValide() {
  return Boolean(etat && etat.expiration > Date.now())
}

export function compteDuJeton() {
  return etat?.id_utilisateur ?? null
}

export function tempsRestantSession() {
  return Math.max(0, (etat?.expiration ?? 0) - Date.now())
}

export function obtenirSession() {
  return etat
}

function notifier() {
  for (const observateur of observateurs) {
    observateur(etat)
  }
}

export function definirSession(nouvelEtat) {
  sequence += 1
  etat = nouvelEtat && nouvelEtat.expiration > Date.now() ? nouvelEtat : null
  programmerExpiration()
  notifier()
  window.dispatchEvent(new Event('session-modifiee'))
}

export function fermerSession() {
  definirSession(null)
}

// Demande au serveur l'état réel de la session (au chargement, au retour sur l'onglet).
export async function chargerSession() {
  localStorage.removeItem('jeton') // purge de l'ancien mode de stockage
  sequence += 1
  const requete = sequence

  try {
    const reponse = await fetch(URL_BASE + '/api/compte/session', {
      credentials: 'same-origin',
      cache: 'no-store',
    })
    if (!reponse.ok) {
      throw new Error('Session indisponible')
    }
    const donnees = await reponse.json()
    if (requete === sequence) {
      etat = donnees
      programmerExpiration()
      notifier()
    }
  } catch {
    if (requete === sequence) {
      etat = null
      programmerExpiration()
      notifier()
    }
  }
  return etat
}

// Abonne une fonction aux changements de session ; renvoie la fonction d'arrêt.
export function surveillerSession(notifierEtat) {
  observateurs.add(notifierEtat)
  notifierEtat(etat)

  function surFocus() {
    chargerSession()
  }

  function surOnglet(evenement) {
    if (evenement.key === CLE_CHANGEMENT_SESSION) {
      chargerSession()
    }
  }

  window.addEventListener('focus', surFocus)
  window.addEventListener('storage', surOnglet)
  return () => {
    observateurs.delete(notifierEtat)
    window.removeEventListener('focus', surFocus)
    window.removeEventListener('storage', surOnglet)
  }
}

export function signalerAutresOnglets() {
  localStorage.setItem(CLE_CHANGEMENT_SESSION, String(Date.now()))
}
