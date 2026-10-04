import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import appelApi from '../api/client'
import { placerFocus } from '../utilitaires/focus'

const NOMBRES_QUESTIONS = [3, 4, 5, 6, 7, 8, 9, 10]

const LIBELLES_STATUT = { brouillon: 'Brouillon à relire', valide: 'Validé' }
const LIBELLES_LIVRAISON = {
  inconnu: 'Non suivi (ancienne génération)',
  en_attente: 'Enregistrement non confirmé',
  enregistre: 'Enregistré',
  echec: 'Non enregistré',
}

const TYPES = [
  { valeur: 'qcm', libelle: 'QCM (4 choix)' },
  { valeur: 'vrai_faux', libelle: 'Vrai ou faux (avec explication)' },
  { valeur: 'ouverte', libelle: 'Question ouverte' },
]
const NIVEAUX = [
  { valeur: '', libelle: 'Non précisé' },
  { valeur: 'primaire', libelle: 'Primaire' },
  { valeur: 'college', libelle: 'Collège' },
  { valeur: 'lycee', libelle: 'Lycée' },
  { valeur: 'superieur', libelle: 'Enseignement supérieur' },
]
const DIFFICULTES = [
  { valeur: 'facile', libelle: 'Facile' },
  { valeur: 'moyen', libelle: 'Moyenne' },
  { valeur: 'difficile', libelle: 'Difficile' },
]

// Mêmes seuils que le back (quiz.service.js) : en dessous, l'IA invente des
// questions hors cours. Le contrôle ici sert seulement à prévenir l'enseignant
// avant de cliquer ; la règle qui fait foi reste celle du serveur.
const LONGUEUR_MIN_COURS = 300
const PHRASES_MIN_COURS = 3

function coursAssezLong(texte) {
  const phrases = texte.split(/[.!?\n]+/).filter((phrase) => phrase.trim().split(/\s+/).length >= 3)
  return texte.length >= LONGUEUR_MIN_COURS && phrases.length >= PHRASES_MIN_COURS
}

// Section "Quiz" de la page d'un cours : génération d'un nouveau quiz par
// l'IA et liste des quiz déjà générés pour ce cours.
function SectionQuizCours({ idCours, contenuCours }) {
  const [listeQuiz, setListeQuiz] = useState([])
  const [generations, setGenerations] = useState([])
  const [chargement, setChargement] = useState(true)
  const [nombreQuestions, setNombreQuestions] = useState(5)
  const [types, setTypes] = useState(['qcm', 'vrai_faux', 'ouverte'])
  const [niveau, setNiveau] = useState('')
  const [difficulte, setDifficulte] = useState('moyen')
  const [generationEnCours, setGenerationEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const verrouGeneration = useRef(false)
  const navigue = useNavigate()

  useEffect(() => {
    let sectionAffichee = true

    const urlCours = '/api/cours/' + encodeURIComponent(idCours)
    // Les deux lectures sont indépendantes : on les lance en parallèle.
    Promise.all([appelApi(urlCours + '/quiz'), appelApi(urlCours + '/generations')])
      .then(([quiz, journal]) => {
        if (!sectionAffichee) return
        setListeQuiz(quiz)
        setGenerations(journal)
      })
      .catch((e) => {
        if (sectionAffichee) setErreur(e.message)
      })
      .finally(() => {
        if (sectionAffichee) setChargement(false)
      })

    return () => {
      sectionAffichee = false
    }
  }, [idCours])

  const coursSuffisant = coursAssezLong(contenuCours)

  function basculerType(type) {
    setTypes((actuels) => (actuels.includes(type) ? actuels.filter((t) => t !== type) : [...actuels, type]))
  }

  async function generer(evenement) {
    evenement.preventDefault()
    if (types.length === 0) {
      setErreur('Choisissez au moins un type de question.')
      return
    }
    // Une génération coûte un appel à l'IA : pas de double envoi.
    if (verrouGeneration.current) return
    verrouGeneration.current = true
    setGenerationEnCours(true)
    setErreur('')

    try {
      const quiz = await appelApi('/api/cours/' + encodeURIComponent(idCours) + '/quiz', {
        method: 'POST',
        body: JSON.stringify({ nombreQuestions, types, niveau: niveau || null, difficulte }),
      })
      navigue('/quiz/' + quiz.id_quiz)
    } catch (e) {
      setErreur(e.message)
    } finally {
      verrouGeneration.current = false
      setGenerationEnCours(false)
    }
  }

  // Deux cartes, comme dans la maquette de la charte graphique : la génération
  // (contenu produit par l'IA, badge jaune) puis les quiz déjà générés.
  return (
    <>
      <section className="formulaire-generation" aria-labelledby="titre-generation">
        <div className="titre-avec-badge">
          <h2 id="titre-generation">Générer un quiz</h2>
          <span className="badge-ia">Assisté par IA</span>
        </div>
        <p className="aide">
          L’IA propose des questions à partir de ce cours. Vous les relisez et les corrigez avant toute utilisation.
        </p>

        {!coursSuffisant && (
          <p className="avertissement" role="note">
            Ce cours est trop court pour générer un quiz fiable (au moins {LONGUEUR_MIN_COURS} caractères et{' '}
            {PHRASES_MIN_COURS} phrases). Avec trop peu de matière, l’IA invente des questions hors cours.
          </p>
        )}

        {coursSuffisant && (
          <form onSubmit={generer} aria-busy={generationEnCours}>
            <fieldset disabled={generationEnCours} className="choix-generation">
              <legend className="sr-only">Paramètres du quiz</legend>

              <div className="ligne-parametres">
                <div>
                  <label htmlFor="nombre-questions">Nombre de questions</label>
                  <select
                    id="nombre-questions"
                    value={nombreQuestions}
                    onChange={(e) => setNombreQuestions(Number(e.target.value))}
                  >
                    {NOMBRES_QUESTIONS.map((nombre) => (
                      <option key={nombre} value={nombre}>{nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="niveau">Niveau des élèves</label>
                  <select id="niveau" value={niveau} onChange={(e) => setNiveau(e.target.value)}>
                    {NIVEAUX.map((option) => (
                      <option key={option.valeur} value={option.valeur}>{option.libelle}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="difficulte">Difficulté</label>
                  <select id="difficulte" value={difficulte} onChange={(e) => setDifficulte(e.target.value)}>
                    {DIFFICULTES.map((option) => (
                      <option key={option.valeur} value={option.valeur}>{option.libelle}</option>
                    ))}
                  </select>
                </div>
              </div>

              <fieldset className="types-questions">
                <legend>Types de questions (au moins un)</legend>
                {TYPES.map((type) => (
                  <div key={type.valeur} className="case">
                    <input
                      id={'type-' + type.valeur}
                      type="checkbox"
                      checked={types.includes(type.valeur)}
                      onChange={() => basculerType(type.valeur)}
                    />
                    <label htmlFor={'type-' + type.valeur}>{type.libelle}</label>
                  </div>
                ))}
              </fieldset>

              <div>
                <button
                  type="submit"
                  disabled={types.length === 0 || generationEnCours}
                  aria-busy={generationEnCours}
                >
                  {generationEnCours ? 'Génération en cours…' : 'Générer un quiz'}
                </button>
              </div>
            </fieldset>
          </form>
        )}

        {/* Zone annoncée aux lecteurs d'écran, présente avant la génération pour
            que son changement soit bien lu. L'encadré animé est décoratif : le
            texte suffit à comprendre ce qui se passe. */}
        <div role="status">
          {generationEnCours && (
            <div className="generation-en-cours">
              <p>
                <strong>Génération en cours…</strong> L’IA rédige {nombreQuestions} questions à partir de
                votre cours. Cela peut prendre de quelques secondes à une minute : restez sur cette page.
              </p>
            </div>
          )}
        </div>

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
      </section>

      <section className="section-quiz" aria-labelledby="titre-quiz">
        <h2 id="titre-quiz">Quiz de ce cours</h2>

        {chargement && <p role="status">Chargement des quiz…</p>}
        {!chargement && !erreur && listeQuiz.length === 0 && <p>Aucun quiz généré pour ce cours.</p>}

        {listeQuiz.length > 0 && (
          <ul className="liste-quiz">
            {listeQuiz.map((quiz) => (
              <li key={quiz.id_quiz}>
                <Link to={'/quiz/' + quiz.id_quiz}>{quiz.titre}</Link>
                <span className={'statut statut-' + quiz.statut}>{LIBELLES_STATUT[quiz.statut]}</span>
                <span className="aide">
                  {quiz.nombre_questions} questions · le {new Date(quiz.date_creation).toLocaleDateString('fr-FR')}
                  {quiz.fournisseur === 'simulation' && ' · simulation'}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Journal generation_ia : rend visible la durée réelle de chaque appel à l'IA. */}
        {generations.length > 0 && (
          <details className="historique-generations">
            <summary>Historique des générations ({generations.length})</summary>
            <div
              className="table-conteneur"
              role="region"
              aria-label="Historique des générations"
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">Dernières générations pour ce cours</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Appel IA</th>
                    <th scope="col">Quiz</th>
                    <th scope="col">Questions demandées</th>
                    <th scope="col">Durée</th>
                  </tr>
                </thead>
                <tbody>
                  {generations.map((generation) => (
                    <tr key={generation.id_generation}>
                      <td>{new Date(generation.date_generation).toLocaleString('fr-FR')}</td>
                      <td>{generation.statut === 'succes' ? 'Réussie' : 'Échec'}</td>
                      <td>{LIBELLES_LIVRAISON[generation.livraison] || LIBELLES_LIVRAISON.inconnu}</td>
                      <td>{generation.nombre_questions_demandees}</td>
                      <td>
                        {(generation.duree_ms / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>
    </>
  )
}

export default SectionQuizCours
