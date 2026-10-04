import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import appelApi from '../api/client'
import SectionCompte from '../composants/SectionCompte'
import { placerFocus } from '../utilitaires/focus'
import { useTitrePage } from '../utilitaires/titrePage'
import { filtrerEtTrierCours, TRIS } from '../utilitaires/filtrerCours'

function PageDashboard() {
  const [cours, setCours] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  // Incrémenté par le bouton "Réessayer" pour relancer le chargement.
  const [numeroTentative, setNumeroTentative] = useState(0)
  const emplacement = useLocation()
  // Recherche et tri appliqués côté navigateur (utilitaires/filtrerCours.js).
  const [recherche, setRecherche] = useState('')
  const [tri, setTri] = useState('recent')
  const coursAffiches = filtrerEtTrierCours(cours, recherche, tri)
  useTitrePage('Mes cours')

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

  // La déconnexion se trouve dans l'en-tête commun (composants/EnTete.jsx).
  return (
    <main className="contenu">
      <section aria-labelledby="titre-cours">
        <div className="entete-contenu">
          <h1 id="titre-cours">Mes cours</h1>
          <Link to="/cours/nouveau" className="bouton">Nouveau cours</Link>
        </div>
        {emplacement.state?.message && <p role="status" className="succes">{emplacement.state.message}</p>}

        {chargement && <p role="status">Chargement…</p>}

        {erreur && (
          <div>
            <p
              key={erreur}
              role="alert"
              className="erreur"
              tabIndex={-1}
              ref={placerFocus}
            >
              {erreur}
            </p>
            <button type="button" className="bouton-secondaire" onClick={reessayer}>Réessayer</button>
          </div>
        )}

        {/* État vide : on explique quoi faire plutôt qu'un simple « aucun cours » */}
        {!chargement && !erreur && cours.length === 0 && (
          <div className="etat-vide">
            <p><strong>Aucun cours pour le moment.</strong></p>
            <p>Commencez par enregistrer un cours : vous pourrez ensuite en générer des quiz.</p>
            <Link to="/cours/nouveau" className="bouton">Créer mon premier cours</Link>
          </div>
        )}

        {/* Deux colonnes seulement : le tableau tient dans la largeur d'un mobile
            (classe tableau-compact), sans défilement horizontal qui cacherait la date */}
        {!chargement && !erreur && cours.length > 0 && (
          <div className="filtres-cours">
            <div>
              <label htmlFor="recherche-cours">Rechercher un cours</label>
              <input
                id="recherche-cours"
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="tri-cours">Trier par</label>
              <select id="tri-cours" value={tri} onChange={(e) => setTri(e.target.value)}>
                {Object.entries(TRIS).map(([valeur, libelle]) => (
                  <option key={valeur} value={valeur}>{libelle}</option>
                ))}
              </select>
            </div>
            {/* Annoncé aux lecteurs d'écran à chaque frappe : le résultat change sans rechargement */}
            <p role="status" className="aide">
              {coursAffiches.length} cours affiché{coursAffiches.length > 1 ? 's' : ''} sur {cours.length}
            </p>
          </div>
        )}

        {!chargement && !erreur && cours.length > 0 && coursAffiches.length === 0 && (
          <p>Aucun cours ne correspond à « {recherche.trim()} ».</p>
        )}

        {!chargement && !erreur && coursAffiches.length > 0 && (
          <div className="table-conteneur">
            <table className="tableau-compact">
              <caption className="sr-only">Vos cours enregistrés</caption>
              <thead>
                <tr>
                  <th scope="col">Titre</th>
                  <th scope="col">Date de création</th>
                </tr>
              </thead>
              <tbody>
                {coursAffiches.map((c) => (
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

      <SectionCompte />
    </main>
  )
}

export default PageDashboard
