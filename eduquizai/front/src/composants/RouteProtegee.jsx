import { Fragment, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AvertissementSession from './AvertissementSession'
import { compteDuJeton, chargerSession, obtenirSession, surveillerSession } from '../auth/session'

// Redirige vers la connexion si la session est absente ou expirée.
// Utilisé dans App.jsx autour de chaque page réservée aux enseignants connectés.
function RouteProtegee({ enfant }) {
  const [jeton, setJeton] = useState(obtenirSession)
  const [charge, setCharge] = useState(false)

  // surveillerSession renvoie sa fonction d'arrêt, que React appelle au démontage.
  useEffect(() => {
    const arreter = surveillerSession(setJeton)
    chargerSession().finally(() => setCharge(true))
    return arreter
  }, [])

  if (!charge) {
    return <p role="status">Vérification de la session…</p>
  }

  if (!jeton) {
    return <Navigate to="/connexion" replace state={{ sessionExpiree: true }} />
  }

  // key = compte du jeton : si un autre compte se connecte dans un autre onglet,
  // la page est recréée et recharge les données du nouveau compte (pas celles
  // de l'ancien). Une prolongation de session garde le même compte : la page
  // n'est pas recréée et une saisie en cours est conservée.
  return (
    <Fragment key={compteDuJeton()}>
      <AvertissementSession key={jeton.expiration} jeton={jeton} />
      {enfant}
    </Fragment>
  )
}

export default RouteProtegee
