import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import appelApi from '../api/client'
import { calculerScore, estBonneReponse, messageScore } from '../utilitaires/essaiQuiz'
import { placerFocus, useFocusTitreApresChargement } from '../utilitaires/focus'
import { useTitrePage } from '../utilitaires/titrePage'

const LIBELLES_TYPE = { qcm: 'QCM', vrai_faux: 'Vrai ou faux', ouverte: 'Question ouverte' }
const CLASSES_TYPE = { qcm: 'type-qcm', vrai_faux: 'type-vrai-faux', ouverte: 'type-ouverte' }
const LETTRES = 'ABCDEF'
const APPRECIATIONS_IA = { juste: 'juste', partielle: 'partiellement juste', fausse: 'fausse' }

// Réponse attendue en clair, pour l'afficher après vérification.
function bonneReponseEnTexte(question) {
  if (question.type === 'qcm') {
    return LETTRES[question.bonne_reponse] + '. ' + question.choix[question.bonne_reponse]
  }
  if (question.type === 'vrai_faux') {
    return question.bonne_reponse ? 'Vrai' : 'Faux'
  }
  return question.bonne_reponse
}

// Page /quiz/:id/essai : l'enseignant passe son quiz comme un élève, une
// question à la fois, avec correction immédiate et score final. Rien n'est
// enregistré : c'est un aperçu « en situation » du quiz (visualisation
// dynamique demandée par le CDC). La key recrée tout l'état si l'id change.
function PageEssaiQuiz() {
  const { id } = useParams()
  return <EssaiQuiz key={id} id={id} />
}

function EssaiQuiz({ id }) {
  const [quiz, setQuiz] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [position, setPosition] = useState(0)
  // Réponse donnée et résultat retenu, par numéro de question.
  const [reponses, setReponses] = useState({})
  const [evaluations, setEvaluations] = useState({})
  const [verifiee, setVerifiee] = useState(false)
  const [termine, setTermine] = useState(false)
  // Avis de l'IA sur une réponse ouverte : { appreciation, commentaire }.
  const [avisIa, setAvisIa] = useState({})
  const [correctionEnCours, setCorrectionEnCours] = useState(false)
  const verrouCorrection = useRef(false)
  useTitrePage(quiz ? 'Tester : ' + quiz.titre : 'Tester un quiz')
  useFocusTitreApresChargement(!chargement)

  useEffect(() => {
    let pageAffichee = true

    appelApi('/api/quiz/' + encodeURIComponent(id))
      .then((resultat) => {
        if (pageAffichee) {
          setQuiz(resultat)
        }
      })
      .catch((e) => {
        if (pageAffichee) {
          setErreur(e.status === 404 ? 'Ce quiz est introuvable ou ne vous appartient pas.' : e.message)
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
  }, [id])

  if (chargement) {
    return <main className="contenu"><p role="status">Chargement du quiz…</p></main>
  }

  if (!quiz) {
    return (
      <main className="contenu">
        <Link to="/dashboard" className="lien-retour">Retour aux cours</Link>
        <h1>Quiz indisponible</h1>
        <p role="alert" className="erreur">{erreur}</p>
      </main>
    )
  }

  const questions = quiz.questions
  const question = questions[position]
  const reponse = reponses[position]
  const evaluation = evaluations[position]
  const derniereQuestion = position === questions.length - 1

  function repondre(valeur) {
    setReponses({ ...reponses, [position]: valeur })
    setErreur('')
  }

  function verifier(evenement) {
    evenement.preventDefault()
    const sansReponse = reponse === undefined || (question.type === 'ouverte' && !reponse.trim())
    if (sansReponse) {
      setErreur('Répondez à la question avant de vérifier.')
      return
    }
    const juste = estBonneReponse(question, reponse)
    // Question ouverte : pas de résultat automatique, la personne s'évalue.
    if (juste !== null) {
      setEvaluations({ ...evaluations, [position]: juste })
    }
    setErreur('')
    setVerifiee(true)
  }

  function evaluerSoiMeme(juste) {
    setEvaluations({ ...evaluations, [position]: juste })
  }

  // L'IA compare la réponse rédigée à la réponse attendue. Son avis n'est
  // qu'une aide : c'est toujours la personne qui décide (« Éthique » du CDC).
  async function demanderAvisIa() {
    if (verrouCorrection.current) {
      return
    }
    verrouCorrection.current = true
    setCorrectionEnCours(true)
    setErreur('')
    try {
      const avis = await appelApi('/api/quiz/' + encodeURIComponent(id) + '/questions/' + position + '/correction', {
        method: 'POST',
        body: JSON.stringify({ reponse }),
      })
      setAvisIa({ ...avisIa, [position]: avis })
    } catch (e) {
      setErreur(e.message)
    } finally {
      verrouCorrection.current = false
      setCorrectionEnCours(false)
    }
  }

  function questionSuivante() {
    if (derniereQuestion) {
      setTermine(true)
      return
    }
    setPosition(position + 1)
    setVerifiee(false)
    setErreur('')
  }

  function recommencer() {
    setPosition(0)
    setReponses({})
    setEvaluations({})
    setAvisIa({})
    setVerifiee(false)
    setTermine(false)
    setErreur('')
  }

  return (
    <main className="contenu">
      <Link to={'/quiz/' + id} className="lien-retour">Retour au quiz</Link>
      <h1>Tester : {quiz.titre}</h1>
      <p className="info">Mode essai : répondez comme un élève. Vos réponses ne sont pas enregistrées.</p>

      {termine ? (
        <section className="carte essai-resultat" aria-labelledby="titre-resultat">
          <h2 id="titre-resultat" tabIndex={-1} ref={placerFocus}>Résultat</h2>
          <p className="essai-score">{messageScore(calculerScore(questions, evaluations))}</p>
          <ol className="essai-recapitulatif">
            {questions.map((questionPassee, index) => (
              <li key={index}>
                {questionPassee.enonce}{' '}
                <strong className={evaluations[index] ? 'statut statut-valide' : 'statut statut-brouillon'}>
                  {evaluations[index] ? 'Juste' : 'À revoir'}
                </strong>
              </li>
            ))}
          </ol>
          <div className="actions">
            <button type="button" onClick={recommencer}>Recommencer</button>
            <Link to={'/quiz/' + id} className="bouton bouton-secondaire">Retour au quiz</Link>
          </div>
        </section>
      ) : (
        <form className="question essai-question" onSubmit={verifier}>
          <p className="aide essai-progression">
            Question {position + 1} sur {questions.length}
            <progress value={position + 1} max={questions.length} aria-hidden="true" />
          </p>
          <span className={'type-question ' + CLASSES_TYPE[question.type]}>{LIBELLES_TYPE[question.type]}</span>

          {/* key : le titre est refocalisé à chaque nouvelle question */}
          <h2 key={position} id="enonce-essai" tabIndex={-1} ref={position > 0 ? placerFocus : undefined}>
            {question.enonce}
          </h2>

          {question.type !== 'ouverte' && (
            <fieldset className="choix-essai" aria-labelledby="enonce-essai" disabled={verifiee}>
              {(question.type === 'qcm' ? question.choix : ['Vrai', 'Faux']).map((libelle, index) => {
                const valeur = question.type === 'qcm' ? index : index === 0
                return (
                  <div key={index} className="case">
                    <input
                      id={'essai-choix-' + index}
                      type="radio"
                      name="reponse-essai"
                      checked={reponse === valeur}
                      onChange={() => repondre(valeur)}
                    />
                    <label htmlFor={'essai-choix-' + index}>{libelle}</label>
                  </div>
                )
              })}
            </fieldset>
          )}

          {question.type === 'ouverte' && (
            <>
              <label htmlFor="reponse-ouverte">Votre réponse</label>
              <textarea
                id="reponse-ouverte"
                rows={3}
                maxLength={1000}
                readOnly={verifiee}
                value={reponse ?? ''}
                onChange={(e) => repondre(e.target.value)}
              />
            </>
          )}

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

          {!verifiee && (
            <div className="actions">
              <button type="submit">Vérifier ma réponse</button>
            </div>
          )}

          {/* Correction : focalisée pour être lue immédiatement */}
          {verifiee && question.type !== 'ouverte' && (
            <p
              key={'correction-' + position}
              role="status"
              className={evaluation ? 'succes' : 'avertissement'}
              tabIndex={-1}
              ref={placerFocus}
            >
              {evaluation
                ? 'Bonne réponse !'
                : 'Pas tout à fait. La bonne réponse était : ' + bonneReponseEnTexte(question)}
            </p>
          )}

          {verifiee && question.type === 'ouverte' && (
            <>
              <p
                key={'attendue-' + position}
                className="explication"
                tabIndex={-1}
                ref={placerFocus}
              >
                <strong>Réponse attendue :</strong> {question.bonne_reponse}
              </p>

              {avisIa[position] && (
                <p role="status" className="info">
                  <strong>Avis de l’IA : réponse {APPRECIATIONS_IA[avisIa[position].appreciation]}.</strong>{' '}
                  {avisIa[position].commentaire}
                </p>
              )}

              <div className="actions" role="group" aria-label="Évaluer votre réponse">
                <button
                  type="button"
                  className="bouton-secondaire"
                  disabled={correctionEnCours}
                  aria-busy={correctionEnCours}
                  onClick={demanderAvisIa}
                >
                  {correctionEnCours ? 'Correction en cours…' : 'Demander l’avis de l’IA'}
                </button>
                <button
                  type="button"
                  className={evaluation === true ? undefined : 'bouton-secondaire'}
                  aria-pressed={evaluation === true}
                  onClick={() => evaluerSoiMeme(true)}
                >
                  Ma réponse était juste
                </button>
                <button
                  type="button"
                  className={evaluation === false ? undefined : 'bouton-secondaire'}
                  aria-pressed={evaluation === false}
                  onClick={() => evaluerSoiMeme(false)}
                >
                  Elle était fausse
                </button>
              </div>
            </>
          )}

          {verifiee && question.explication && (
            <p className="explication"><strong>Explication :</strong> {question.explication}</p>
          )}

          {verifiee && evaluation !== undefined && (
            <div className="actions">
              <button type="button" onClick={questionSuivante}>
                {derniereQuestion ? 'Voir mon résultat' : 'Question suivante'}
              </button>
            </div>
          )}
        </form>
      )}
    </main>
  )
}

export default PageEssaiQuiz
