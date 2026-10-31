import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

// Dans une application React, changer de page ne recharge pas le navigateur :
// sans aide, le focus clavier resterait sur le lien cliqué (ou sur <body>) et
// la page resterait défilée. À chaque changement d'adresse, on remonte en haut
// et on place le focus sur le titre <h1> de la nouvelle page (ou, s'il n'est
// pas encore chargé, sur la zone de contenu) : le lecteur d'écran l'annonce.
// Composant sans affichage, placé une seule fois dans App.jsx.
function GestionNavigation() {
  const { pathname } = useLocation()
  const adressePrecedente = useRef(pathname)

  useEffect(() => {
    // Premier affichage : le navigateur gère lui-même le focus initial.
    if (adressePrecedente.current === pathname) {
      return
    }
    adressePrecedente.current = pathname

    window.scrollTo(0, 0)
    const cible = document.querySelector('#contenu h1') || document.getElementById('contenu')
    cible.setAttribute('tabindex', '-1')
    cible.focus({ preventScroll: true })
  }, [pathname])

  return null
}

export default GestionNavigation
