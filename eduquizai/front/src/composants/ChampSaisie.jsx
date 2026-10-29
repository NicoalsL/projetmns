import { attributsErreur } from '../utilitaires/champsFormulaire'

// Champ de saisie avec son libellé. En erreur, il est marqué et relié au
// message (voir attributsErreur). Les autres attributs (type, autoComplete,
// maxLength, value, onChange…) sont transmis tels quels à l'<input>.
function ChampSaisie({ id, libelle, enErreur, idErreur, ...attributs }) {
  return (
    <>
      <label htmlFor={id}>{libelle}</label>
      <input
        id={id}
        {...attributs}
        {...attributsErreur(enErreur, idErreur)}
      />
    </>
  )
}

export default ChampSaisie
