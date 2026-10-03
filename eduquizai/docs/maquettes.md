# Maquettes basse fidélité — EduQuizAI

Wireframes texte des 4 écrans essentiels du MVP (voir `FONCTIONNALITES.md` à la racine
pour la liste complète). Le détail de l'enchaînement entre ces écrans est dans
`diagrammes.md`.

## Écran 1 — Connexion / Inscription

```
+--------------------------------------------------+
|                   EduQuizAI                       |
|                                                    |
|   [ Connexion ]      [ Inscription ]  (onglets)   |
|                                                    |
|   Email          [_____________________________]  |
|   Mot de passe   [_____________________________]  |
|                                                    |
|                [   Se connecter   ]               |
+--------------------------------------------------+
```

## Écran 2 — Dashboard (liste des cours)

```
+--------------------------------------------------+
| EduQuizAI          Bonjour, [Nom]   [Déconnexion] |
+--------------------------------------------------+
|  [ + Nouveau cours ]                              |
|                                                    |
|  Mes cours :                                      |
|  ------------------------------------------------ |
|  | Titre du cours    | Quiz générés | Actions   | |
|  |--------------------|--------------|-----------| |
|  | Chapitre 3 : ...   | 2            | Voir  X   | |
|  | Introduction ...   | 0            | Voir  X   | |
|  ------------------------------------------------ |
+--------------------------------------------------+
```

## Écran 3 — Création de cours

```
+--------------------------------------------------+
| < Retour              Nouveau cours               |
+--------------------------------------------------+
|  Titre        [___________________________]       |
|                                                    |
|  Contenu du cours                                 |
|  +----------------------------------------------+ |
|  |                                                | |
|  |   (zone de texte libre)                       | |
|  |                                                | |
|  +----------------------------------------------+ |
|                                                    |
|              [ Enregistrer le cours ]             |
+--------------------------------------------------+
```

## Écran 4 — Résultat du quiz

```
+--------------------------------------------------+
| < Retour au cours          Quiz généré            |
+--------------------------------------------------+
|  Nombre de questions : 5        [ Régénérer ]     |
|                                                    |
|  1. [QCM] Quelle est la capitale de la France ?   |
|     ( ) Lyon   (x) Paris   ( ) Marseille          |
|     [ Modifier ]  [ Supprimer ]                   |
|                                                    |
|  2. [Vrai/Faux] La Terre est plate.               |
|     Réponse : Faux — Explication : ...            |
|     [ Modifier ]  [ Supprimer ]                   |
|                                                    |
|              [ Exporter en JSON ]                 |
+--------------------------------------------------+
```
