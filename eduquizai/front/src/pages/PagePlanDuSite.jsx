import { Link } from 'react-router-dom'
import { useTitrePage } from '../utils/titrePage'

// Page publique « Plan du site » : second système de navigation, en plus du
// menu de l'en-tête (RGAA 12.1). Accessible depuis le pied de page de toutes
// les pages (RGAA 12.4). Les pages de l'espace enseignant mènent à la
// connexion si l'utilisateur n'est pas connecté.
function PagePlanDuSite() {
  useTitrePage('Plan du site')

  return (
    <main className="contenu page-texte">
      <Link to="/" className="lien-retour">Retour à l’accueil</Link>
      <h1>Plan du site</h1>

      <nav aria-labelledby="titre-plan">
        <h2 id="titre-plan" className="sr-only">Toutes les pages</h2>
        <ul>
          <li><Link to="/">Accueil : présentation d’EduQuizAI</Link></li>
          <li><Link to="/connexion">Se connecter</Link></li>
          <li><Link to="/inscription">Créer un compte</Link></li>
          <li>
            Espace enseignant (après connexion)
            <ul>
              <li><Link to="/dashboard">Mes cours : liste et recherche</Link></li>
              <li><Link to="/cours/nouveau">Nouveau cours</Link></li>
              <li><Link to="/compte">Mon compte : informations, données personnelles et suppression du compte</Link></li>
              <li>
                Depuis un cours : détail du cours, génération d’un quiz, relecture, modification,
                test et export du quiz
              </li>
            </ul>
          </li>
          <li><Link to="/confidentialite">Mentions légales et politique de confidentialité</Link></li>
        </ul>
      </nav>
    </main>
  )
}

export default PagePlanDuSite
