import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import appelApi from '../api/client'
import SectionQuizCours from '../composants/SectionQuizCours'
import TexteCours from '../composants/TexteCours'
import { placerFocus, useFocusTitreApresChargement } from '../utilitaires/focus'
import { useTitrePage } from '../utilitaires/titrePage'

// Page /cours/:id : affiche un cours et permet de le supprimer.
// La "key" force React à recréer entièrement le composant quand l'identifiant
// change : aucun état (cours, confirmation…) ne fuit d'un cours à l'autre.
function PageDetailCours() {
  const { id } = useParams()
  return <DetailCours key={id} id={id} />
}

function DetailCours({ id }) {
  const [cours, setCours] = useState(null)
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)
  const [confirmationAffichee, setConfirmationAffichee] = useState(false)
  const [suppressionEnCours, setSuppressionEnCours] = useState(false)
  const [numeroTentative, setNumeroTentative] = useState(0)
  const verrouSuppression = useRef(false)
  const navigue = useNavigate()
  const emplacement = useLocation()
  useTitrePage(cours ? cours.titre : (erreur ? 'Cours introuvable' : 'Chargement du cours'))
  useFocusTitreApresChargement(!chargement)

  useEffect(() => {
    // Évite de modifier l'état d'une page déjà quittée.
    let pageAffichee = true

    appelApi('/api/cours/' + encodeURIComponent(id))
      .then((resultat) => {
        if (pageAffichee) setCours(resultat)
      })
      .catch((e) => {
        if (!pageAffichee) return
        // L'API renvoie 404 aussi pour le cours d'un autre enseignant.
        setErreur(e.status === 404 ? 'Ce cours est introuvable ou ne vous appartient pas.' : e.message)
      })
      .finally(() => {
        if (pageAffichee) setChargement(false)
      })

    return () => {
      pageAffichee = false
    }
  }, [id, numeroTentative])

  function reessayer() {
    setErreur('')
    setChargement(true)
    setNumeroTentative((n) => n + 1)
  }

  async function supprimer() {
    // Verrou immédiat contre le double-clic (l'état React arrive au rendu suivant).
    if (verrouSuppression.current) return
    verrouSuppression.current = true
    setSuppressionEnCours(true)
    setErreur('')

    try {
      await appelApi('/api/cours/' + encodeURIComponent(id), { method: 'DELETE' })
      navigue('/dashboard', { replace: true, state: { message: 'Cours supprimé.' } })
    } catch (e) {
      setErreur(e.message)
    } finally {
      verrouSuppression.current = false
      setSuppressionEnCours(false)
    }
  }

  return (
    <main className="contenu detail-cours">
      <Link to="/dashboard" className="lien-retour">Retour aux cours</Link>

      {chargement && <p role="status">Chargement du cours…</p>}
      {/* Chaque page garde un titre <h1>, même en cas d'erreur de chargement */}
      {!chargement && !cours && <h1>Cours indisponible</h1>}
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
      {!chargement && !cours && erreur && (
        <div>
          <button type="button" className="bouton-secondaire" onClick={reessayer}>Réessayer</button>
        </div>
      )}

      {!chargement && cours && (
        <>
          {/* Titre et action principale sur la même ligne, comme dans la maquette */}
          <div className="entete-contenu">
            <div>
              <h1>{cours.titre}</h1>
              <p className="aide">Créé le {new Date(cours.date_creation).toLocaleDateString('fr-FR')}</p>
            </div>
            <Link to={'/cours/' + id + '/modifier'} className="bouton bouton-secondaire">Modifier le cours</Link>
          </div>
          {emplacement.state?.message && <p role="status" className="succes">{emplacement.state.message}</p>}

          {/* Le cours est écrit en Markdown. react-markdown ignore tout HTML brut
              par défaut : une balise <script> tapée dans un cours n'est jamais exécutée.
              TexteCours décale aussi les titres d'un niveau (le <h1> est le titre du cours). */}
          <section className="texte-cours" aria-label="Contenu du cours">
            <TexteCours texte={cours.contenu_texte} />
          </section>

          <SectionQuizCours idCours={id} contenuCours={cours.contenu_texte} />

          {!confirmationAffichee && (
            <div className="actions">
              <button
                type="button"
                className="bouton-danger"
                onClick={() => setConfirmationAffichee(true)}
              >
                Supprimer le cours
              </button>
            </div>
          )}

          {/* Confirmation en deux temps : une suppression est définitive. */}
          {confirmationAffichee && (
            <section className="confirmation" aria-labelledby="titre-suppression">
              <h2 id="titre-suppression" tabIndex={-1} ref={placerFocus}>Supprimer ce cours ?</h2>
              <p>Le cours « {cours.titre} » sera supprimé définitivement.</p>
              <div className="actions">
                <button
                  type="button"
                  className="bouton-danger"
                  disabled={suppressionEnCours}
                  aria-busy={suppressionEnCours}
                  onClick={supprimer}
                >
                  {suppressionEnCours ? 'Suppression…' : 'Confirmer la suppression'}
                </button>
                <button
                  type="button"
                  className="bouton-secondaire"
                  disabled={suppressionEnCours}
                  onClick={() => setConfirmationAffichee(false)}
                >
                  Annuler
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}

export default PageDetailCours
