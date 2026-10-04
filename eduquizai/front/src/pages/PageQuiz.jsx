import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import appelApi, { telechargerFichier } from '../api/client'
import QuestionLecture from '../composants/QuestionLecture'
import EditeurQuestion from '../composants/EditeurQuestion'
import { placerFocus, useFocusTitreApresChargement } from '../utilitaires/focus'
import { useTitrePage } from '../utilitaires/titrePage'

const LIBELLES_TYPE = { qcm: 'QCM', vrai_faux: 'vrai/faux', ouverte: 'ouverte(s)' }
const LIBELLES_NIVEAU = {
  primaire: 'primaire',
  college: 'collège',
  lycee: 'lycée',
  superieur: 'enseignement supérieur',
}
const LIBELLES_DIFFICULTE = { facile: 'facile', moyen: 'moyenne', difficile: 'difficile' }
// Identifiant du message d'erreur, auquel le champ fautif est relié (aria-describedby).
const ID_ERREUR = 'erreur-quiz'
// Compare la répartition demandée à celle obtenue. Renvoie un texte comme
// "1 QCM au lieu de 2, 3 vrai/faux au lieu de 2", ou '' si tout est conforme.
function ecartRepartition(parametres, questions) {
  if (!parametres?.repartition_demandee) return ''
  const obtenue = {}
  for (const question of questions) {
    obtenue[question.type] = (obtenue[question.type] || 0) + 1
  }
  return Object.entries(parametres.repartition_demandee)
    .filter(([type, nombre]) => (obtenue[type] || 0) !== nombre)
    .map(([type, nombre]) => `${obtenue[type] || 0} ${LIBELLES_TYPE[type]} au lieu de ${nombre}`)
    .join(', ')
}

// Page /quiz/:id : relecture, modification, validation, export et suppression
// d'un quiz. Le parcours suit la contrainte "Éthique" du CDC : un quiz généré
// est un brouillon que l'enseignant doit relire et valider avant tout export.
function PageQuiz() {
  const { id } = useParams()
  return <DetailQuiz key={id} id={id} />
}

function DetailQuiz({ id }) {
  const [quiz, setQuiz] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  // Copie de travail pendant l'édition : le quiz affiché ne change qu'après
  // enregistrement réussi côté serveur.
  const [brouillonEdition, setBrouillonEdition] = useState(null)
  const [confirmationSuppression, setConfirmationSuppression] = useState(false)
  const [actionEnCours, setActionEnCours] = useState(false)
  const [conflit, setConflit] = useState(false)
  // Champ signalé par l'API lors d'un enregistrement refusé :
  // { question: numéro (ou null pour le titre), champ }, sinon null.
  const [champErreur, setChampErreur] = useState(null)
  const verrouAction = useRef(false)
  const navigue = useNavigate()

  // Titre de l'onglet : il précise aussi le mode édition.
  let titrePage = chargement ? 'Chargement du quiz' : 'Quiz indisponible'
  if (quiz) {
    titrePage = brouillonEdition ? 'Modifier : ' + quiz.titre : quiz.titre
  }
  useTitrePage(titrePage)
  useFocusTitreApresChargement(!chargement)
  const urlQuiz = '/api/quiz/' + encodeURIComponent(id)

  useEffect(() => {
    let pageAffichee = true

    appelApi('/api/quiz/' + encodeURIComponent(id))
      .then((resultat) => {
        if (pageAffichee) setQuiz(resultat)
      })
      .catch((e) => {
        if (!pageAffichee) return
        setErreur(e.status === 404 ? 'Ce quiz est introuvable ou ne vous appartient pas.' : e.message)
      })
      .finally(() => {
        if (pageAffichee) setChargement(false)
      })

    return () => {
      pageAffichee = false
    }
  }, [id])

  // Exécute une action serveur en évitant les doubles clics et en
  // centralisant l'affichage des erreurs et des messages de succès.
  async function executerAction(action, messageSucces) {
    if (verrouAction.current) return
    verrouAction.current = true
    setActionEnCours(true)
    setErreur('')
    setMessage('')
    setChampErreur(null)

    try {
      await action()
      if (messageSucces) setMessage(messageSucces)
    } catch (e) {
      setErreur(e.message)
      if (e.status === 409) {
        setConflit(true)
      }
      if (e.details?.champ) {
        setChampErreur({ question: e.details.question ?? null, champ: e.details.champ })
      }
    } finally {
      verrouAction.current = false
      setActionEnCours(false)
    }
  }

  function commencerEdition() {
    // Copie profonde : modifier le formulaire ne doit pas toucher au quiz affiché.
    setBrouillonEdition(structuredClone({
      titre: quiz.titre,
      questions: quiz.questions,
      revision: quiz.revision,
    }))
    setMessage('')
  }

  function modifierQuestion(index, question) {
    const questions = [...brouillonEdition.questions]
    questions[index] = question
    setBrouillonEdition({ ...brouillonEdition, questions })
  }

  function supprimerQuestion(index) {
    const questions = brouillonEdition.questions.filter((_, position) => position !== index)
    setBrouillonEdition({ ...brouillonEdition, questions })
  }

  function enregistrer(evenement) {
    evenement.preventDefault()
    executerAction(async () => {
      const quizAJour = await appelApi(urlQuiz, { method: 'PUT', body: JSON.stringify(brouillonEdition) })
      setQuiz(quizAJour)
      setBrouillonEdition(null)
    }, 'Modifications enregistrées. Relisez puis validez à nouveau le quiz avant de l’exporter.')
  }

  function valider() {
    executerAction(async () => {
      const quizAJour = await appelApi(urlQuiz + '/validation', {
        method: 'POST',
        body: JSON.stringify({ revision: quiz.revision }),
      })
      setQuiz(quizAJour)
    }, 'Quiz validé : il peut maintenant être exporté.')
  }

  // format : 'json' ou 'csv' (fichier produit par l'API, quiz validé uniquement).
  function exporter(format) {
    executerAction(async () => {
      await telechargerFichier(urlQuiz + '/export?format=' + format, 'quiz-' + id + '.' + format)
    }, 'Fichier ' + format.toUpperCase() + ' téléchargé.')
  }

  // PDF : la boîte d'impression du navigateur propose « Enregistrer au format
  // PDF ». La feuille de style d'impression (index.css) n'imprime que le quiz,
  // sans menus ni boutons : aucune bibliothèque PDF à charger (éco-conception).
  function imprimer() {
    window.print()
  }

  // Demande à l'IA une nouvelle question du même type pour remplacer celle-ci.
  // Le quiz repasse en brouillon : la nouvelle question doit être relue.
  function regenererQuestion(index) {
    executerAction(async () => {
      const quizAJour = await appelApi(urlQuiz + '/questions/' + index + '/regeneration', {
        method: 'POST',
        body: JSON.stringify({ revision: quiz.revision }),
      })
      setQuiz(quizAJour)
    }, 'Question ' + (index + 1) + ' régénérée : relisez-la, puis validez à nouveau le quiz.')
  }

  function supprimer() {
    executerAction(async () => {
      await appelApi(urlQuiz, { method: 'DELETE' })
      navigue('/cours/' + quiz.id_cours, { replace: true })
    })
  }

  // Une erreur de conflit conserve la saisie jusqu'au choix explicite de recharger.
  function recharger() {
    executerAction(async () => {
      const quizAJour = await appelApi(urlQuiz)
      setQuiz(quizAJour)
      setBrouillonEdition(null)
      setConflit(false)
    }, 'Dernière version chargée. Relisez-la avant de la valider.')
  }

  if (chargement) {
    return <main className="contenu detail-cours"><p role="status">Chargement du quiz…</p></main>
  }

  if (!quiz) {
    return (
      <main className="contenu detail-cours">
        <Link to="/dashboard" className="lien-retour">Retour aux cours</Link>
        <h1>Quiz indisponible</h1>
        <p role="alert" className="erreur">{erreur}</p>
      </main>
    )
  }

  const estValide = quiz.statut === 'valide'
  const ecart = ecartRepartition(quiz.parametres, quiz.questions)

  return (
    <main className="contenu detail-cours">
      <Link to={'/cours/' + quiz.id_cours} className="lien-retour">Retour au cours</Link>
      <h1>{quiz.titre}</h1>

      <p>
        <span className="sr-only">Statut : </span>
        <strong className={'statut statut-' + quiz.statut}>
          {estValide ? 'Validé' : 'Brouillon à relire'}
        </strong>
        {quiz.fournisseur !== 'simulation' && (
          <>
            {' '}
            <span className="badge-ia">Généré par l’IA</span>
          </>
        )}
      </p>

      {/* Transparence : l'enseignant sait toujours d'où vient le contenu. */}
      {quiz.parametres && (
        <p className="aide">
          Paramètres : difficulté {LIBELLES_DIFFICULTE[quiz.parametres.difficulte]}
          {quiz.parametres.niveau && <>, niveau {LIBELLES_NIVEAU[quiz.parametres.niveau]}</>}.
        </p>
      )}
      {/* L'IA ne respecte pas toujours la répartition demandée : on le dit
          plutôt que de le masquer. Seulement tant que le quiz n'a jamais été
          modifié : ensuite, l'enseignant a pu retirer des questions volontairement. */}
      {ecart && quiz.date_modification === quiz.date_creation && (
        <p className="avertissement">Répartition différente de celle demandée : {ecart}.</p>
      )}

      {quiz.fournisseur === 'simulation' ? (
        <p className="info">
          Quiz produit en mode simulation (sans IA), à partir des phrases du cours. Configurez Ollama ou
          OpenAI pour une vraie génération.
        </p>
      ) : (
        <p className={estValide ? 'info' : 'avertissement'}>
          {!estValide && <><strong>Une IA peut se tromper.</strong>{' '}</>}
          Quiz généré par une IA {quiz.fournisseur === 'ollama' ? 'locale' : 'en ligne'} ({quiz.modele}).
          {!estValide && ' Vérifiez chaque question et chaque réponse avant de valider.'}
        </p>
      )}

      {/* Focus placé sur le message : les boutons sont désactivés pendant
          l'action, le focus serait sinon perdu */}
      {erreur && (
        <p
          id={ID_ERREUR}
          key={erreur}
          role="alert"
          className="erreur"
          tabIndex={-1}
          ref={placerFocus}
        >
          {erreur}
        </p>
      )}
      {message && (
        <p
          key={message}
          role="status"
          className="succes"
          tabIndex={-1}
          ref={placerFocus}
        >
          {message}
        </p>
      )}

      {conflit && (
        <section aria-label="Version du quiz modifiée" className="avertissement">
          <p>Le rechargement remplacera votre saisie locale par la dernière version enregistrée.</p>
          <button type="button" disabled={actionEnCours} onClick={recharger}>
            Recharger la dernière version
          </button>
        </section>
      )}

      {!brouillonEdition && (
        <>
          {/* Un seul bouton violet par zone (charte) : « Valider » tant que le quiz
              est un brouillon, puis l'export une fois le quiz validé. */}
          <div className="actions">
            {!estValide && (
              <button type="button" disabled={actionEnCours} onClick={valider}>
                J’ai relu ce quiz : le valider
              </button>
            )}
            <Link to={'/quiz/' + id + '/essai'} className="bouton bouton-secondaire">Tester le quiz</Link>
            <button
              type="button"
              className="bouton-secondaire"
              disabled={actionEnCours}
              onClick={commencerEdition}
            >
              Modifier
            </button>
            <button
              type="button"
              className="bouton-danger"
              disabled={actionEnCours}
              onClick={() => setConfirmationSuppression(true)}
            >
              Supprimer
            </button>
          </div>
          {/* Export : seulement après validation humaine (contrainte « Éthique » du CDC) */}
          <section className="zone-export" aria-labelledby="titre-export">
            <h2 id="titre-export">Exporter</h2>
            {!estValide && <p className="aide">L’export est disponible une fois le quiz validé.</p>}
            <div className="actions">
              <button
                type="button"
                disabled={actionEnCours || !estValide}
                onClick={() => exporter('json')}
              >
                Fichier JSON
              </button>
              <button
                type="button"
                className="bouton-secondaire"
                disabled={actionEnCours || !estValide}
                onClick={() => exporter('csv')}
              >
                Tableur (CSV)
              </button>
              <button
                type="button"
                className="bouton-secondaire"
                disabled={actionEnCours || !estValide}
                onClick={imprimer}
              >
                Imprimer ou enregistrer en PDF
              </button>
            </div>
          </section>

          {confirmationSuppression && (
            <section className="confirmation" aria-labelledby="titre-suppression-quiz">
              <h2 id="titre-suppression-quiz" tabIndex={-1} ref={placerFocus}>Supprimer ce quiz ?</h2>
              <p>Le quiz « {quiz.titre} » sera supprimé définitivement.</p>
              <div className="actions">
                <button
                  type="button"
                  className="bouton-danger"
                  disabled={actionEnCours}
                  onClick={supprimer}
                >
                  Confirmer la suppression
                </button>
                <button
                  type="button"
                  className="bouton-secondaire"
                  disabled={actionEnCours}
                  onClick={() => setConfirmationSuppression(false)}
                >
                  Annuler
                </button>
              </div>
            </section>
          )}

          {/* Titre de niveau 2 entre le <h1> et les questions (<h3>) : hiérarchie sans saut */}
          <h2>Questions ({quiz.questions.length})</h2>
          {quiz.questions.map((question, index) => (
            <QuestionLecture key={index} question={question} numero={index + 1}>
              <button
                type="button"
                className="bouton-secondaire"
                disabled={actionEnCours}
                onClick={() => regenererQuestion(index)}
              >
                Régénérer cette question
                <span className="sr-only"> (question {index + 1})</span>
              </button>
            </QuestionLecture>
          ))}
        </>
      )}

      {brouillonEdition && (
        <form onSubmit={enregistrer} aria-busy={actionEnCours}>
          <h2>Modification du quiz</h2>
          <label htmlFor="titre-quiz-edition">Titre du quiz</label>
          <input
            id="titre-quiz-edition"
            type="text"
            maxLength={200}
            required
            aria-invalid={(champErreur?.champ === 'titre' && !champErreur.question) || undefined}
            aria-describedby={champErreur?.champ === 'titre' ? ID_ERREUR : undefined}
            value={brouillonEdition.titre}
            onChange={(e) => setBrouillonEdition({ ...brouillonEdition, titre: e.target.value })}
          />

          {brouillonEdition.questions.map((question, index) => (
            <EditeurQuestion
              key={index}
              question={question}
              numero={index + 1}
              onChange={(questionModifiee) => modifierQuestion(index, questionModifiee)}
              onSupprimer={() => supprimerQuestion(index)}
              suppressionPossible={brouillonEdition.questions.length > 1}
              champEnErreur={champErreur?.question === index + 1 ? champErreur.champ : null}
              idErreur={ID_ERREUR}
            />
          ))}

          <div className="actions">
            <button type="submit" disabled={actionEnCours} aria-busy={actionEnCours}>
              {actionEnCours ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
            <button
              type="button"
              className="bouton-secondaire"
              disabled={actionEnCours}
              onClick={() => setBrouillonEdition(null)}
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </main>
  )
}

export default PageQuiz
