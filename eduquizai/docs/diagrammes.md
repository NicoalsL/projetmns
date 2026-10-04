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
    H[Accueil public] -->|Se connecter / Créer un compte| A[Connexion / Inscription]
    A -->|authentification réussie| B[Dashboard]
    B -->|Nouveau cours| C[Création de cours]
    C -->|Enregistrer| B
    B -->|Voir un cours| D[Détail du cours]
    D -->|Générer un quiz| E[Résultat du quiz]
    E -->|Modifier une question| E
    E -->|Exporter| E
    B -->|Déconnexion| A
```

## Diagramme de séquence — Générer un quiz (cas d'utilisation le plus significatif)

Il traverse toutes les couches de l'architecture et les deux bases de données, et
montre les trois protections clés : contrôle de propriété, validation de la réponse de
l'IA et brouillon soumis à validation humaine.

```mermaid
sequenceDiagram
    autonumber
    actor E as Enseignant
    participant F as Front React<br/>SectionQuizCours
    participant R as Express<br/>routes + middlewares
    participant C as quiz.controleur
    participant S as quiz.service
    participant DC as cours.depot<br/>(PostgreSQL)
    participant IA as ia/genererQuiz<br/>+ fournisseur
    participant M as Modèle IA<br/>(Ollama / OpenAI)
    participant DG as generationIa.depot<br/>(PostgreSQL)
    participant DQ as quiz.depot<br/>(MongoDB)

    E->>F: Choisit 5 questions, clique « Générer un quiz »
    F->>R: POST /api/cours/42/quiz {nombreQuestions: 5}<br/>Authorization: Bearer JWT
    R->>R: verifierJeton (signature HS256, expiration)
    R->>R: validerIdentifiantCours, limiteur (10/h/enseignant),<br/>validerGeneration (3 à 10)
    alt Jeton absent ou invalide
        R-->>F: 401
    else Limite atteinte
        R-->>F: 429
    end
    R->>C: generer(requete)
    C->>S: generer(42, idEnseignant du JWT, 5)
    S->>DC: trouverParId(42, idEnseignant)
    DC-->>S: cours (ou null)
    alt Cours absent ou d'un autre enseignant
        S-->>F: 404 « Cours introuvable »
    end
    S->>IA: genererQuiz(texte du cours, 5) — chronomètre démarré
    IA->>M: consignes système + <cours>texte</cours><br/>+ schéma JSON imposé
    M-->>IA: JSON {questions: [...]}
    IA->>IA: normaliserQuestions (types, longueurs,<br/>bonne réponse dans les choix)
    alt Échec IA (délai, indisponible, JSON non conforme)
        IA-->>S: erreur codée IA_*
        S->>DG: enregistrer(statut: echec, durée)
        S-->>F: 502 message générique
    else Succès
        IA-->>S: questions validées
        S->>DG: enregistrer(statut: succes, durée)
        DG-->>S: id_generation
        S->>DQ: creer({statut: brouillon, id_utilisateur, id_generation, questions})
        DQ-->>S: quiz avec id_quiz
        S-->>C: quiz + duree_ms
        C-->>F: 201 + Location: /api/quiz/:id
        F->>E: Ouvre la page du quiz (brouillon à relire)
    end
```
