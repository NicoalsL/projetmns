import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import appelApi from '../api/client'
import FormulaireCours from '../composants/FormulaireCours'
import { placerFocus, useFocusTitreApresChargement } from '../utilitaires/focus'
import { useTitrePage } from '../utilitaires/titrePage'

// Page /cours/:id/modifier : charge le cours puis réutilise le formulaire de
// création, prérempli. Les quiz déjà générés ne sont pas touchés : ils restent
// ceux que l'enseignant a relus sur l'ancien texte.
function PageModificationCours() {
  const { id } = useParams()
  const [cours, setCours] = useState(null)
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)
  const navigue = useNavigate()
  const urlCours = '/api/cours/' + encodeURIComponent(id)
  useTitrePage(cours ? 'Modifier : ' + cours.titre : 'Modifier un cours')
  useFocusTitreApresChargement(!chargement)

  useEffect(() => {
    // Évite de modifier l'état d'une page déjà quittée.
    let pageAffichee = true

    appelApi(urlCours)
      .then((resultat) => {
        if (pageAffichee) {
          setCours(resultat)
        }
      })
      .catch((e) => {
        if (pageAffichee) {
          setErreur(e.status === 404 ? 'Ce cours est introuvable ou ne vous appartient pas.' : e.message)
        }
      })
      .finally(() => {
        if (pageAffichee) {
          setChargement(false)
        }
      })

    return () => {
      pageAffichee = false
    }
  }, [urlCours])

  async function enregistrer(donnees) {
    await appelApi(urlCours, { method: 'PUT', body: JSON.stringify(donnees) })
    navigue('/cours/' + id, { replace: true, state: { message: 'Cours modifié.' } })
  }

  return (
    <main className="contenu">
      <Link to={'/cours/' + id} className="lien-retour">Retour au cours</Link>

      {chargement && <p role="status">Chargement du cours…</p>}

      {!chargement && !cours && (
        <>
          <h1>Cours indisponible</h1>
          <p
            key={erreur}
            role="alert"
            className="erreur"
            tabIndex={-1}
            ref={placerFocus}
          >
            {erreur}
          </p>
        </>
      )}

      {cours && (
        <>
          <h1>Modifier le cours</h1>
          <p className="info">
            Les quiz déjà générés ne sont pas modifiés : générez-en un nouveau pour qu’il reflète
            le texte révisé.
          </p>
          <FormulaireCours
            valeursInitiales={{ titre: cours.titre, contenu: cours.contenu_texte }}
            libelleEnvoi="Enregistrer les modifications"
            onEnregistrer={enregistrer}
          />
        </>
      )}
    </main>
  )
}

export default PageModificationCours
