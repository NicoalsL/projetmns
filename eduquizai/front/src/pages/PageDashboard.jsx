import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import appelApi from '../api/client'
import { fermerSession } from '../auth/session'

function PageDashboard() {
  const [cours, setCours] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  // Incrémenté par le bouton "Réessayer" pour relancer le chargement.
  const [numeroTentative, setNumeroTentative] = useState(0)
  const navigue = useNavigate()
  const emplacement = useLocation()

  useEffect(() => {
    // Évite de modifier l'état d'une page déjà quittée si la réponse arrive
    // après la navigation.
    let pageAffichee = true

    appelApi('/api/cours')
      .then((resultat) => {
        if (!Array.isArray(resultat)) throw new Error('La liste des cours reçue est invalide.')
        if (pageAffichee) setCours(resultat)
      })
      .catch((e) => {
        if (!pageAffichee) return
        setErreur(e.message)
      })
      .finally(() => {
        if (pageAffichee) setChargement(false)
      })

    return () => {
      pageAffichee = false
    }
  }, [numeroTentative])

  function reessayer() {
    setErreur('')
    setChargement(true)
    setNumeroTentative((n) => n + 1)
  }

  function deconnexion() {
    fermerSession()
    navigue('/', { replace: true })
  }

  return (
    <main>
      <header className="entete">
        <strong>EduQuizAI</strong>
        <button type="button" onClick={deconnexion}>Déconnexion</button>
      </header>

      <section className="contenu" aria-labelledby="titre-cours">
        <Link to="/cours/nouveau">Nouveau cours</Link>
        <h1 id="titre-cours">Mes cours</h1>
        {emplacement.state?.message && <p role="status">{emplacement.state.message}</p>}

        {chargement && <p role="status">Chargement…</p>}

        {erreur && (
          <div>
            <p role="alert" className="erreur">{erreur}</p>
            <button type="button" onClick={reessayer}>Réessayer</button>
          </div>
        )}

        {!chargement && !erreur && cours.length === 0 && <p>Aucun cours pour le moment.</p>}

        {!chargement && !erreur && cours.length > 0 && (
          <div className="table-conteneur">
            <table>
              <caption>Vos cours enregistrés</caption>
              <thead>
                <tr>
                  <th scope="col">Titre</th>
                  <th scope="col">Date de création</th>
                </tr>
              </thead>
              <tbody>
                {cours.map((c) => (
                  <tr key={c.id_cours}>
                    <td><Link to={'/cours/' + c.id_cours}>{c.titre}</Link></td>
                    <td>{new Date(c.date_creation).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

export default PageDashboard
