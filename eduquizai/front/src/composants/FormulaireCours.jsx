import { useRef, useState } from 'react'
import TexteCours from './TexteCours'
import { placerFocus } from '../utilitaires/focus'

// Mêmes limites que la table cours (schema.sql).
const LONGUEUR_MAX_TITRE = 200
const LONGUEUR_MAX_CONTENU = 50000
// 50 000 caractères pèsent au plus ~200 ko en UTF-8 : un fichier plus lourd
// est refusé avant même d'être lu.
const TAILLE_MAX_FICHIER = 200 * 1024
const EXTENSIONS_ACCEPTEES = ['.txt', '.md']
const ID_ERREUR = 'erreur-cours'

// Les messages de l'API commencent par « Le titre » ou « Le contenu » : on en
// déduit le champ à signaler.
function champDuMessage(message) {
  if (/^le titre/i.test(message)) {
    return 'titre'
  }
  if (/^le contenu/i.test(message)) {
    return 'contenu'
  }
  return ''
}

// Formulaire de cours partagé par la création (PageCreationCours) et la
// modification (PageModificationCours) : même saisie, même import de fichier,
// même aperçu Markdown, mêmes contrôles. Seul l'enregistrement diffère : il
// est confié au parent par onEnregistrer({ titre, contenuTexte }), qui lève
// une erreur en cas d'échec (son message est alors affiché ici).
function FormulaireCours({ valeursInitiales = { titre: '', contenu: '' }, libelleEnvoi, onEnregistrer }) {
  const [titre, setTitre] = useState(valeursInitiales.titre)
  const [contenu, setContenu] = useState(valeursInitiales.contenu)
  const [apercu, setApercu] = useState(false)
  const [erreur, setErreur] = useState('')
  // Champ concerné par l'erreur affichée ('titre', 'contenu' ou '') : il est
  // marqué aria-invalid et relié au message (RGAA 11.10).
  const [champEnErreur, setChampEnErreur] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  // Un état React n'est mis à jour qu'au rendu suivant : un double-clic
  // rapide passerait. Une ref est modifiée immédiatement.
  const verrouEnvoi = useRef(false)

  function afficherErreur(message, champ) {
    setErreur(message)
    setChampEnErreur(champ)
  }

  // Import d'un fichier texte ou Markdown : lu dans le navigateur (aucun
  // fichier n'est envoyé au serveur), puis placé dans la zone de saisie où
  // l'enseignant peut le relire et le corriger avant d'enregistrer.
  async function importerFichier(evenement) {
    const fichier = evenement.target.files[0]
    // Réinitialisé pour pouvoir réimporter le même fichier après correction.
    evenement.target.value = ''
    if (!fichier) {
      return
    }
    afficherErreur('', '')

    const extension = fichier.name.slice(fichier.name.lastIndexOf('.')).toLowerCase()
    if (!EXTENSIONS_ACCEPTEES.includes(extension)) {
      afficherErreur('Seuls les fichiers .txt et .md peuvent être importés.', '')
      return
    }
    if (fichier.size > TAILLE_MAX_FICHIER) {
      afficherErreur('Fichier trop volumineux (200 ko maximum).', '')
      return
    }

    const texte = await fichier.text()
    if (texte.length > LONGUEUR_MAX_CONTENU) {
      afficherErreur('Le fichier dépasse 50 000 caractères : découpez-le en plusieurs cours.', '')
      return
    }
    setContenu(texte)
    // Titre proposé à partir du nom du fichier, seulement s'il est encore vide.
    if (!titre.trim()) {
      setTitre(fichier.name.slice(0, fichier.name.lastIndexOf('.')).slice(0, LONGUEUR_MAX_TITRE))
    }
  }

  async function soumettre(evenement) {
    evenement.preventDefault()
    if (verrouEnvoi.current) {
      return
    }
    if (!titre.trim() || !contenu.trim()) {
      afficherErreur('Le titre et le contenu ne doivent pas être vides.', titre.trim() ? 'contenu' : 'titre')
      return
    }
    verrouEnvoi.current = true
    afficherErreur('', '')
    setEnvoiEnCours(true)

    try {
      await onEnregistrer({ titre: titre.trim(), contenuTexte: contenu })
    } catch (e) {
      afficherErreur(e.message, champDuMessage(e.message))
    } finally {
      verrouEnvoi.current = false
      setEnvoiEnCours(false)
    }
  }

  return (
    <form className="formulaire-cours" onSubmit={soumettre} aria-busy={envoiEnCours}>
      <fieldset disabled={envoiEnCours}>
        <legend className="sr-only">Informations du cours</legend>

        <label htmlFor="titre">Titre</label>
        <input
          id="titre"
          name="titre"
          type="text"
          maxLength={LONGUEUR_MAX_TITRE}
          required
          aria-invalid={champEnErreur === 'titre' || undefined}
          aria-describedby={champEnErreur === 'titre' ? ID_ERREUR : undefined}
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
        />

        <label htmlFor="fichier">Importer un fichier (.txt ou .md, facultatif)</label>
        <input
          id="fichier"
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          onChange={importerFichier}
        />

        <div className="entete-contenu">
          <label htmlFor="contenu-cours">Contenu du cours (Markdown accepté)</label>
          <button
            type="button"
            className="bouton-secondaire"
            aria-pressed={apercu}
            onClick={() => setApercu(!apercu)}
          >
            {apercu ? 'Revenir à l’écriture' : 'Aperçu'}
          </button>
        </div>

        {/* En mode aperçu, la zone est masquée. "required" est alors retiré :
            un champ obligatoire invisible bloquerait l'envoi sans message ;
            c'est le contrôle de soumettre() qui signale un contenu vide. */}
        <textarea
          id="contenu-cours"
          name="contenu"
          rows={14}
          maxLength={LONGUEUR_MAX_CONTENU}
          aria-describedby={'limite-contenu aide-markdown' + (champEnErreur === 'contenu' ? ' ' + ID_ERREUR : '')}
          aria-invalid={champEnErreur === 'contenu' || undefined}
          required={!apercu}
          hidden={apercu}
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
        />
        {apercu && (
          <div className="apercu-markdown texte-cours" aria-label="Aperçu du cours">
            {contenu.trim() ? <TexteCours texte={contenu} /> : <p>Rien à afficher pour l’instant.</p>}
          </div>
        )}

        <p id="aide-markdown" className="aide">
          Mise en forme : # Titre, ## Sous-titre, **gras**, *italique*, - liste à puces.
        </p>
        <p id="limite-contenu" className="aide">{contenu.length.toLocaleString('fr-FR')} / 50 000 caractères</p>
        <div className="actions">
          <button type="submit" aria-busy={envoiEnCours}>
            {envoiEnCours ? 'Enregistrement…' : libelleEnvoi}
          </button>
        </div>
      </fieldset>

      {/* Focus placé sur l'erreur : le formulaire est désactivé pendant l'envoi,
          le focus serait sinon perdu */}
      {erreur && (
        <p
          id={ID_ERREUR}
          key={erreur}
          className="erreur"
          role="alert"
          tabIndex={-1}
          ref={placerFocus}
        >
          {erreur}
        </p>
      )}
    </form>
  )
}

export default FormulaireCours
