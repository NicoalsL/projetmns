# Diagrammes — EduQuizAI

Diagrammes au format Mermaid (texte → image). Se rendent nativement sur GitHub/GitLab ou
via https://mermaid.live pour export en image à coller dans le dossier Word.

## Diagramme de cas d'utilisation

```mermaid
flowchart LR
    Enseignant((Enseignant))
    Enseignant --> UC1[Inscription]
    Enseignant --> UC2[Connexion]
    Enseignant --> UC3[Créer un cours]
    Enseignant --> UC4[Générer un quiz]
    Enseignant --> UC5[Éditer un quiz]
    Enseignant --> UC6[Supprimer cours / quiz]
    Enseignant --> UC7[Exporter un quiz]
    UC4 -.inclut.-> IA[[Appel API OpenAI]]
```

## Diagramme d'enchaînement des écrans

```mermaid
flowchart TD
    A[Connexion / Inscription] -->|authentification réussie| B[Dashboard]
    B -->|Nouveau cours| C[Création de cours]
    C -->|Enregistrer| B
    B -->|Voir un cours| D[Détail du cours]
    D -->|Générer un quiz| E[Résultat du quiz]
    E -->|Modifier une question| E
    E -->|Exporter| E
    B -->|Déconnexion| A
```
