import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import appelApi from '../api/client'
import { sessionValide } from '../auth/session'
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

// Liste d'identifiants pour aria-describedby (undefined si la liste est vide).
function descriptions(...identifiants) {
  const presents = identifiants.filter(Boolean)
  return presents.length > 0 ? presents.join(' ') : undefined
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
  // Afficher le mot de passe en clair évite les fautes de frappe, surtout sur mobile.
  const [motDePasseVisible, setMotDePasseVisible] = useState(false)
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

  // Attributs d'un champ en erreur : aria-invalid + lien vers le message.
  function etatErreur(champ) {
    return champsEnErreur.includes(champ)
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
      const { jeton } = await appelApi(chemin, { method: 'POST', body: JSON.stringify(corps) })
      if (!sessionValide(jeton)) {
        throw new Error('La réponse du serveur ne contient pas de session valide.')
      }
      localStorage.setItem('jeton', jeton)
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
              <>
                <label htmlFor="nom">Nom</label>
                <input
                  id="nom"
                  name="nom"
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  required
                  aria-invalid={etatErreur('nom') || undefined}
                  aria-describedby={etatErreur('nom') ? ID_ERREUR : undefined}
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                />
              </>
            )}

            <label htmlFor="email">Adresse email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={255}
              required
              aria-invalid={etatErreur('email') || undefined}
              aria-describedby={etatErreur('email') ? ID_ERREUR : undefined}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label htmlFor="mot-de-passe">Mot de passe</label>
            <div className="champ-mot-de-passe">
              <input
                id="mot-de-passe"
                name="motDePasse"
                type={motDePasseVisible ? 'text' : 'password'}
                autoComplete={estInscription ? 'new-password' : 'current-password'}
                minLength={estInscription ? 8 : 1}
                maxLength={OCTETS_MAX_MOT_DE_PASSE}
                aria-describedby={descriptions(
                  estInscription && 'aide-mot-de-passe',
                  etatErreur('motDePasse') && ID_ERREUR,
                )}
                aria-invalid={etatErreur('motDePasse') || undefined}
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
              {/* aria-pressed : le lecteur d'écran annonce si le mot de passe est affiché */}
              <button
                type="button"
                className="bouton-secondaire"
                aria-pressed={motDePasseVisible}
                aria-controls="mot-de-passe"
                onClick={() => setMotDePasseVisible(!motDePasseVisible)}
              >
                {motDePasseVisible ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            {estInscription && (
              <p id="aide-mot-de-passe" className="aide">
                Au moins 8 caractères, au plus 72 octets UTF-8 (certains caractères en occupent plusieurs).
              </p>
            )}

            {/* RGPD : consentement explicite, case jamais pré-cochée. Le lien
                s'ouvre dans un nouvel onglet pour ne pas perdre la saisie. */}
            {estInscription && (
              <div className="consentement">
                <input
                  id="consentement"
                  type="checkbox"
                  required
                  aria-invalid={etatErreur('consentement') || undefined}
                  aria-describedby={etatErreur('consentement') ? ID_ERREUR : undefined}
                  checked={consentement}
                  onChange={(e) => setConsentement(e.target.checked)}
                />
                <label htmlFor="consentement">
                  J’accepte que mes données soient traitées conformément à la{' '}
                  <Link to="/confidentialite" target="_blank" rel="noopener noreferrer">
                    politique de confidentialité
                    <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
                  </Link>
                  .
                </label>
              </div>
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
