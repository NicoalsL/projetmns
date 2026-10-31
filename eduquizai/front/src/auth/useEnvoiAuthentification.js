import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import appelApi from '../api/client'
import { definirSession, signalerAutresOnglets } from './session'

// Rôle : envoi d'un formulaire d'authentification (connexion ou inscription),
// partagé par PageConnexion et PageInscription. Seuls l'adresse de l'API et
// le corps envoyé diffèrent ; tout le reste est commun et écrit une seule fois.

// Même limite que le back (bcrypt ignore au-delà de 72 octets).
export const OCTETS_MAX_MOT_DE_PASSE = 72
export const ID_ERREUR = 'erreur-connexion'

// Associe un message d'erreur (rédigé par l'API ou par ce formulaire) aux
// champs qu'il concerne : ces champs sont marqués aria-invalid et reliés au
// message (RGAA 11.10). L'ordre compte : le premier motif reconnu l'emporte.
const CHAMPS_PAR_MESSAGE = [
  [/mot de passe incorrect/i, ['email', 'motDePasse']],
  [/^le nom/i, ['nom']],
  [/email/i, ['email']],
  [/mot de passe/i, ['motDePasse']],
  [/politique de confidentialité/i, ['consentement']],
]

function champsConcernes(message) {
  const correspondance = CHAMPS_PAR_MESSAGE.find(([motif]) => motif.test(message))
  return correspondance ? correspondance[1] : []
}

// SÉCURITÉ — Nombre de caractères réels (points de code Unicode), comme le back :
// « texte.length » et l'attribut HTML minLength comptent des unités UTF-16, et un
// emoji en occupe 2. Sans cela, 6 emojis passaient pour 12 caractères.
export function nombreDeCaracteres(texte) {
  return Array.from(texte).length
}

// longueurMinMotDePasse : 12 à l'inscription, 1 à la connexion (les anciens comptes
// gardent un mot de passe plus court). Le back fait la même vérification et fait foi.
export function useEnvoiAuthentification(cheminApi, { longueurMinMotDePasse = 1 } = {}) {
  const [erreur, setErreur] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  // Un état React n'est mis à jour qu'au rendu suivant : un double-clic
  // rapide passerait. Une ref est modifiée immédiatement.
  const verrouEnvoi = useRef(false)
  const navigue = useNavigate()
  const champsEnErreur = erreur ? champsConcernes(erreur) : []

  // Propriétés communes aux champs : sont-ils concernés par l'erreur affichée,
  // et quel message les décrit (voir utils/champsFormulaire.js).
  function liaisonErreur(champ) {
    return { enErreur: champsEnErreur.includes(champ), idErreur: ID_ERREUR }
  }

  async function envoyer(corps) {
    if (verrouEnvoi.current) {
      return
    }
    setErreur('')

    if (nombreDeCaracteres(corps.motDePasse) < longueurMinMotDePasse) {
      setErreur(`Le mot de passe doit contenir au moins ${longueurMinMotDePasse} caractères.`)
      return
    }

    if (new TextEncoder().encode(corps.motDePasse).length > OCTETS_MAX_MOT_DE_PASSE) {
      setErreur('Le mot de passe ne doit pas dépasser 72 octets UTF-8.')
      return
    }

    verrouEnvoi.current = true
    setEnvoiEnCours(true)

    try {
      const session = await appelApi(cheminApi, { method: 'POST', body: JSON.stringify(corps) })
      if (!session.expiration || !session.id_utilisateur) {
        throw new Error('La réponse du serveur ne contient pas de session valide.')
      }
      localStorage.removeItem('jeton') // supprimer l'ancien JWT de la version localStorage
      definirSession(session)
      signalerAutresOnglets()
      navigue('/dashboard', { replace: true })
    } catch (e) {
      setErreur(e.message)
    } finally {
      verrouEnvoi.current = false
      setEnvoiEnCours(false)
    }
  }

  return { erreur, envoiEnCours, envoyer, liaisonErreur }
}
