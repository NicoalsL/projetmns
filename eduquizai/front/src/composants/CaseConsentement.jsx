import { Link } from 'react-router-dom'
import { attributsErreur } from '../utilitaires/champsFormulaire'

// RGPD : consentement explicite, case jamais pré-cochée. Le lien
// s'ouvre dans un nouvel onglet pour ne pas perdre la saisie.
function CaseConsentement({ coche, onChanger, enErreur, idErreur }) {
  return (
    <div className="consentement">
      <input
        id="consentement"
        type="checkbox"
        required
        {...attributsErreur(enErreur, idErreur)}
        checked={coche}
        onChange={(e) => onChanger(e.target.checked)}
      />
      <label htmlFor="consentement">
        J’accepte que mes données soient traitées conformément à la{' '}
        <Link to="/confidentialite" target="_blank" rel="noopener noreferrer">
          politique de confidentialité
          <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
        </Link>
        .
      </label>
    </div>
  )
}

export default CaseConsentement
