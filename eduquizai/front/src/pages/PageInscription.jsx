import { useState } from 'react'
import { OCTETS_MAX_MOT_DE_PASSE, useEnvoiAuthentification } from '../auth/useEnvoiAuthentification'
import CaseConsentement from '../components/CaseConsentement'
import ChampMotDePasse from '../components/ChampMotDePasse'
import ChampSaisie from '../components/ChampSaisie'
import FormulaireAuthentification from '../components/FormulaireAuthentification'
import { useTitrePage } from '../utils/titrePage'

// Mêmes limites que la table utilisateur (schema.sql) et que le back.
const LONGUEUR_MAX_NOM = 100
const LONGUEUR_MIN_MOT_DE_PASSE = 12 // recommandation OWASP ASVS (V2.1.1)

// Page d'inscription : nom, email, mot de passe et consentement RGPD. Le cadre
// (onglets, bouton, erreur) et l'envoi sont partagés avec PageConnexion.
function PageInscription() {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [consentement, setConsentement] = useState(false)
  const envoi = useEnvoiAuthentification('/api/auth/inscription')
  useTitrePage('Créer un compte')

  function soumettre(evenement) {
    evenement.preventDefault()
    envoi.envoyer({
      nom: nom.trim(),
      email: email.trim(),
      motDePasse,
      consentementRgpd: consentement,
    })
  }

  return (
    <FormulaireAuthentification
      onglet="inscription"
      envoi={envoi}
      onSoumettre={soumettre}
    >
      <ChampSaisie
        id="nom"
        libelle="Nom"
        name="nom"
        type="text"
        autoComplete="name"
        maxLength={LONGUEUR_MAX_NOM}
        required
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        {...envoi.liaisonErreur('nom')}
      />

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
        aide="Au moins 12 caractères, au plus 72 octets UTF-8 (certains caractères en occupent plusieurs)."
        autoComplete="new-password"
        minLength={LONGUEUR_MIN_MOT_DE_PASSE}
        maxLength={OCTETS_MAX_MOT_DE_PASSE}
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
        {...envoi.liaisonErreur('motDePasse')}
      />

      <CaseConsentement
        coche={consentement}
        onChanger={setConsentement}
        {...envoi.liaisonErreur('consentement')}
      />
    </FormulaireAuthentification>
  )
}

export default PageInscription
