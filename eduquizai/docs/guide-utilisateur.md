# Utiliser les cours dans EduQuizAI

Ouvrir http://localhost:5173 après le démarrage Docker décrit dans le README.

1. Choisir Inscription, renseigner nom, email et mot de passe, puis créer le compte. Le mot de passe contient au moins 8 caractères, au plus 72 octets UTF-8.
2. Dans Mes cours, choisir Nouveau cours. Saisir un titre (200 caractères maximum) et un texte (50 000 caractères maximum), puis Enregistrer le cours. Le détail du cours confirme la création.
3. Revenir à Mes cours et cliquer sur le titre pour le consulter. Le texte est conservé après déconnexion et reconnexion.
4. Depuis le détail, choisir Supprimer le cours. Annuler conserve le cours ; Confirmer la suppression le retire définitivement et ramène à la liste.
5. Utiliser Déconnexion depuis le tableau de bord pour fermer la session. Une session expirée ramène à la connexion.

La liste contient uniquement les cours du compte connecté. Un changement de compte dans un autre onglet recharge la page protégée. Un cours introuvable peut être supprimé ou appartenir à un autre compte : il n'est pas accessible.

Une erreur réseau est affichée explicitement. Réessayer depuis la liste ou le détail relance la lecture. Une saisie non encore enregistrée reste seulement dans la page courante et disparaît si la page est quittée ou rechargée.

La génération, l'édition et l'export des quiz, ainsi que l'édition des cours, ne sont pas disponibles dans cette étape.
