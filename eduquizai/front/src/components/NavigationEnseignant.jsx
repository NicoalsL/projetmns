import { useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import MenuCompte from './MenuCompte'

// Navigation de l'enseignant connecté, pensée d'abord pour le mobile : sur
// petit écran, les liens sont repliés derrière le bouton « Menu » ; à partir
// de 40rem (640 px), le CSS cache ce bouton et affiche les liens en ligne.
// EnTete donne à ce composant une clé égale à l'adresse de la page : à chaque
// changement de page, React le recrée et les menus repartent fermés.
function NavigationEnseignant({ surDeconnexion, deconnexionEnCours }) {
  const [menuOuvert, setMenuOuvert] = useState(false)
  const boutonMenu = useRef(null)

  // Échap referme le menu mobile et rend le focus à son bouton (MenuCompte
  // arrête l'événement si c'est lui qui est ouvert).
  function surTouche(evenement) {
    if (evenement.key !== 'Escape' || !menuOuvert) {
      return
    }
    setMenuOuvert(false)
    boutonMenu.current.focus()
  }

  return (
    <nav
      aria-label="Navigation principale"
      className={menuOuvert ? 'navigation-enseignant ouverte' : 'navigation-enseignant'}
      onKeyDown={surTouche}
    >
      <button
        type="button"
        ref={boutonMenu}
        className="bouton-menu"
        aria-expanded={menuOuvert}
        aria-controls="navigation-enseignant-liens"
        onClick={() => setMenuOuvert(!menuOuvert)}
      >
        Menu
      </button>

      <ul id="navigation-enseignant-liens">
        {/* end : "Mes cours" n'est pas la page courante sur /cours/nouveau */}
        <li><NavLink to="/dashboard" end>Mes cours</NavLink></li>
        <li><NavLink to="/cours/nouveau">Nouveau cours</NavLink></li>
        <li>
          <MenuCompte
            surDeconnexion={surDeconnexion}
            deconnexionEnCours={deconnexionEnCours}
          />
        </li>
      </ul>
    </nav>
  )
}

export default NavigationEnseignant
