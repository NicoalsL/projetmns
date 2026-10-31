import { useEffect, useState } from 'react'
import appelApi from '../api/client'
import { definirSession, tempsRestantSession, signalerAutresOnglets } from '../auth/session'

// Avertit l'enseignant avant l'expiration de sa session et lui permet de la
// prolonger (RGAA 13.1 / WCAG 2.2.1 : une limite de temps doit pouvoir être
// prolongée, sinon une saisie en cours serait perdue sans prévenir).
// Le parent le recrée à chaque nouveau jeton (key={jeton}) : l'avertissement
// disparaît dès que la session est prolongée.

// L'avertissement apparaît 2 minutes avant l'expiration (le critère demande
// au moins 20 secondes pour réagir).
const DELAI_AVERTISSEMENT_MS = 2 * 60 * 1000

function AvertissementSession({ jeton }) {
  const [visible, setVisible] = useState(false)
  const [prolongationEnCours, setProlongationEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    const delai = Math.max(0, tempsRestantSession() - DELAI_AVERTISSEMENT_MS)
    const minuteur = setTimeout(() => setVisible(true), delai)
    return () => clearTimeout(minuteur)
  }, [jeton])

  async function prolonger() {
    setProlongationEnCours(true)
    setErreur('')
    try {
      const reponse = await appelApi('/api/compte/session', { method: 'POST' })
      definirSession(reponse)
      signalerAutresOnglets()
    } catch (e) {
      setErreur(e.message)
      setProlongationEnCours(false)
    }
  }

  if (!visible) {
    return null
  }

  // role="alert" : le lecteur d'écran annonce l'avertissement sans déplacer le
  // focus, pour ne pas interrompre une saisie en cours.
  return (
    <div className="avertissement avertissement-session" role="alert">
      <p>
        <strong>Votre session expire dans moins de 2 minutes.</strong> Prolongez-la pour ne pas
        perdre votre travail en cours.
      </p>
      <button
        type="button"
        disabled={prolongationEnCours}
        aria-busy={prolongationEnCours}
        onClick={prolonger}
      >
        Rester connecté
      </button>
      {erreur && <p className="erreur">{erreur}</p>}
    </div>
  )
}

export default AvertissementSession
