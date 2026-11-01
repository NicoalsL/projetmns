import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

// Menu « Mon compte » de l'en-tête : un bouton qui déplie « Gérer mon compte »
// et « Se déconnecter ». Sur mobile, le CSS cache ce bouton et affiche les deux
// entrées directement dans le menu « Menu » : un seul clic au lieu de deux.
// La liste est donc montrée ou cachée par le CSS (classe « ouvert ») et non par
// l'attribut hidden, que le CSS ne pourrait pas annuler sur mobile.
// ACCESSIBILITÉ — Modèle « disclosure » (bouton + liste) du guide ARIA du W3C,
// et non role="menu" : ce sont de simples liens de navigation, parcourus avec
// Tab et Entrée comme le reste de la page. aria-expanded annonce l'état
// ouvert / fermé ; Échap referme et rend le focus au bouton ; un clic ailleurs
// ou le focus qui sort du menu le referme aussi.
function MenuCompte({ surDeconnexion, deconnexionEnCours }) {
  const [ouvert, setOuvert] = useState(false)
  const conteneur = useRef(null)
  const bouton = useRef(null)
  // Le bouton est mis en avant sur la page « Mon compte », comme un lien actif.
  const surPageCompte = useLocation().pathname.startsWith('/compte')

  // Clic en dehors du menu : on le referme. L'écouteur n'existe que menu ouvert.
  useEffect(() => {
    if (!ouvert) {
      return undefined
    }

    function fermerSiClicAilleurs(evenement) {
      if (!conteneur.current.contains(evenement.target)) {
        setOuvert(false)
      }
    }

    document.addEventListener('click', fermerSiClicAilleurs)
    return () => document.removeEventListener('click', fermerSiClicAilleurs)
  }, [ouvert])

  function surTouche(evenement) {
    if (evenement.key !== 'Escape' || !ouvert) {
      return
    }
    // Échap ne referme que ce menu, pas le menu mobile qui le contient.
    evenement.stopPropagation()
    setOuvert(false)
    bouton.current.focus()
  }

  // Tab au-delà du dernier élément : le focus quitte le menu, on le referme.
  function surSortieFocus(evenement) {
    if (!conteneur.current.contains(evenement.relatedTarget)) {
      setOuvert(false)
    }
  }

  return (
    <div
      className={ouvert ? 'menu-compte ouvert' : 'menu-compte'}
      ref={conteneur}
      onKeyDown={surTouche}
      onBlur={surSortieFocus}
    >
      <button
        type="button"
        ref={bouton}
        className={surPageCompte ? 'actif' : undefined}
        aria-expanded={ouvert}
        aria-controls="menu-compte-liste"
        onClick={() => setOuvert(!ouvert)}
      >
        Mon compte
      </button>

      <ul id="menu-compte-liste">
        <li><NavLink to="/compte">Gérer mon compte</NavLink></li>
        <li>
          <button type="button" onClick={surDeconnexion} disabled={deconnexionEnCours}>
            Se déconnecter
          </button>
        </li>
      </ul>
    </div>
  )
}

export default MenuCompte
