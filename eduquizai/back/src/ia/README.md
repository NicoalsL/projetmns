# `ia/` — le module d'intelligence artificielle

Patron **Stratégie** : `genererQuiz.js` est la **seule porte d'entrée** ; il délègue
à un fournisseur interchangeable, choisi par la variable `IA_FOURNISSEUR`.

| Fichier | Rôle |
|---|---|
| `genererQuiz.js` | Écrit les consignes, appelle le fournisseur, contrôle et répare la réponse, vérifie les citations. |
| `schemaReponse.js` | « Moule » JSON imposé à l'IA pour un quiz. |
| `schemaCorrection.js` | « Moule » JSON pour corriger une réponse rédigée (`juste` / `partielle` / `fausse`). |
| `fournisseurs/fournisseurIa.js` | **Classe mère abstraite** de tous les fournisseurs (code commun, méthodes à redéfinir). |
| `fournisseurs/fournisseurDistant.js` | **Classe intermédiaire abstraite** des fournisseurs joints par le réseau : appel HTTP, délai, pannes. |
| `fournisseurs/openai.js` | API OpenAI dans le cloud (payant, `gpt-4o-mini` par défaut, 30 s max). |
| `fournisseurs/ollama.js` | Modèle **local** (`qwen3:4b`) : gratuit, les cours ne quittent pas la machine. |
| `fournisseurs/simulation.js` | Sans IA : questions fabriquées à partir des phrases du cours (tests, démo). |

Chaque fournisseur descend de `FournisseurIa` et a donc les mêmes méthodes :
`nom`, `modele()`, `genererQuestions(consignes)`, `evaluerReponse(consignes)`.

## La POO dans ce dossier

```
                     FournisseurIa  (abstraite)
          genererQuestions() et evaluerReponse() communes
                 hérite de                       hérite de
        FournisseurDistant (abstraite)       FournisseurSimulation
        envoyer() : HTTP, délai, pannes      redéfinit genererQuestions()
          hérite de        hérite de         et evaluerReponse()
 FournisseurOpenai     FournisseurOllama
 appeler()             appeler()
 #entetes() (privée)   #urlBase() (privée) + prechauffer()
```

- **Héritage** : `class FournisseurOllama extends FournisseurIa` reçoit le code commun.
- **Polymorphisme** : `genererQuiz.js` appelle `fournisseur.genererQuestions()` ; chaque classe répond à sa façon.
- **Encapsulation** : `#entetes()` (clé OpenAI) et `#urlBase()` sont privées, invisibles de l'extérieur.
- **Classe abstraite** : `new FournisseurIa()` est refusé ; une classe fille qui oublie `modele()` échoue clairement.
- Patrons : **Stratégie** (fournisseurs interchangeables) et **Patron de méthode** (seule `appeler()` change).

## Parcours d'une génération

1. Répartir les types demandés (ex. 5 questions → 2 QCM, 2 vrai/faux, 1 ouverte).
2. Écrire les consignes ; le cours est placé **entre balises `<cours>`**.
3. Appeler l'IA avec le schéma JSON imposé.
4. Réparer les vrai/faux mal écrits (`"Faux"` → `false`), écarter les questions invalides.
5. Si rien d'exploitable : **un seul nouvel essai** (2 appels maximum).
6. Vérifier que chaque citation (`source`) existe vraiment dans le cours → `source_trouvee`.

## Choix de sécurité

- **Injection de prompt** (un cours qui dit « ignore tes consignes ») : 3 couches.
  1. Cours délimité comme une **donnée**, balises `<cours>` retirées du texte.
  2. Réponse **revalidée strictement** (`utilitaires/questions.js`) : OWASP LLM05.
  3. **Relecture et validation humaine** obligatoires avant tout export.
- **Paramètres en listes fermées** : aucun texte libre de l'utilisateur dans les consignes.
- **Clé OpenAI** uniquement côté serveur, jamais envoyée au navigateur ni dans les logs.
- **Erreur OpenAI** non recopiée (pourrait contenir quota, organisation).
- **Ollama** : HTTPS obligatoire hors de la machine locale (vérifié au démarrage).
- **Hallucinations** : citation non retrouvée → l'interface demande une vérification attentive.
- **Coût maîtrisé** : délai maximal, 2 appels maximum, quotas par enseignant.
