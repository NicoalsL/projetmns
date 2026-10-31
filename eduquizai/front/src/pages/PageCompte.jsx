import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import appelApi from '../api/client'
import SectionCompte from '../components/SectionCompte'
import { useTitrePage } from '../utils/titrePage'

// Page « Mon compte » (/compte, réservée aux enseignants connectés) : informations
// du compte, rappel des droits sur les données (RGPD) et suppression du compte.
// CHOIX — La suppression est ici et non sur le tableau de bord : une action
// définitive n'a pas sa place sur la page où l'on travaille tous les jours.
function PageCompte() {
  const [profil, setProfil] = useState(null)
  const [erreur, setErreur] = useState('')
  useTitrePage('Mon compte')

  useEffect(() => {
    // Évite de modifier l'état d'une page déjà quittée si la réponse arrive
    // après la navigation.
    let pageAffichee = true

    appelApi('/api/compte')
      .then((resultat) => {
        if (pageAffichee) {
          setProfil(resultat)
        }
      })
      .catch((e) => {
        if (pageAffichee) {
          setErreur(e.message)
        }
      })

    return () => {
      pageAffichee = false
    }
  }, [])

  return (
    <main className="contenu">
      <h1>Mon compte</h1>

      <section className="section-compte" aria-labelledby="titre-informations">
        <h2 id="titre-informations">Mes informations</h2>
        {!profil && !erreur && <p role="status">Chargement…</p>}
        {erreur && (
          <p role="alert" className="erreur">
            {erreur}
          </p>
        )}
        {profil && (
          <dl>
            <dt>Nom</dt>
            <dd>{profil.nom}</dd>
            <dt>Adresse email</dt>
            <dd>{profil.email}</dd>
          </dl>
        )}
      </section>

      {/* RGPD : l'enseignant sait ce que deviennent ses données et comment exercer ses droits */}
      <section className="section-compte" aria-labelledby="titre-donnees">
        <h2 id="titre-donnees">Mes données</h2>
        <p>
          Vos cours et vos quiz ne sont visibles que par vous. Vous pouvez exporter un quiz validé
          depuis sa page (JSON, CSV ou PDF) avant de supprimer votre compte.
        </p>
        <p>
          <Link to="/confidentialite">Politique de confidentialité et vos droits</Link>
        </p>
      </section>

      <SectionCompte />
    </main>
  )
}

export default PageCompte
