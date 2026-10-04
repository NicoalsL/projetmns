// Logo EduQuizAI (charte graphique, docs/charte-graphique.md) en SVG intégré :
// contrairement à une balise <img>, il utilise la police Nunito de la page et
// suit le thème clair / sombre grâce aux variables CSS.
// Décoratif (aria-hidden) : le lien ou le titre qui l'entoure porte le texte.
function Logo() {
  return (
    <svg
      viewBox="0 0 150 32"
      width="150"
      height="32"
      aria-hidden="true"
      focusable="false"
    >
      {/* Bulle de dialogue violette */}
      <path
        fill="#7048E8"
        d="M9 0h14a9 9 0 0 1 9 9v10a9 9 0 0 1-9 9H14l-7 4 1.3-4.1A9 9 0 0 1 0 19V9a9 9 0 0 1 9-9z"
      />
      {/* Point d'interrogation blanc : le quiz */}
      <path
        d="M11.8 9.8a4.2 4.2 0 1 1 6.6 3.4c-1.4.9-2.4 1.7-2.4 3.3"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Étincelle jaune à la place du point : l'IA */}
      <path
        fill="#FFC83D"
        d="M16 19.7q.9 2 2.9 2.9-2 .9-2.9 2.9-.9-2-2.9-2.9 2-.9 2.9-2.9z"
      />
      {/* Couleurs et police par classes CSS (index.css), pas par style en ligne :
          la politique de sécurité du contenu (CSP) de production les interdit. */}
      <text x="42" y="23" fontSize="20" className="logo-texte">
        <tspan fontWeight="800" className="logo-nom">EduQuiz</tspan>
        <tspan dx="1.5" fontWeight="400" className="logo-ia">AI</tspan>
      </text>
    </svg>
  )
}

export default Logo
