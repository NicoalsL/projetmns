// Formulaire d'édition d'une question. Composant "contrôlé" : il reçoit la
// question et renvoie chaque changement au parent (PageQuiz), qui garde
// l'ensemble du quiz en cours d'édition.
// Les identifiants des champs sont préfixés par le numéro de question pour
// rester uniques dans la page (indispensable pour les <label htmlFor>).
// champEnErreur : champ signalé par l'API pour CETTE question ('enonce',
// 'choix', 'bonne_reponse' ou 'explication'), sinon null ; idErreur :
// identifiant du message d'erreur affiché par la page.

const NOMBRE_MIN_CHOIX = 2
const NOMBRE_MAX_CHOIX = 6

const LIBELLES_TYPE = { qcm: 'QCM', vrai_faux: 'Vrai ou faux', ouverte: 'Question ouverte' }
const CLASSES_TYPE = { qcm: 'type-qcm', vrai_faux: 'type-vrai-faux', ouverte: 'type-ouverte' }

function EditeurQuestion({
  question,
  numero,
  onChange,
  onSupprimer,
  suppressionPossible,
  champEnErreur = null,
  idErreur,
}) {
  const prefixe = 'q' + numero

  // Champ signalé par l'API : marqué en erreur (bordure rouge de la charte)
  // et relié au message, que le lecteur d'écran lit en arrivant sur le champ
  // (RGAA 11.10). Les autres champs ne reçoivent aucun attribut.
  function attributsErreur(champ) {
    if (champEnErreur !== champ) {
      return {}
    }
    return { 'aria-invalid': true, 'aria-describedby': idErreur }
  }

  function modifier(champ, valeur) {
    onChange({ ...question, [champ]: valeur })
  }

  function modifierChoix(index, valeur) {
    const choix = [...question.choix]
    choix[index] = valeur
    modifier('choix', choix)
  }

  function ajouterChoix() {
    modifier('choix', [...question.choix, ''])
  }

  function retirerChoix(index) {
    const choix = question.choix.filter((_, position) => position !== index)
    // La bonne réponse est un index : on la décale si un choix au-dessus disparaît.
    let bonneReponse = question.bonne_reponse
    if (index === bonneReponse) {
      bonneReponse = 0
    } else if (index < bonneReponse) {
      bonneReponse -= 1
    }
    onChange({ ...question, choix, bonne_reponse: bonneReponse })
  }

  return (
    <fieldset className="question question-edition">
      <legend>Question {numero}</legend>
      <span className={'type-question ' + CLASSES_TYPE[question.type]}>{LIBELLES_TYPE[question.type]}</span>

      <label htmlFor={prefixe + '-enonce'}>Énoncé</label>
      <textarea
        id={prefixe + '-enonce'}
        rows={2}
        maxLength={500}
        required
        {...attributsErreur('enonce')}
        value={question.enonce}
        onChange={(e) => modifier('enonce', e.target.value)}
      />

      {question.type === 'qcm' && (
        <div role="group" aria-label={'Choix de la question ' + numero}>
          <p className="aide">Choix : cochez le bouton rond devant la bonne réponse.</p>
          {question.choix.map((choix, index) => (
            <div key={index} className="ligne-choix">
              <input
                type="radio"
                id={prefixe + '-bonne-' + index}
                name={prefixe + '-bonne-reponse'}
                checked={question.bonne_reponse === index}
                {...attributsErreur('bonne_reponse')}
                onChange={() => modifier('bonne_reponse', index)}
              />
              <label htmlFor={prefixe + '-bonne-' + index} className="sr-only">
                Le choix {index + 1} est la bonne réponse
              </label>
              <label htmlFor={prefixe + '-choix-' + index} className="sr-only">Choix {index + 1}</label>
              <input
                id={prefixe + '-choix-' + index}
                type="text"
                maxLength={200}
                required
                {...attributsErreur('choix')}
                value={choix}
                onChange={(e) => modifierChoix(index, e.target.value)}
              />
              {/* Affiché en icône poubelle par la charte : aria-label donne le nom complet */}
              <button
                type="button"
                aria-label={'Supprimer le choix ' + (index + 1)}
                disabled={question.choix.length <= NOMBRE_MIN_CHOIX}
                onClick={() => retirerChoix(index)}
              >
                Retirer
              </button>
            </div>
          ))}
          <div className="actions">
            <button
              type="button"
              className="bouton-secondaire"
              disabled={question.choix.length >= NOMBRE_MAX_CHOIX}
              onClick={ajouterChoix}
            >
              Ajouter un choix
            </button>
          </div>
        </div>
      )}

      {question.type === 'vrai_faux' && (
        <>
          <label htmlFor={prefixe + '-vrai-faux'}>Réponse</label>
          <select
            id={prefixe + '-vrai-faux'}
            value={question.bonne_reponse ? 'vrai' : 'faux'}
            {...attributsErreur('bonne_reponse')}
            onChange={(e) => modifier('bonne_reponse', e.target.value === 'vrai')}
          >
            <option value="vrai">Vrai</option>
            <option value="faux">Faux</option>
          </select>
        </>
      )}

      {question.type === 'ouverte' && (
        <>
          <label htmlFor={prefixe + '-reponse'}>Réponse attendue</label>
          <textarea
            id={prefixe + '-reponse'}
            rows={2}
            maxLength={1000}
            required
            {...attributsErreur('bonne_reponse')}
            value={question.bonne_reponse}
            onChange={(e) => modifier('bonne_reponse', e.target.value)}
          />
        </>
      )}

      <label htmlFor={prefixe + '-explication'}>
        Explication{question.type === 'vrai_faux' ? ' (obligatoire)' : ' (facultative)'}
      </label>
      <textarea
        id={prefixe + '-explication'}
        rows={2}
        maxLength={1000}
        required={question.type === 'vrai_faux'}
        {...attributsErreur('explication')}
        value={question.explication}
        onChange={(e) => modifier('explication', e.target.value)}
      />

      <div className="actions">
        <button
          type="button"
          className="bouton-secondaire"
          disabled={!suppressionPossible}
          onClick={onSupprimer}
        >
          Supprimer cette question
        </button>
      </div>
    </fieldset>
  )
}

export default EditeurQuestion
