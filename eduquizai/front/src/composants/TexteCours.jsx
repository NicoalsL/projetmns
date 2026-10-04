import Markdown from 'react-markdown'

// Chaque page a déjà son propre <h1> (le titre du cours) : les titres écrits
// dans le Markdown sont donc décalés d'un niveau (« # » devient <h2>…) pour
// garder une hiérarchie de titres correcte (RGAA 9.1).
const NIVEAUX_DECALES = { h1: 'h2', h2: 'h3', h3: 'h4', h4: 'h5', h5: 'h6', h6: 'h6' }

// Lien écrit dans un cours. Un lien vers un autre site est annoncé comme tel
// aux lecteurs d'écran (RGAA 6.1) et n'envoie pas l'adresse de la page
// d'origine (noreferrer : le site externe ne voit pas l'URL du cours).
// react-markdown filtre déjà les adresses dangereuses (javascript:…).
function LienCours({ href, children }) {
  const estExterne = /^https?:\/\//i.test(href ?? '')
  return (
    <a href={href} rel={estExterne ? 'noopener noreferrer' : undefined}>
      {children}
      {estExterne && <span className="sr-only"> (site externe)</span>}
    </a>
  )
}

const COMPOSANTS = { ...NIVEAUX_DECALES, a: LienCours }

// Affiche le texte d'un cours écrit en Markdown. react-markdown ignore tout
// HTML brut : une balise <script> tapée dans un cours n'est jamais exécutée.
function TexteCours({ texte }) {
  return <Markdown components={COMPOSANTS}>{texte}</Markdown>
}

export default TexteCours
