import { useState } from 'react'
import { attributsErreur } from '../utilitaires/champsFormulaire'

const ID_CHAMP = 'mot-de-passe'
const ID_AIDE = 'aide-mot-de-passe'

// Champ mot de passe avec son bouton Afficher / Masquer. Le texte d'aide
// n'est affiché que s'il est fourni (à l'inscription). Les autres attributs
// (autoComplete, minLength, value, onChange…) vont à l'<input>.
function ChampMotDePasse({ aide, enErreur, idErreur, ...attributs }) {
  // Afficher le mot de passe en clair évite les fautes de frappe, surtout sur mobile.
  const [visible, setVisible] = useState(false)

  return (
    <>
      <label htmlFor={ID_CHAMP}>Mot de passe</label>
      <div className="champ-mot-de-passe">
        <input
          id={ID_CHAMP}
          name="motDePasse"
          type={visible ? 'text' : 'password'}
          required
          {...attributs}
          {...attributsErreur(enErreur, idErreur, aide && ID_AIDE)}
        />
        {/* aria-pressed : le lecteur d'écran annonce si le mot de passe est affiché */}
        <button
          type="button"
          className="bouton-secondaire"
          aria-pressed={visible}
          aria-controls={ID_CHAMP}
          onClick={() => setVisible(!visible)}
        >
          {visible ? 'Masquer' : 'Afficher'}
        </button>
      </div>
      {aide && (
        <p id={ID_AIDE} className="aide">
          {aide}
        </p>
      )}
    </>
  )
}

export default ChampMotDePasse
