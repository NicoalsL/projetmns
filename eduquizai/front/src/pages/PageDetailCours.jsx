import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import appelApi from '../api/client'

function PageDetailCours() {
  const { id } = useParams()
  return <DetailCours key={id} id={id} />
}

function DetailCours({ id }) {
  const [cours, setCours] = useState(null)
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)
  const [confirmer, setConfirmer] = useState(false)
  const [suppression, setSuppression] = useState(false)
  const [tentative, setTentative] = useState(0)
  const verrou = useRef(false)
  const navigue = useNavigate()
  useEffect(() => {
    let actif = true
    appelApi('/api/cours/' + encodeURIComponent(id))
      .then((resultat) => { if (actif) setCours(resultat) })
      .catch((e) => { if (actif) setErreur(e.status === 404 ? 'Ce cours est introuvable ou ne vous appartient pas.' : e.message) })
      .finally(() => { if (actif) setChargement(false) })
    return () => { actif = false }
  }, [id, tentative])

  function reessayer() { setErreur(''); setChargement(true); setTentative((n) => n + 1) }
  async function supprimer() {
    if (verrou.current) return
    verrou.current = true
    setSuppression(true)
    setErreur('')
    try {
      await appelApi('/api/cours/' + encodeURIComponent(id), { method: 'DELETE' })
      navigue('/dashboard', { replace: true, state: { message: 'Cours supprimé.' } })
    } catch (e) { setErreur(e.message) }
    finally { verrou.current = false; setSuppression(false) }
  }
  return (
    <main className="contenu detail-cours">
      <Link to="/dashboard">Retour aux cours</Link>
      {chargement && <p role="status">Chargement du cours…</p>}
      {erreur && <p role="alert" className="erreur">{erreur}</p>}
      {!chargement && !cours && erreur && <button type="button" onClick={reessayer}>Réessayer</button>}
      {!chargement && cours && <>
        <h1>{cours.titre}</h1>
        <p>Créé le {new Date(cours.date_creation).toLocaleDateString('fr-FR')}</p>
        <div className="texte-cours">{cours.contenu_texte}</div>
        {!confirmer && <button type="button" onClick={() => setConfirmer(true)}>Supprimer le cours</button>}
        {confirmer && <section className="confirmation" aria-labelledby="titre-suppression">
          <h2 id="titre-suppression">Supprimer ce cours ?</h2>
          <p>Le cours « {cours.titre} » sera supprimé définitivement.</p>
          <div className="actions">
            <button type="button" disabled={suppression} onClick={supprimer}>{suppression ? 'Suppression…' : 'Confirmer la suppression'}</button>
            <button type="button" disabled={suppression} onClick={() => setConfirmer(false)}>Annuler</button>
          </div>
        </section>}
      </>}
    </main>
  )
}
export default PageDetailCours
