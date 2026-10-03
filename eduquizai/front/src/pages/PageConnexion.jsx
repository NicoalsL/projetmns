import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import appelApi from '../api/client'
import { sessionValide } from '../auth/session'

// Même limite que le back (bcrypt ignore au-delà de 72 octets).
const OCTETS_MAX_MOT_DE_PASSE = 72

function PageConnexion() {
  const [onglet, setOnglet] = useState('connexion')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  // Un état React n'est mis à jour qu'au rendu suivant : un double-clic
  // rapide passerait. Une ref est modifiée immédiatement.
  const verrouEnvoi = useRef(false)
  const navigue = useNavigate()
  const emplacement = useLocation()
  const estInscription = onglet === 'inscription'

  function changerOnglet(nouvelOnglet) {
    setOnglet(nouvelOnglet)
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
      ? { nom: nom.trim(), email: email.trim(), motDePasse }
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

  return (
    <main className="connexion">
      <div className="carte">
        <h1>EduQuizAI</h1>

        {emplacement.state?.sessionExpiree && (
          <p role="status">Connectez-vous pour accéder à votre espace. Votre session est absente ou a expiré.</p>
        )}

        {/* aria-pressed indique aux lecteurs d'écran quel onglet est actif */}
        <div className="onglets" role="group" aria-label="Accès au compte">
          <button type="button" aria-pressed={!estInscription} disabled={envoiEnCours} onClick={() => changerOnglet('connexion')}>
            Connexion
          </button>
          <button type="button" aria-pressed={estInscription} disabled={envoiEnCours} onClick={() => changerOnglet('inscription')}>
            Inscription
          </button>
        </div>

        <form onSubmit={soumettre} aria-busy={envoiEnCours}>
          {/* Un fieldset désactivé désactive tous ses champs pendant l'envoi */}
          <fieldset disabled={envoiEnCours}>
            <legend>{estInscription ? 'Créer un compte' : 'Se connecter'}</legend>

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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label htmlFor="mot-de-passe">Mot de passe</label>
            <input
              id="mot-de-passe"
              name="motDePasse"
              type="password"
              autoComplete={estInscription ? 'new-password' : 'current-password'}
              minLength={estInscription ? 8 : 1}
              maxLength={OCTETS_MAX_MOT_DE_PASSE}
              aria-describedby={estInscription ? 'aide-mot-de-passe' : undefined}
              required
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
            {estInscription && (
              <p id="aide-mot-de-passe">
                Au moins 8 caractères, au plus 72 octets UTF-8 (certains caractères en occupent plusieurs).
              </p>
            )}

            <button type="submit">
              {envoiEnCours ? 'Envoi en cours…' : estInscription ? 'Créer mon compte' : 'Se connecter'}
            </button>
          </fieldset>

          {/* role="alert" : l'erreur est lue immédiatement par les lecteurs d'écran */}
          {erreur && <p className="erreur" role="alert">{erreur}</p>}
          <p role="status" className="sr-only">{envoiEnCours ? 'Envoi en cours' : ''}</p>
        </form>
      </div>
    </main>
  )
}

export default PageConnexion
