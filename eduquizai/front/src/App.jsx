import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import PageAccueil from './pages/PageAccueil'
import PageConnexion from './pages/PageConnexion'
import PageInscription from './pages/PageInscription'
import PageDashboard from './pages/PageDashboard'
import PageCreationCours from './pages/PageCreationCours'
import PageDetailCours from './pages/PageDetailCours'
import PageModificationCours from './pages/PageModificationCours'
import PageQuiz from './pages/PageQuiz'
import PageEssaiQuiz from './pages/PageEssaiQuiz'
import PageConfidentialite from './pages/PageConfidentialite'
import PagePlanDuSite from './pages/PagePlanDuSite'
import EnTete from './composants/EnTete'
import GestionNavigation from './composants/GestionNavigation'
import RouteProtegee from './composants/RouteProtegee'

// Rôle : la liste des adresses du site et le cadre commun à toutes les pages
// (lien d'évitement, en-tête, zone de contenu, pied de page).
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
          <Route path="/inscription" element={<PageInscription />} />
          <Route path="/confidentialite" element={<PageConfidentialite />} />
          <Route path="/plan-du-site" element={<PagePlanDuSite />} />
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

      {/* Pied de page présent sur toutes les pages : accès permanent aux mentions légales
          et au plan du site (second système de navigation, RGAA 12.1 et 12.4).
          NavLink signale la page courante (aria-current) quand on y est déjà. */}
      <footer className="pied-de-page">
        <p>EduQuizAI, un service SchoolUp</p>
        <nav aria-label="Liens du pied de page">
          <ul>
            <li><NavLink to="/confidentialite">Mentions légales et confidentialité</NavLink></li>
            <li><NavLink to="/plan-du-site">Plan du site</NavLink></li>
          </ul>
        </nav>
      </footer>
    </BrowserRouter>
  )
}

export default App
