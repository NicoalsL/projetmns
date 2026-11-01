import { startTransition, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import appelApi from '../api/client'
import { fermerSession } from '../auth/session'
import { attributsErreur } from '../utils/champsFormulaire'
import { placerFocus } from '../utils/focus'

const ID_ERREUR = 'erreur-suppression'

// Zone « Supprimer mon compte » de la page Mon compte (PageCompte) : droit à
// l'effacement (RGPD).
// La suppression est définitive : confirmation en deux temps et mot de passe
// redemandé (vérifié par l'API).
function SectionCompte() {
  const [formulaireAffiche, setFormulaireAffiche] = useState(false)
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [suppressionEnCours, setSuppressionEnCours] = useState(false)
  // Vrai après « Annuler » : le bouton d'ouverture, de nouveau affiché,
  // reprend le focus (sinon, le bouton cliqué ayant disparu, le focus
  // retombait en haut de la page et l'utilisateur au clavier perdait sa place).
  const [retourFocus, setRetourFocus] = useState(false)
  const verrouSuppression = useRef(false)
  const navigue = useNavigate()
  // ACCESSIBILITÉ (RGAA 11.10) — Le champ n'est marqué en erreur que si le
  // message le concerne (« Mot de passe incorrect »), pas pour une panne du serveur.
  const motDePasseEnErreur = /mot de passe/i.test(erreur)

  function annuler() {
    setFormulaireAffiche(false)
    setMotDePasse('')
    setErreur('')
    setRetourFocus(true)
  }

  async function supprimer(evenement) {
    evenement.preventDefault()
    if (verrouSuppression.current) {
      return
    }
    verrouSuppression.current = true
    setSuppressionEnCours(true)
    setErreur('')

    try {
      await appelApi('/api/compte', { method: 'DELETE', body: JSON.stringify({ motDePasse }) })
      // React Router change de page dans une « transition » (mise à jour de faible
      // priorité). Fermer la session normalement passait AVANT : RouteProtegee voyait
      // la session disparaître sur la page protégée et redirigeait elle-même avec son
      // message « session expirée », qui remplaçait celui-ci. Dans la même transition,
      // React applique les deux ensemble : on quitte la page, puis la session se ferme.
      navigue('/connexion', {
        replace: true,
        state: { message: 'Votre compte et toutes vos données ont été supprimés.' },
      })
      startTransition(() => fermerSession())
    } catch (e) {
      setErreur(e.message)
      verrouSuppression.current = false
      setSuppressionEnCours(false)
    }
  }

  return (
    <section className="section-compte" aria-labelledby="titre-suppression">
      <h2 id="titre-suppression">Supprimer mon compte</h2>

      {!formulaireAffiche && (
        <button
          type="button"
          className="bouton-danger"
          ref={retourFocus ? placerFocus : undefined}
          onClick={() => setFormulaireAffiche(true)}
        >
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
            {...attributsErreur(motDePasseEnErreur, ID_ERREUR)}
          />
          {erreur && (
            <p
              key={erreur}
              id={ID_ERREUR}
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
