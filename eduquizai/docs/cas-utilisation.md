# Cas d'utilisation — EduQuizAI

Acteur unique pour le MVP : **Enseignant**.

## UC1 — Inscription

- **Déclencheur** : l'enseignant clique sur "Créer un compte"
- **Pré-condition** : aucune
- **Scénario nominal**
  1. L'enseignant saisit son nom, son email et un mot de passe
  2. Le système vérifie que l'email n'est pas déjà utilisé
  3. Le système hache le mot de passe et crée le compte
  4. Le système renvoie un jeton JWT et redirige vers le dashboard
- **Scénarios alternatifs**
  - A1. Email déjà utilisé → erreur affichée, retour à l'étape 1
  - A2. Mot de passe trop court (moins de 8 caractères) → erreur affichée

## UC2 — Connexion

- **Déclencheur** : l'enseignant saisit ses identifiants
- **Pré-condition** : posséder un compte
- **Scénario nominal**
  1. L'enseignant saisit email + mot de passe
  2. Le système vérifie les identifiants
  3. Le système renvoie un jeton JWT et redirige vers le dashboard
- **Scénario alternatif**
  - A1. Identifiants invalides → message d'erreur générique (pas de détail sur email/mot de passe, pour la sécurité)

## UC3 — Créer un cours

- **Déclencheur** : l'enseignant clique sur "Nouveau cours"
- **Pré-condition** : être authentifié
- **Scénario nominal**
  1. L'enseignant saisit un titre et colle/rédige le texte du cours
  2. Le système valide que le texte n'est pas vide et ne dépasse pas une taille maximale
  3. Le système enregistre le cours (PostgreSQL), associé à l'enseignant
  4. Le cours apparaît dans le dashboard
- **Scénario alternatif**
  - A1. Texte vide ou trop long → message d'erreur, le cours n'est pas créé

## UC4 — Générer un quiz

- **Déclencheur** : l'enseignant clique sur "Générer un quiz" depuis un cours
- **Pré-condition** : le cours existe et appartient à l'enseignant connecté
- **Scénario nominal**
  1. L'enseignant choisit le nombre de questions et les types voulus (QCM, Vrai/Faux)
  2. Le système envoie le texte du cours à l'API OpenAI avec les consignes de génération
  3. L'IA renvoie un jeu de questions structuré
  4. Le système valide la structure de la réponse reçue
  5. Le système enregistre le quiz (MongoDB), lié au cours
  6. Le quiz généré s'affiche à l'écran
- **Scénarios alternatifs**
  - A1. Erreur ou délai dépassé sur l'appel IA → message d'erreur, proposition de réessayer
  - A2. Réponse de l'IA mal formée → la génération est rejetée, nouvelle tentative automatique limitée à 1 fois

## UC5 — Éditer un quiz

- **Déclencheur** : l'enseignant clique sur "Modifier" sur une question
- **Pré-condition** : le quiz appartient à l'enseignant connecté
- **Scénario nominal**
  1. L'enseignant modifie le texte d'une question ou d'une réponse
  2. Le système valide les champs modifiés
  3. Le système met à jour le document du quiz (MongoDB)
- **Scénario alternatif**
  - A1. Champ obligatoire laissé vide → erreur, modification refusée

## UC6 — Supprimer un cours ou un quiz

- **Déclencheur** : l'enseignant clique sur l'icône de suppression
- **Pré-condition** : l'élément appartient à l'enseignant connecté
- **Scénario nominal**
  1. Le système demande confirmation
  2. Le système supprime l'élément (cours → PostgreSQL, ou quiz → MongoDB)
- **Scénario alternatif**
  - A1. Suppression d'un cours qui a des quiz liés → les quiz liés sont supprimés également (confirmation explicite demandée)

## UC7 — Exporter un quiz

- **Déclencheur** : l'enseignant clique sur "Exporter"
- **Pré-condition** : le quiz existe et appartient à l'enseignant connecté
- **Scénario nominal**
  1. Le système récupère le quiz (MongoDB)
  2. Le système génère un fichier JSON téléchargeable
- **Scénario alternatif**
  - A1. Quiz introuvable → erreur 404
