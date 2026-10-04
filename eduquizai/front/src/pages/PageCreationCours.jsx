import { Link, useNavigate } from 'react-router-dom'
import appelApi from '../api/client'
import FormulaireCours from '../composants/FormulaireCours'
import { useTitrePage } from '../utilitaires/titrePage'

// Page /cours/nouveau : création d'un cours. La saisie, l'import de fichier,
// l'aperçu et les erreurs sont gérés par FormulaireCours (partagé avec la
// modification) ; cette page ne fait que l'appel à l'API et la navigation.
function PageCreationCours() {
  const navigue = useNavigate()
  useTitrePage('Nouveau cours')

  async function creer(donnees) {
    const cours = await appelApi('/api/cours', { method: 'POST', body: JSON.stringify(donnees) })
    navigue('/cours/' + cours.id_cours, { replace: true })
  }

  return (
    <main className="contenu">
      <Link to="/dashboard" className="lien-retour">Retour aux cours</Link>
      <h1>Nouveau cours</h1>

      {/* Même mise en page que les autres pages : titre hors de la carte, formulaire dans la carte */}
      <FormulaireCours libelleEnvoi="Enregistrer le cours" onEnregistrer={creer} />
    </main>
  )
}

export default PageCreationCours
