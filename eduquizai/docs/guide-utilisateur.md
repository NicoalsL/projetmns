# Utiliser EduQuizAI : cours et quiz

Ouvrir http://localhost:5173 après le démarrage Docker décrit dans le README.

1. La page d'accueil présente le service. Choisir Créer un compte (ou Se connecter si le compte existe déjà), renseigner nom, email et mot de passe, cocher l'acceptation de la politique de confidentialité (lien « politique de confidentialité », également en pied de page), puis créer le compte. Le mot de passe contient au moins 8 caractères, au plus 72 octets UTF-8.
2. Dans Mes cours, choisir Nouveau cours. Le texte peut être importé depuis un fichier .txt ou .md, et mis en forme en Markdown (# titre, **gras**, - liste) avec le bouton Aperçu. Saisir un titre (200 caractères maximum) et un texte (50 000 caractères maximum), puis Enregistrer le cours. Le détail du cours confirme la création.
3. Revenir à Mes cours et cliquer sur le titre pour le consulter. Le texte est conservé après déconnexion et reconnexion.
4. Depuis le détail, choisir Supprimer le cours. Annuler conserve le cours ; Confirmer la suppression le retire définitivement et ramène à la liste.
5. Utiliser Se déconnecter, dans l'en-tête de chaque page, pour fermer la session. Une session expirée ramène à la connexion.

La liste contient uniquement les cours du compte connecté. Un changement de compte dans un autre onglet recharge la page protégée. Un cours introuvable peut être supprimé ou appartenir à un autre compte : il n'est pas accessible.

Une erreur réseau est affichée explicitement. Réessayer depuis la liste ou le détail relance la lecture. Une saisie non encore enregistrée reste seulement dans la page courante et disparaît si la page est quittée ou rechargée.

## Générer et valider un quiz

6. Depuis le détail d'un cours, régler le quiz : nombre de questions (3 à 10), niveau des élèves (facultatif), difficulté et types de questions (au moins un), puis Générer un quiz. Un cours de moins de 300 caractères ou de moins de 3 phrases ne permet pas de générer : l'IA inventerait des questions hors cours. La page du quiz s'ouvre ; le quiz est un brouillon.
7. Relire chaque question : la bonne réponse est indiquée en toutes lettres. Un encadré précise si le quiz vient d'une IA (qui peut se tromper) ou du mode simulation.
8. Pour corriger, choisir Modifier : énoncés, choix du QCM (bouton rond devant la bonne réponse), réponse vrai/faux, réponse attendue et explications sont modifiables ; une question peut être supprimée. Enregistrer les modifications repasse le quiz en brouillon.
9. Une fois le quiz relu, choisir « J'ai relu ce quiz : le valider ». La zone Exporter devient alors disponible : Fichier JSON, Tableur (CSV, ouvrable dans Excel ou LibreOffice) ou Imprimer ou enregistrer en PDF (dans la fenêtre d'impression, choisir « Enregistrer au format PDF » ; seul le quiz est imprimé).
10. Supprimer retire le quiz après confirmation. Supprimer un cours supprime aussi tous ses quiz.

Chaque enseignant peut lancer 10 générations par heure. En cas d'échec de l'IA, un message invite à réessayer ; le cours n'est pas modifié.

Sous la liste des quiz, « Historique des générations » indique la date, le résultat et la durée de chaque génération.

## Vérifier et améliorer un quiz

- Sous chaque question, **Extrait du cours** cite la phrase du cours qui justifie la réponse. Si l'encadré orange « Citation introuvable dans le cours » apparaît, l'IA a peut-être inventé l'information : vérifier cette question en priorité.
- **Régénérer cette question** remplace une question jugée mauvaise par une nouvelle, du même type, tirée du même cours. Le quiz repasse en brouillon. Chaque régénération compte dans les 10 générations par heure.
- **Tester le quiz** permet d'y répondre comme un élève : une question à la fois, correction immédiate, explication, puis score final. Pour une question ouverte, comparer sa réponse à la réponse attendue, éventuellement **Demander l'avis de l'IA**, puis indiquer si la réponse était juste. Rien n'est enregistré.

## Retrouver et modifier un cours

- Dans Mes cours, **Rechercher un cours** filtre la liste par titre (sans tenir compte des majuscules ni des accents) ; **Trier par** classe les cours par date ou par titre.
- Depuis le détail d'un cours, **Modifier le cours** ouvre le formulaire prérempli. Les quiz déjà générés ne changent pas : en générer un nouveau pour qu'il reflète le texte révisé.

## Supprimer son compte

Dans le tableau de bord, section Mon compte, choisir Supprimer mon compte, saisir son mot de passe puis Supprimer définitivement. Les cours, quiz et historique sont effacés et la session est fermée. Exporter auparavant les quiz à conserver.


