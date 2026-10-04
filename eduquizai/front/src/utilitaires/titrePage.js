import { useEffect } from 'react'

const NOM_DU_SITE = 'EduQuizAI'

// Donne à chaque page un titre d'onglet unique et explicite (RGAA 8.6,
// WCAG 2.4.2) : « Mes cours – EduQuizAI ». Sans lui, toutes les pages
// s'appelleraient pareil et un lecteur d'écran ne saurait pas où il se trouve.
// Le titre est mis à jour quand il change (ex. titre du cours une fois chargé).
export function useTitrePage(titre) {
  useEffect(() => {
    document.title = titre ? titre + ' – ' + NOM_DU_SITE : NOM_DU_SITE
  }, [titre])
}
