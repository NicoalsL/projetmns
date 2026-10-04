import { Link } from 'react-router-dom'
import QuestionLecture from '../composants/QuestionLecture'
import { sessionValide } from '../auth/session'
import { useTitrePage } from '../utilitaires/titrePage'

// Exemple statique affiché sur l'accueil : montre au visiteur à quoi ressemble
// une question relue, avec exactement le même rendu que dans l'application.
const QUESTION_EXEMPLE = {
  type: 'qcm',
  enonce: 'Dans quel organite se déroule principalement la photosynthèse ?',
  choix: ['La mitochondrie', 'Le chloroplaste', 'Le noyau', 'La vacuole'],
  bonne_reponse: 1,
  explication: 'Le cours précise que la photosynthèse a lieu dans les chloroplastes des cellules des feuilles.',
}

const ETAPES = [
  {
    titre: 'Déposez votre cours',
    texte: 'Collez votre texte ou importez un fichier .txt ou .md. Le Markdown (titres, listes, gras) est accepté.',
  },
  {
    titre: 'Générez un quiz',
    texte: 'Choisissez le nombre de questions, le niveau des élèves, la difficulté et les types : '
      + 'QCM, vrai ou faux, questions ouvertes.',
  },
  {
    titre: 'Relisez et validez',
    texte: 'Corrigez chaque question si besoin, validez le quiz, puis exportez-le en JSON.',
  },
]

// Page publique "/" : présente le service avant la connexion. Un enseignant
// déjà connecté voit un accès direct à ses cours au lieu des boutons de
// connexion (contrôle d'interface seulement : l'API vérifie toujours le jeton).
// L'en-tête (logo, connexion, inscription) est commun à tout le site : App.jsx.
function PageAccueil() {
  const connecte = sessionValide()
  useTitrePage('Accueil')

  return (
    <main className="contenu accueil">
      <section className="accueil-presentation" aria-labelledby="titre-accueil">
        <span className="badge-ia">Assisté par IA</span>
        <h1 id="titre-accueil">Transformez vos cours en quiz, relus et validés par vous</h1>
        <p className="accroche">
          EduQuizAI aide les enseignants, du primaire au supérieur, à préparer des quiz à partir de leurs
          propres cours. L’IA propose les questions ; vous gardez toujours le dernier mot.
        </p>
        <div className="actions">
          {connecte ? (
            <Link to="/dashboard" className="bouton">Accéder à mes cours</Link>
          ) : (
            <>
              <Link to="/connexion?onglet=inscription" className="bouton">Créer un compte</Link>
              <Link to="/connexion" className="bouton bouton-secondaire">J’ai déjà un compte</Link>
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="titre-etapes">
        <h2 id="titre-etapes">Comment ça marche ?</h2>
        <ol className="etapes">
          {ETAPES.map((etape) => (
            <li key={etape.titre}>
              <h3>{etape.titre}</h3>
              <p>{etape.texte}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="accueil-deux-colonnes" aria-labelledby="titre-validation">
        <div>
          <h2 id="titre-validation">L’IA propose, vous décidez</h2>
          <p>
            Une IA peut se tromper. C’est pourquoi chaque quiz généré est d’abord un brouillon : vous le
            relisez, le corrigez, puis le validez. Seul un quiz validé peut être exporté, et toute
            modification le repasse en brouillon.
          </p>
          <p className="info">
            L’IA a pour consigne de rédiger les questions uniquement à partir du texte de votre cours :
            votre relecture permet de vérifier qu’elle l’a respectée.
          </p>
        </div>

        {/* Exemple visuel : rendu identique à la page de relecture d'un quiz */}
        <div aria-label="Exemple de question générée puis relue">
          <QuestionLecture question={QUESTION_EXEMPLE} numero={1} />
        </div>
      </section>

      <section aria-labelledby="titre-donnees">
        <h2 id="titre-donnees">Vos données restent les vôtres</h2>
        <ul className="engagements">
          <li>Vos cours et vos quiz ne sont visibles que par vous.</li>
          <li>Votre mot de passe n’est jamais stocké en clair (empreinte bcrypt).</li>
          <li>Aucune donnée sur vos élèves n’est demandée, aucun cookie publicitaire n’est déposé.</li>
          <li>Vous pouvez supprimer votre compte et toutes vos données à tout moment.</li>
        </ul>
        <p>
          <Link to="/confidentialite">Lire la politique de confidentialité</Link>
        </p>
      </section>
    </main>
  )
}

export default PageAccueil
