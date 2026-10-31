import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import appelApi from '../api/client'
import { fermerSession, sessionValide, signalerAutresOnglets } from '../auth/session'
import Logo from './Logo'

// En-tête unique, identique sur toutes les pages : le logo ramène toujours à
// l'accueil, puis la navigation dépend de la session.
// - visiteur : « Se connecter » et « Créer un compte » ;
// - enseignant connecté : « Mes cours », « Nouveau cours », « Se déconnecter ».
// NavLink ajoute lui-même aria-current="page" sur le lien de la page courante,
// attribut sur lequel la charte graphique s'appuie.
function EnTete() {
  const navigue = useNavigate()
  const [erreurDeconnexion, setErreurDeconnexion] = useState('')
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false)
  // useLocation fait réafficher l'en-tête à chaque changement de page : l'état
  // de la session (connexion, déconnexion, expiration) est donc relu à chaque fois.
  useLocation()
  const connecte = sessionValide()

  // Déconnexion côté serveur d'abord : tous les jetons du compte sont révoqués,
  // y compris une copie volée de celui-ci. Si le serveur est injoignable (ou le
  // jeton déjà invalide), la déconnexion locale a lieu quand même.
  async function deconnexion() {
    setDeconnexionEnCours(true)
    setErreurDeconnexion('')
    try {
      await appelApi('/api/compte/deconnexion', { method: 'POST' })
      fermerSession()
      signalerAutresOnglets()
      navigue('/connexion', { replace: true })
    } catch {
      // Ne pas prétendre que la révocation a eu lieu : le cookie HttpOnly
      // peut toujours être présent lorsque le serveur est inaccessible.
      setErreurDeconnexion(
        'Déconnexion non confirmée : le serveur est indisponible. Réessayez. '
          + 'La session peut encore être active.',
      )
    } finally {
      setDeconnexionEnCours(false)
    }
  }

  return (
    <header className="entete">
      <Link to="/" aria-label="EduQuizAI, accueil">
        <Logo />
      </Link>

      <nav aria-label="Navigation principale">
        {connecte ? (
          <ul>
            {/* end : "Mes cours" n'est pas la page courante sur /cours/nouveau */}
            <li><NavLink to="/dashboard" end>Mes cours</NavLink></li>
            <li><NavLink to="/cours/nouveau">Nouveau cours</NavLink></li>
            <li><NavLink to="/compte">Mon compte</NavLink></li>
            <li><button type="button" onClick={deconnexion} disabled={deconnexionEnCours}>Se déconnecter</button></li>
          </ul>
        ) : (
          <ul>
            <li><Link to="/connexion" className="bouton bouton-secondaire">Se connecter</Link></li>
            <li><Link to="/inscription" className="bouton">Créer un compte</Link></li>
          </ul>
        )}
      </nav>
      {erreurDeconnexion && <p role="alert" className="erreur">{erreurDeconnexion}</p>}
    </header>
  )
}

export default EnTete
