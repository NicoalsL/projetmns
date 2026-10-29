import { useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import appelApi from '../api/client'
import { sessionValide, definirSession, signalerAutresOnglets } from '../auth/session'
import CaseConsentement from '../composants/CaseConsentement'
import ChampMotDePasse from '../composants/ChampMotDePasse'
import ChampSaisie from '../composants/ChampSaisie'
import { placerFocus } from '../utilitaires/focus'
import { useTitrePage } from '../utilitaires/titrePage'

// Même limite que le back (bcrypt ignore au-delà de 72 octets).
const OCTETS_MAX_MOT_DE_PASSE = 72
const ID_ERREUR = 'erreur-connexion'

// Associe un message d'erreur (rédigé par l'API ou par ce formulaire) aux
// champs qu'il concerne : ces champs sont marqués aria-invalid et reliés au
// message (RGAA 11.10). L'ordre compte : le premier motif reconnu l'emporte.
const CHAMPS_PAR_MESSAGE = [
  [/mot de passe incorrect/i, ['email', 'motDePasse']],
  [/^le nom/i, ['nom']],
  [/email/i, ['email']],
  [/mot de passe/i, ['motDePasse']],
  [/politique de confidentialité/i, ['consentement']],
]

function champsConcernes(message) {
  const correspondance = CHAMPS_PAR_MESSAGE.find(([motif]) => motif.test(message))
  return correspondance ? correspondance[1] : []
}

function PageConnexion() {
  // L'onglet actif est porté par l'adresse : /connexion?onglet=inscription.
  // Les boutons « Créer un compte » de l'en-tête et de l'accueil ouvrent donc
  // directement l'inscription, et le bouton Précédent du navigateur fonctionne.
  const [parametres, setParametres] = useSearchParams()
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [consentement, setConsentement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  // Un état React n'est mis à jour qu'au rendu suivant : un double-clic
  // rapide passerait. Une ref est modifiée immédiatement.
  const verrouEnvoi = useRef(false)
  const navigue = useNavigate()
  const emplacement = useLocation()
  const estInscription = parametres.get('onglet') === 'inscription'
  useTitrePage(estInscription ? 'Créer un compte' : 'Connexion')
  const champsEnErreur = erreur ? champsConcernes(erreur) : []

  // Propriétés communes aux champs : sont-ils concernés par l'erreur affichée,
  // et quel message les décrit (voir utilitaires/champsFormulaire.js).
  function liaisonErreur(champ) {
    return { enErreur: champsEnErreur.includes(champ), idErreur: ID_ERREUR }
  }

  function changerOnglet(nouvelOnglet) {
    setParametres(nouvelOnglet === 'inscription' ? { onglet: 'inscription' } : {}, { replace: true })
    setErreur('')
    setMotDePasse('')
  }

  async function soumettre(evenement) {
    evenement.preventDefault()
    if (verrouEnvoi.current) return
    setErreur('')

    if (new TextEncoder().encode(motDePasse).length > OCTETS_MAX_MOT_DE_PASSE) {
      setErreur('Le mot de passe ne doit pas dépasser 72 octets UTF-8.')
      return
    }

    verrouEnvoi.current = true
    setEnvoiEnCours(true)
    const chemin = estInscription ? '/api/auth/inscription' : '/api/auth/connexion'
    const corps = estInscription
      ? { nom: nom.trim(), email: email.trim(), motDePasse, consentementRgpd: consentement }
      : { email: email.trim(), motDePasse }

    try {
      const session = await appelApi(chemin, { method: 'POST', body: JSON.stringify(corps) })
      if (!session.expiration || !session.id_utilisateur) {
        throw new Error('La réponse du serveur ne contient pas de session valide.')
      }
      localStorage.removeItem('jeton') // supprimer l'ancien JWT de la version localStorage
      definirSession(session)
      signalerAutresOnglets()
      navigue('/dashboard', { replace: true })
    } catch (e) {
      setErreur(e.message)
    } finally {
      verrouEnvoi.current = false
      setEnvoiEnCours(false)
    }
  }

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

        {/* aria-pressed indique aux lecteurs d'écran quel onglet est actif */}
        <div className="onglets" role="group" aria-label="Accès au compte">
          {/* Classe "actif" : style de l'onglet sélectionné défini par la charte graphique */}
          <button
            type="button"
            className={estInscription ? undefined : 'actif'}
            aria-pressed={!estInscription}
            disabled={envoiEnCours}
            onClick={() => changerOnglet('connexion')}
          >
            Connexion
          </button>
          <button
            type="button"
            className={estInscription ? 'actif' : undefined}
            aria-pressed={estInscription}
            disabled={envoiEnCours}
            onClick={() => changerOnglet('inscription')}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={soumettre} aria-busy={envoiEnCours}>
          {/* Un fieldset désactivé désactive tous ses champs pendant l'envoi */}
          <fieldset disabled={envoiEnCours}>
            {/* Légende lue par les lecteurs d'écran ; visuellement, l'onglet actif suffit */}
            <legend className="sr-only">{estInscription ? 'Créer un compte' : 'Se connecter'}</legend>

            {estInscription && (
              <ChampSaisie
                id="nom"
                libelle="Nom"
                name="nom"
                type="text"
                autoComplete="name"
                maxLength={100}
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                {...liaisonErreur('nom')}
              />
            )}

            <ChampSaisie
              id="email"
              libelle="Adresse email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={255}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              {...liaisonErreur('email')}
            />

            <ChampMotDePasse
              aide={estInscription
                ? 'Au moins 8 caractères, au plus 72 octets UTF-8 (certains caractères en occupent plusieurs).'
                : undefined}
              autoComplete={estInscription ? 'new-password' : 'current-password'}
              minLength={estInscription ? 8 : 1}
              maxLength={OCTETS_MAX_MOT_DE_PASSE}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              {...liaisonErreur('motDePasse')}
            />

            {estInscription && (
              <CaseConsentement
                coche={consentement}
                onChanger={setConsentement}
                {...liaisonErreur('consentement')}
              />
            )}

            <button type="submit" aria-busy={envoiEnCours}>
              {envoiEnCours ? 'Envoi en cours…' : estInscription ? 'Créer mon compte' : 'Se connecter'}
            </button>
          </fieldset>

          {/* role="alert" : l'erreur est lue immédiatement par les lecteurs d'écran */}
          {/* Focus placé sur l'erreur : sans cela, il serait perdu (le formulaire
              est désactivé pendant l'envoi) et l'utilisateur clavier devrait tout reparcourir */}
          {erreur && (
            <p
              id={ID_ERREUR}
              key={erreur}
              className="erreur"
              role="alert"
              tabIndex={-1}
              ref={placerFocus}
            >
              {erreur}
            </p>
          )}
          <p role="status" className="sr-only">{envoiEnCours ? 'Envoi en cours' : ''}</p>
        </form>
      </div>
    </main>
  )
}

export default PageConnexion
