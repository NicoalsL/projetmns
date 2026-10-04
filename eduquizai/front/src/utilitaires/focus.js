import { useEffect } from 'react'

// Ref "callback" qui place le focus clavier sur un élément dès son affichage.
// Usage : <h2 tabIndex={-1} ref={placerFocus}>. Utilisé :
// - sur le titre des confirmations de suppression : un lecteur d'écran annonce
//   la question, et la touche Tab mène directement aux boutons Confirmer / Annuler ;
// - sur les messages d'erreur et de succès (avec key={message} pour refocaliser
//   à chaque nouveau message) : le focus n'est plus perdu quand le bouton
//   utilisé a été désactivé pendant l'envoi.
// Fonction définie hors des composants : sa référence ne change jamais, donc
// React ne l'appelle qu'à l'apparition de l'élément, pas à chaque rendu.
export function placerFocus(element) {
  element?.focus()
}

// Complète GestionNavigation (App.jsx) pour les pages qui chargent leurs
// données : au changement de page, leur <h1> n'existe pas encore et le focus
// est placé sur la zone de contenu. Une fois les données reçues (pret = true),
// on le déplace sur le titre pour que le lecteur d'écran l'annonce.
// Si l'utilisateur a déjà déplacé le focus ailleurs, on n'y touche pas.
export function useFocusTitreApresChargement(pret) {
  useEffect(() => {
    if (!pret || document.activeElement?.id !== 'contenu') {
      return
    }
    const titre = document.querySelector('#contenu h1')
    if (titre) {
      titre.setAttribute('tabindex', '-1')
      titre.focus({ preventScroll: true })
    }
  }, [pret])
}
