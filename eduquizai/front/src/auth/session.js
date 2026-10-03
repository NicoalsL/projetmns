function lireExpiration(jeton) {
  if (typeof jeton !== 'string' || jeton.split('.').length !== 3) return null
  try {
    const base64 = jeton.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const contenu = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')))
    const expiration = contenu.exp * 1000
    return typeof contenu.exp === 'number' && Number.isFinite(expiration) ? expiration : null
  } catch { return null }
}

// Contrôle d'interface : seule l'API vérifie la signature et les permissions.
export function sessionValide(jeton = localStorage.getItem('jeton')) {
  const expiration = lireExpiration(jeton)
  return expiration !== null && expiration > Date.now()
}
export function tempsRestantSession(jeton = localStorage.getItem('jeton')) {
  const expiration = lireExpiration(jeton)
  return expiration === null ? 0 : Math.max(0, expiration - Date.now())
}

export function surveillerSession(notifier) {
  let minuteur
  function verifier() {
    clearTimeout(minuteur)
    const jeton = localStorage.getItem('jeton')
    const valide = sessionValide(jeton)
    notifier(valide ? jeton : null)
    // Reprogrammer aussi lors d'un renouvellement depuis un autre onglet.
    if (valide) minuteur = setTimeout(verifier, Math.min(tempsRestantSession(jeton), 2147483647))
  }
  function stockageModifie(evenement) {
    if (evenement.key === 'jeton' || evenement.key === null) verifier()
  }
  window.addEventListener('session-expiree', verifier)
  window.addEventListener('storage', stockageModifie)
  window.addEventListener('focus', verifier)
  verifier()
  return () => {
    clearTimeout(minuteur)
    window.removeEventListener('session-expiree', verifier)
    window.removeEventListener('storage', stockageModifie)
    window.removeEventListener('focus', verifier)
  }
}

export function fermerSession() {
  localStorage.removeItem('jeton')
  window.dispatchEvent(new Event('session-expiree'))
}
