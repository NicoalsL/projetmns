// Étiquette colorée du type d'une question (« QCM », « Vrai ou faux »…), partagée
// par la lecture, l'édition et l'essai d'un quiz.
const LIBELLES_TYPE = { qcm: 'QCM', vrai_faux: 'Vrai ou faux', ouverte: 'Question ouverte' }

// Classe de couleur de l'étiquette (charte graphique) : le libellé reste
// toujours affiché, la couleur n'est qu'un repère supplémentaire.
const CLASSES_TYPE = { qcm: 'type-qcm', vrai_faux: 'type-vrai-faux', ouverte: 'type-ouverte' }

function EtiquetteTypeQuestion({ type }) {
  return <span className={'type-question ' + CLASSES_TYPE[type]}>{LIBELLES_TYPE[type]}</span>
}

export default EtiquetteTypeQuestion
