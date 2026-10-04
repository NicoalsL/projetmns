import { Link } from 'react-router-dom'
import { useTitrePage } from '../utilitaires/titrePage'

// Page publique "Mentions légales et politique de confidentialité" (RGPD).
// Exigée par le REAC (compétence "Développer des interfaces utilisateur" :
// la réglementation en vigueur est respectée) et par le CDC. SchoolUp est une
// entreprise fictive : les coordonnées sont celles d'un projet pédagogique.
function PageConfidentialite() {
  useTitrePage('Mentions légales et confidentialité')

  return (
    <main className="contenu detail-cours page-texte">
      <Link to="/" className="lien-retour">Retour à l’accueil</Link>
      <h1>Mentions légales et politique de confidentialité</h1>
      <p>Dernière mise à jour : 3 octobre 2026.</p>

      <h2>Éditeur et responsable du traitement</h2>
      <p>
        EduQuizAI est édité par SchoolUp, entreprise fictive créée dans le cadre d’un projet de formation
        (titre professionnel Concepteur Développeur d’Applications). Pour toute question sur vos données :
        contact-rgpd@schoolup.example.
      </p>

      <h2>Données collectées et finalités</h2>
      {/* Sur mobile, le tableau défile dans son cadre (navigable au clavier) */}
      <div
        className="table-conteneur"
        role="region"
        aria-label="Données traitées par EduQuizAI"
        tabIndex={0}
      >
        <table>
          <caption>Données traitées par EduQuizAI</caption>
          <thead>
            <tr>
              <th scope="col">Donnée</th>
              <th scope="col">Pourquoi</th>
              <th scope="col">Durée de conservation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Nom, adresse email</td>
              <td>Créer et identifier votre compte</td>
              <td>Jusqu’à la suppression du compte</td>
            </tr>
            <tr>
              <td>Mot de passe (empreinte bcrypt : hachage irréversible, jamais en clair)</td>
              <td>Sécuriser la connexion</td>
              <td>Jusqu’à la suppression du compte</td>
            </tr>
            <tr>
              <td>Cours et quiz que vous créez</td>
              <td>Fournir le service : générer, modifier et exporter vos quiz</td>
              <td>Jusqu’à leur suppression ou celle du compte</td>
            </tr>
            <tr>
              <td>Journal des générations (date, statut, durée, nombre de questions)</td>
              <td>Historique, mesure des performances, diagnostic des erreurs</td>
              <td>6 mois, puis suppression automatique</td>
            </tr>
            <tr>
              <td>Journal de sécurité (type d’action, date, numéro de compte — ni email ni adresse IP)</td>
              <td>Détecter les abus : tentatives de connexion répétées, suppressions, exports</td>
              <td>6 mois, puis suppression automatique</td>
            </tr>
            <tr>
              <td>Date de votre consentement</td>
              <td>Prouver que vous avez accepté cette politique</td>
              <td>Jusqu’à la suppression du compte</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Base légale : votre consentement, donné à l’inscription, et l’exécution du service que vous utilisez.
        Seules les données nécessaires au service sont collectées (principe de minimisation) : aucune donnée
        sur vos élèves n’est demandée. Ne saisissez pas de données personnelles d’élèves dans vos cours.
      </p>

      <h2>Intelligence artificielle et destinataires</h2>
      <p>
        Pour générer un quiz, le texte de votre cours est transmis à un modèle d’intelligence artificielle.
        Selon la configuration de l’établissement, ce modèle est soit exécuté localement sur le serveur
        d’EduQuizAI (aucune transmission à un tiers), soit fourni par OpenAI (le texte du cours est alors
        envoyé à ce prestataire, qui peut le traiter hors de l’Union européenne). Le fournisseur utilisé est
        indiqué sur chaque quiz. Vos données ne sont ni vendues ni utilisées à des fins publicitaires.
      </p>
      <p>
        Une IA peut produire des erreurs : chaque quiz est un brouillon que vous devez relire et valider
        avant de pouvoir l’exporter.
      </p>

      <h2>Cookies et stockage local</h2>
      <p>
        EduQuizAI ne dépose aucun cookie publicitaire ni de mesure d’audience. Votre jeton de connexion est
        conservé dans le stockage local de votre navigateur pendant 2 heures au plus ; il est supprimé à la
        déconnexion.
      </p>

      <h2>Sécurité</h2>
      <p>
        Mots de passe hachés avec bcrypt (jamais stockés en clair), connexions authentifiées par jeton
        signé, contrôle systématique des droits d’accès : un enseignant ne peut jamais consulter les cours
        ou les quiz d’un autre compte.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de
        portabilité de vos données. Vous pouvez supprimer vous-même votre compte et toutes vos données depuis
        votre tableau de bord (« Supprimer mon compte ») ; l’export JSON de vos quiz validés permet d’en
        récupérer le contenu. Pour les autres demandes, écrivez à contact-rgpd@schoolup.example. Vous pouvez
        également adresser une réclamation à la CNIL (www.cnil.fr).
      </p>
    </main>
  )
}

export default PageConfidentialite
