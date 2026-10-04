// Gestion de la session côté navigateur (jeton JWT stocké dans localStorage).
// Ces contrôles servent uniquement l'interface : seule l'API vérifie la
// signature du jeton et les droits de l'utilisateur.

// setTimeout ne gère pas un délai supérieur à ~24,8 jours (2^31 - 1 ms).
const DELAI_MAX_MINUTEUR = 2147483647

// Lit la date d'expiration ("exp", en secondes) contenue dans un JWT.
// Un JWT = entete.contenu.signature, chaque partie encodée en base64url.
// Renvoie la date en millisecondes, ou null si le jeton est absent ou illisible.
function lireExpiration(jeton) {
  if (typeof jeton !== 'string' || jeton.split('.').length !== 3) return null

  try {
    // base64url -> base64 classique (seul format compris par atob), avec le
    // remplissage "=" final que base64url supprime.
    const base64 = jeton.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const base64Complete = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const contenu = JSON.parse(atob(base64Complete))

    const expiration = contenu.exp * 1000
    return typeof contenu.exp === 'number' && Number.isFinite(expiration) ? expiration : null
  } catch {
    return null
  }
}

export function sessionValide(jeton = localStorage.getItem('jeton')) {
  const expiration = lireExpiration(jeton)
  return expiration !== null && expiration > Date.now()
}

// Nombre de millisecondes avant l'expiration de la session.
export function tempsRestantSession(jeton = localStorage.getItem('jeton')) {
  const expiration = lireExpiration(jeton)
  return expiration === null ? 0 : Math.max(0, expiration - Date.now())
}

// Surveille la session et appelle notifier(jeton) à chaque changement :
// notifier(null) quand la session est perdue (expiration, déconnexion).
// Renvoie une fonction d'arrêt, à appeler au démontage du composant.
export function surveillerSession(notifier) {
  let minuteur

  function verifier() {
    clearTimeout(minuteur)
    const jeton = localStorage.getItem('jeton')
    const valide = sessionValide(jeton)
    notifier(valide ? jeton : null)

    // Un seul minuteur, reprogrammé à chaque vérification : si le jeton est
    // renouvelé (reconnexion dans un autre onglet), l'échéance suit le nouveau.
    if (valide) {
      minuteur = setTimeout(verifier, Math.min(tempsRestantSession(jeton), DELAI_MAX_MINUTEUR))
    }
  }

  // L'événement "storage" n'est reçu que par les AUTRES onglets ; key === null
  // signifie que tout le localStorage a été vidé.
  function stockageModifie(evenement) {
    if (evenement.key === 'jeton' || evenement.key === null) verifier()
  }

  window.addEventListener('session-expiree', verifier) // déconnexion dans cet onglet
  window.addEventListener('storage', stockageModifie) // changement dans un autre onglet
  window.addEventListener('focus', verifier) // retour sur l'onglet (sortie de veille)
  verifier()

  return () => {
    clearTimeout(minuteur)
    window.removeEventListener('session-expiree', verifier)
    window.removeEventListener('storage', stockageModifie)
    window.removeEventListener('focus', verifier)
  }
}

// Supprime le jeton et prévient les routes protégées pour qu'elles
// redirigent vers la connexion.
export function fermerSession() {
  localStorage.removeItem('jeton')
  window.dispatchEvent(new Event('session-expiree'))
}
