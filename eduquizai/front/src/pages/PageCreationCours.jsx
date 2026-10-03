import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import appelApi from '../api/client'

// Mêmes limites que la table cours (schema.sql).
const LONGUEUR_MAX_TITRE = 200
const LONGUEUR_MAX_CONTENU = 50000

function PageCreationCours() {
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const verrouEnvoi = useRef(false)
  const navigue = useNavigate()

  async function soumettre(evenement) {
    evenement.preventDefault()
    if (verrouEnvoi.current) return
    if (!titre.trim() || !contenu.trim()) {
      setErreur('Le titre et le contenu ne doivent pas être vides.')
      return
    }
    verrouEnvoi.current = true
    setErreur('')
    setEnvoiEnCours(true)

    try {
      const cours = await appelApi('/api/cours', {
        method: 'POST',
        body: JSON.stringify({ titre: titre.trim(), contenuTexte: contenu }),
      })
      navigue('/cours/' + cours.id_cours, { replace: true })
    } catch (e) {
      setErreur(e.message)
    } finally {
      verrouEnvoi.current = false
      setEnvoiEnCours(false)
    }
  }

  return (
    <main className="contenu formulaire-cours">
      <Link to="/dashboard">Retour aux cours</Link>
      <h1>Nouveau cours</h1>

      <form onSubmit={soumettre} aria-busy={envoiEnCours}>
        <fieldset disabled={envoiEnCours}>
          <legend>Informations du cours</legend>

          <label htmlFor="titre">Titre</label>
          <input
            id="titre"
            name="titre"
            type="text"
            maxLength={LONGUEUR_MAX_TITRE}
            required
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
          />

          <label htmlFor="contenu">Contenu du cours</label>
          <textarea
            id="contenu"
            name="contenu"
            rows={10}
            maxLength={LONGUEUR_MAX_CONTENU}
            aria-describedby="limite-contenu"
            required
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
          />

          <p id="limite-contenu">{contenu.length.toLocaleString('fr-FR')} / 50 000 caractères</p>
          <button type="submit">{envoiEnCours ? 'Enregistrement…' : 'Enregistrer le cours'}</button>
        </fieldset>

        {erreur && <p className="erreur" role="alert">{erreur}</p>}
      </form>
    </main>
  )
}

export default PageCreationCours
