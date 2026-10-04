import { Fragment, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import PageAccueil from './pages/PageAccueil'
import PageConnexion from './pages/PageConnexion'
import PageDashboard from './pages/PageDashboard'
import PageCreationCours from './pages/PageCreationCours'
import PageDetailCours from './pages/PageDetailCours'
import PageModificationCours from './pages/PageModificationCours'
import PageQuiz from './pages/PageQuiz'
import PageEssaiQuiz from './pages/PageEssaiQuiz'
import PageConfidentialite from './pages/PageConfidentialite'
import EnTete from './composants/EnTete'
import { sessionValide, surveillerSession } from './auth/session'

// Redirige vers la connexion si la session est absente ou expirée.
function RouteProtegee({ enfant }) {
  const [jeton, setJeton] = useState(() => (sessionValide() ? localStorage.getItem('jeton') : null))

  // surveillerSession renvoie sa fonction d'arrêt, que React appelle au démontage.
  useEffect(() => surveillerSession(setJeton), [])

  if (!jeton) {
    return <Navigate to="/connexion" replace state={{ sessionExpiree: true }} />
  }

  // key={jeton} : si un autre compte se connecte dans un autre onglet, la page
  // est recréée et recharge les données du nouveau compte (pas celles de l'ancien).
  return <Fragment key={jeton}>{enfant}</Fragment>
}

// Dans une application React, changer de page ne recharge pas le navigateur :
// sans aide, le focus clavier resterait sur le lien cliqué (ou sur <body>) et
// la page resterait défilée. À chaque changement d'adresse, on remonte en haut
// et on place le focus sur le titre <h1> de la nouvelle page (ou, s'il n'est
// pas encore chargé, sur la zone de contenu) : le lecteur d'écran l'annonce.
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

function App() {
  return (
    <BrowserRouter>
      {/* Lien d'évitement (RGAA 12.7) : premier élément atteint au clavier,
          il permet de sauter l'en-tête et d'aller directement au contenu. */}
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>

      <EnTete />
      <GestionNavigation />

      <div id="contenu" className="zone-contenu" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<PageAccueil />} />
          <Route path="/connexion" element={<PageConnexion />} />
          <Route path="/confidentialite" element={<PageConfidentialite />} />
          <Route path="/dashboard" element={<RouteProtegee enfant={<PageDashboard />} />} />
          <Route path="/cours/nouveau" element={<RouteProtegee enfant={<PageCreationCours />} />} />
          <Route path="/cours/:id" element={<RouteProtegee enfant={<PageDetailCours />} />} />
          <Route path="/cours/:id/modifier" element={<RouteProtegee enfant={<PageModificationCours />} />} />
          <Route path="/quiz/:id" element={<RouteProtegee enfant={<PageQuiz />} />} />
          <Route path="/quiz/:id/essai" element={<RouteProtegee enfant={<PageEssaiQuiz />} />} />
          {/* Adresse inconnue : retour à l'accueil public */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Pied de page présent sur toutes les pages : accès permanent aux mentions légales.
          NavLink signale la page courante (aria-current) quand on y est déjà. */}
      <footer className="pied-de-page">
        <p>EduQuizAI, un service SchoolUp</p>
        <NavLink to="/confidentialite">Mentions légales et confidentialité</NavLink>
      </footer>
    </BrowserRouter>
  )
}

export default App
