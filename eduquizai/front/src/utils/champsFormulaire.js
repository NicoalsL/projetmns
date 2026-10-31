// Attributs d'accessibilité d'un champ de formulaire (RGAA 11.10), partagés par
// ChampSaisie, ChampMotDePasse et CaseConsentement :
// - aria-invalid quand le champ est concerné par l'erreur affichée ;
// - aria-describedby vers le texte d'aide éventuel et, en cas d'erreur, vers
//   le message d'erreur (le lecteur d'écran les lit en arrivant sur le champ).
export function attributsErreur(enErreur, idErreur, idAide) {
  // Liste d'identifiants pour aria-describedby (undefined si la liste est vide).
  const descriptions = [idAide, enErreur && idErreur].filter(Boolean)

  return {
    'aria-invalid': enErreur || undefined,
    'aria-describedby': descriptions.length > 0 ? descriptions.join(' ') : undefined,
  }
}
