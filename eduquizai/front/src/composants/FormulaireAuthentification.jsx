import { Link, Navigate, useLocation } from 'react-router-dom'
import { sessionValide } from '../auth/session'
import { ID_ERREUR } from '../auth/useEnvoiAuthentification'
import { placerFocus } from '../utilitaires/focus'

// Textes propres à chaque page. Les onglets sont des liens : chaque page a sa
// propre adresse, et le bouton Précédent du navigateur fonctionne.
const ONGLETS = {
  connexion: {
    adresse: '/connexion',
    libelle: 'Connexion',
    legende: 'Se connecter',
    libelleEnvoi: 'Se connecter',
  },
  inscription: {
    adresse: '/inscription',
    libelle: 'Inscription',
    legende: 'Créer un compte',
    libelleEnvoi: 'Créer mon compte',
  },
}

// Cadre commun aux pages de connexion et d'inscription : titre, messages,
// onglets, formulaire, bouton d'envoi et message d'erreur. Chaque page ne
// fournit que ses champs (children) et sa fonction d'envoi.
function FormulaireAuthentification({ onglet, envoi, onSoumettre, children }) {
  const emplacement = useLocation()
  const { legende, libelleEnvoi } = ONGLETS[onglet]

  // Déjà connecté (session non expirée) : inutile de se reconnecter.
  if (sessionValide()) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="connexion">
      <div className="carte">
        {/* Le logo est dans l'en-tête commun ; le nom du service est donné par le texte masqué du titre */}
        <h1>Bienvenue<span className="sr-only"> sur EduQuizAI</span></h1>
        <p className="accroche">Créez des quiz à partir de vos cours, relus et validés par vous.</p>

        {emplacement.state?.message && <p role="status" className="succes">{emplacement.state.message}</p>}
        {emplacement.state?.sessionExpiree && (
          <p role="status" className="info">
            Connectez-vous pour accéder à votre espace. Votre session est absente ou a expiré.
          </p>
        )}

        {/* aria-current indique aux lecteurs d'écran quel onglet est la page affichée */}
        <nav className="onglets" aria-label="Accès au compte">
          {Object.entries(ONGLETS).map(([nom, { adresse, libelle }]) => (
            // Classe "actif" : style de l'onglet sélectionné défini par la charte graphique
            <Link
              key={nom}
              to={adresse}
              replace
              className={nom === onglet ? 'bouton actif' : 'bouton'}
              aria-current={nom === onglet ? 'page' : undefined}
            >
              {libelle}
            </Link>
          ))}
        </nav>

        <form onSubmit={onSoumettre} aria-busy={envoi.envoiEnCours}>
          {/* Un fieldset désactivé désactive tous ses champs pendant l'envoi */}
          <fieldset disabled={envoi.envoiEnCours}>
            {/* Légende lue par les lecteurs d'écran ; visuellement, l'onglet actif suffit */}
            <legend className="sr-only">{legende}</legend>

            {children}

            <button type="submit" aria-busy={envoi.envoiEnCours}>
              {envoi.envoiEnCours ? 'Envoi en cours…' : libelleEnvoi}
            </button>
          </fieldset>

          {/* role="alert" : l'erreur est lue immédiatement par les lecteurs d'écran */}
          {/* Focus placé sur l'erreur : sans cela, il serait perdu (le formulaire
              est désactivé pendant l'envoi) et l'utilisateur clavier devrait tout reparcourir */}
          {envoi.erreur && (
            <p
              id={ID_ERREUR}
              key={envoi.erreur}
              className="erreur"
              role="alert"
              tabIndex={-1}
              ref={placerFocus}
            >
              {envoi.erreur}
            </p>
          )}
          <p role="status" className="sr-only">{envoi.envoiEnCours ? 'Envoi en cours' : ''}</p>
        </form>
      </div>
    </main>
  )
}

export default FormulaireAuthentification
