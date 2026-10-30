import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { OCTETS_MAX_MOT_DE_PASSE, useEnvoiAuthentification } from '../auth/useEnvoiAuthentification'
import ChampMotDePasse from '../composants/ChampMotDePasse'
import ChampSaisie from '../composants/ChampSaisie'
import FormulaireAuthentification from '../composants/FormulaireAuthentification'
import { useTitrePage } from '../utilitaires/titrePage'

// Page de connexion : email et mot de passe. Le cadre (onglets, bouton,
// erreur) et l'envoi sont partagés avec PageInscription.
function PageConnexion() {
  const [parametres] = useSearchParams()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const envoi = useEnvoiAuthentification('/api/auth/connexion')
  useTitrePage('Connexion')

  // Anciennes adresses /connexion?onglet=inscription (favoris, historique) :
  // l'inscription a désormais sa propre page.
  if (parametres.get('onglet') === 'inscription') {
    return <Navigate to="/inscription" replace />
  }

  function soumettre(evenement) {
    evenement.preventDefault()
    envoi.envoyer({ email: email.trim(), motDePasse })
  }

  return (
    <FormulaireAuthentification
      onglet="connexion"
      envoi={envoi}
      onSoumettre={soumettre}
    >
      <ChampSaisie
        id="email"
        libelle="Adresse email"
        name="email"
        type="email"
        autoComplete="email"
        maxLength={255}
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        {...envoi.liaisonErreur('email')}
      />

      <ChampMotDePasse
        autoComplete="current-password"
        minLength={1}
        maxLength={OCTETS_MAX_MOT_DE_PASSE}
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
        {...envoi.liaisonErreur('motDePasse')}
      />
    </FormulaireAuthentification>
  )
}

export default PageConnexion
