# `controllers/` — l'interprète entre HTTP et le métier

Un contrôleur lit la requête **déjà vérifiée**, appelle un service, et choisit le
code HTTP de la réponse. Il ne contient **aucune règle métier**.

| Fichier | Fonctions |
|---|---|
| `auth.controleur.js` | `inscription` (201 / 409), `connexion` (200 / 401) |
| `compte.controleur.js` | `supprimer` (204), `deconnecter` (204), `prolonger` (nouveau jeton) |
| `cours.controleur.js` | `creer` (201 + en-tête `Location`), `lister`, `consulter`, `modifier`, `supprimer` (204) |
| `quiz.controleur.js` | `generer`, `consulter`, `modifier`, `valider`, `exporter` (JSON/CSV/PDF), `regenererQuestion`, `corrigerReponse`… |

Modèle commun :

```js
try {
  const resultat = await service.action(requete.idCours, requete.utilisateur.id_utilisateur);
  reponse.json(resultat);
} catch (erreur) {
  suite(erreur); // confiée à gestionErreurs.js
}
```

## Choix de sécurité

- **L'enseignant vient toujours de `requete.utilisateur`** (posé par le middleware
  à partir du jeton), jamais du corps de la requête.
- **Réponses filtrées** : `utilisateur.versProfilPublic()` ne renvoie que `id`, `nom`, `email`
  (jamais le hash du mot de passe ni la version de session).
- **Connexion** : même message (« Email ou mot de passe incorrect ») que l'email
  existe ou non → impossible de savoir qui a un compte.
- **Export** : `Content-Disposition: attachment` → le navigateur télécharge le fichier
  au lieu de l'afficher.
