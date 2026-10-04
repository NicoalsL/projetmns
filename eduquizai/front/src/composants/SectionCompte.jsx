import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import appelApi from '../api/client'
import { fermerSession } from '../auth/session'
import { placerFocus } from '../utilitaires/focus'

// Section "Mon compte" du tableau de bord : droit à l'effacement (RGPD).
// La suppression est définitive : confirmation en deux temps et mot de passe
// redemandé (vérifié par l'API).
function SectionCompte() {
  const [formulaireAffiche, setFormulaireAffiche] = useState(false)
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [suppressionEnCours, setSuppressionEnCours] = useState(false)
  const verrouSuppression = useRef(false)
  const navigue = useNavigate()

  function annuler() {
    setFormulaireAffiche(false)
    setMotDePasse('')
    setErreur('')
  }

  async function supprimer(evenement) {
    evenement.preventDefault()
    if (verrouSuppression.current) return
    verrouSuppression.current = true
    setSuppressionEnCours(true)
    setErreur('')

    try {
      await appelApi('/api/compte', { method: 'DELETE', body: JSON.stringify({ motDePasse }) })
      fermerSession()
      navigue('/connexion', {
        replace: true,
        state: { message: 'Votre compte et toutes vos données ont été supprimés.' },
      })
    } catch (e) {
      setErreur(e.message)
      verrouSuppression.current = false
      setSuppressionEnCours(false)
    }
  }

  return (
    <section className="section-compte" aria-labelledby="titre-compte">
      <h2 id="titre-compte">Mon compte</h2>

      {!formulaireAffiche && (
        <button type="button" className="bouton-danger" onClick={() => setFormulaireAffiche(true)}>
          Supprimer mon compte et mes données
        </button>
      )}

      {formulaireAffiche && (
        <form className="confirmation" onSubmit={supprimer} aria-busy={suppressionEnCours}>
          <h3 tabIndex={-1} ref={placerFocus}>Supprimer définitivement votre compte ?</h3>
          <p>
            Vos cours, vos quiz et l’historique de vos générations seront supprimés. Cette action est
            irréversible. Pensez à exporter les quiz que vous souhaitez conserver.
          </p>
          <label htmlFor="mot-de-passe-suppression">Mot de passe (confirmation)</label>
          <input
            id="mot-de-passe-suppression"
            type="password"
            autoComplete="current-password"
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
          {erreur && (
            <p
              key={erreur}
              role="alert"
              className="erreur"
              tabIndex={-1}
              ref={placerFocus}
            >
              {erreur}
            </p>
          )}
          <div className="actions">
            <button
              type="submit"
              className="bouton-danger"
              disabled={suppressionEnCours}
              aria-busy={suppressionEnCours}
            >
              {suppressionEnCours ? 'Suppression…' : 'Supprimer définitivement'}
            </button>
            <button
              type="button"
              className="bouton-secondaire"
              disabled={suppressionEnCours}
              onClick={annuler}
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default SectionCompte
