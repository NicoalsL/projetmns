import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import appelApi from '../api/client'
import {
  fermerSession,
  obtenirSession,
  sessionValide,
  signalerAutresOnglets,
  surveillerSession,
} from '../auth/session'
import Logo from './Logo'
import NavigationEnseignant from './NavigationEnseignant'

// En-tête unique, identique sur toutes les pages : le logo ramène toujours à
// l'accueil, puis la navigation dépend de la session.
// - visiteur : « Se connecter » et « Créer un compte » ;
// - enseignant connecté : « Mes cours », « Nouveau cours » et le menu
//   « Mon compte » (gérer mon compte, se déconnecter), voir NavigationEnseignant.
// NavLink ajoute lui-même aria-current="page" sur le lien de la page courante,
// attribut sur lequel la charte graphique s'appuie.
function EnTete() {
  const navigue = useNavigate()
  const [erreurDeconnexion, setErreurDeconnexion] = useState('')
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false)
  // useLocation fait réafficher l'en-tête à chaque changement de page : l'état
  // de la session (connexion, déconnexion, expiration) est donc relu à chaque fois.
  const emplacement = useLocation()
  // L'en-tête s'abonne aussi à la session (patron Observateur, auth/session.js),
  // pour les changements qui ne changent pas de page. Sans cela, après un
  // rechargement (F5), il gardait « Se connecter » alors que la session venait
  // d'être chargée depuis le serveur. Seul le nouveau rendu nous intéresse ici.
  const [, setSession] = useState(obtenirSession)
  useEffect(() => surveillerSession(setSession), [])
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

      {connecte ? (
        <NavigationEnseignant
          key={emplacement.pathname}
          surDeconnexion={deconnexion}
          deconnexionEnCours={deconnexionEnCours}
        />
      ) : (
        <nav aria-label="Navigation principale">
          <ul>
            <li><Link to="/connexion" className="bouton bouton-secondaire">Se connecter</Link></li>
            <li><Link to="/inscription" className="bouton">Créer un compte</Link></li>
          </ul>
        </nav>
      )}
      {erreurDeconnexion && <p role="alert" className="erreur">{erreurDeconnexion}</p>}
    </header>
  )
}

export default EnTete
