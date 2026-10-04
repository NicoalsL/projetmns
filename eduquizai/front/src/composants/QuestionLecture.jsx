const LIBELLES_TYPE = { qcm: 'QCM', vrai_faux: 'Vrai ou faux', ouverte: 'Question ouverte' }

// Classe de couleur de l'étiquette (charte graphique) : le libellé reste
// toujours affiché, la couleur n'est qu'un repère supplémentaire.
const CLASSES_TYPE = { qcm: 'type-qcm', vrai_faux: 'type-vrai-faux', ouverte: 'type-ouverte' }

// Un vrai/faux est présenté comme un QCM à deux réponses (A : Vrai, B : Faux).
const CHOIX_VRAI_FAUX = ['Vrai', 'Faux']

// Liste des réponses proposées, lettres A, B, C ajoutées par la feuille de style.
// La bonne réponse est signalée par la couleur, une coche ET un texte lu par
// les lecteurs d'écran (l'information ne repose jamais sur la seule couleur).
function ListeChoix({ choix, indexBonneReponse }) {
  return (
    <ol className="choix">
      {choix.map((libelle, index) => (
        <li key={index} className={index === indexBonneReponse ? 'bonne-reponse' : undefined}>
          {libelle}
          {index === indexBonneReponse && <span className="sr-only"> (bonne réponse)</span>}
        </li>
      ))}
    </ol>
  )
}

// Affichage en lecture seule d'une question, avec sa bonne réponse visible :
// cette vue sert à l'enseignant pour relire le quiz avant de le valider.
// children (facultatif) : boutons d'action affichés sous la question.
function QuestionLecture({ question, numero, children }) {
  return (
    <article className="question">
      <span className={'type-question ' + CLASSES_TYPE[question.type]}>{LIBELLES_TYPE[question.type]}</span>
      <h3>{numero}. {question.enonce}</h3>

      {question.type === 'qcm' && (
        <ListeChoix choix={question.choix} indexBonneReponse={question.bonne_reponse} />
      )}

      {question.type === 'vrai_faux' && (
        <ListeChoix choix={CHOIX_VRAI_FAUX} indexBonneReponse={question.bonne_reponse ? 0 : 1} />
      )}

      {question.type === 'ouverte' && (
        <p className="explication"><strong>Réponse attendue :</strong> {question.bonne_reponse}</p>
      )}

      {question.explication && (
        <p className="explication"><strong>Explication :</strong> {question.explication}</p>
      )}

      {/* Phrase du cours qui justifie la réponse, citée par l'IA. Si elle est
          introuvable dans le cours (source_trouvee = false), l'IA a pu inventer :
          on le signale pour que l'enseignant vérifie cette question en priorité. */}
      {question.source && (
        <blockquote className="source-cours">
          <strong>Extrait du cours :</strong> « {question.source} »
        </blockquote>
      )}
      {question.source_trouvee === false && (
        <p className="avertissement">
          <strong>Citation introuvable dans le cours.</strong> L’IA a peut-être inventé cette information :
          vérifiez cette question avec attention.
        </p>
      )}

      {children && <div className="actions">{children}</div>}
    </article>
  )
}

export default QuestionLecture
