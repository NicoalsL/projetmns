# Vérification de l'authentification et des cours

Les tests accompagnent le parcours enseignant de cette étape. Ils ne couvrent pas les futurs quiz, la conformité RGAA complète ni un déploiement public.

| Niveau | Scénarios | Exécution | Attendu |
|---|---|---|---|
| Backend avec pool simulé | Validation, JWT, erreurs, SQL paramétré et propriétaire | back : npm test | 72 tests réussis |
| Session front, horloge simulée | Renouvellement multi-onglets plus long/court, expiration, déconnexion, nettoyage | front : npm test | 5 tests réussis |
| API et PostgreSQL réels | Deux comptes, création, reconnexion, liste isolée, accès et suppression interdits, suppression propriétaire | docker compose exec -T back npm run test:reel | 19 vérifications réussies ; données synthétiques nettoyées |
| Build et qualité front | JSX, imports, règles de lint | front : npm run lint puis npm run build | Réussite |
| Navigateur, base réelle | Inscription, création, détail, annulation, reconnexion, changement de compte, confirmation de suppression | Parcours manuel décrit ci-dessous | Résultats visibles cohérents et aucun accès croisé |

## Jeu d'essai représentatif

Le script scripts/verifier-cours-reel.js génère deux adresses uniques sous example.test et un mot de passe aléatoire. Il ne réutilise aucun compte réel. Le cours du compte A contient un titre avec caractères SQL/HTML et un texte de plus de 16 ko.

- Création avec un faux id_utilisateur dans le corps : 201, auteur réel A vérifié directement en base.
- Reconnexion A : 200, texte du cours identique.
- Liste B : vide ; lecture/suppression du cours A avec B : 404.
- Lecture A après tentative B : toujours 200.
- Identifiant injecté, titre blanc ou texte trop long : 400.
- Suppression A : 204, puis lecture 404 et liste vide.

Obtenu localement : les 19 assertions passent sur PostgreSQL 16 dans Docker. Les tests Jest vérifient séparément les requêtes trop volumineuses (413), l'absence de JWT (401), les types invalides et les limites des champs.

## Parcours navigateur de recette

Avec deux comptes A/B, créer un cours contenant des balises script en texte ; vérifier que les balises s'affichent sans exécution. À 320 px de largeur, vérifier l'absence de débordement avec un titre long. Annuler une suppression, se reconnecter et retrouver le cours. Changer le compte dans un autre onglet : les données A ne doivent plus apparaître sous B. Une URL directe du cours A sous B doit afficher une erreur et aucun bouton de suppression. Revenir à A, confirmer la suppression et recharger la liste vide.

Ce parcours a été exécuté automatiquement localement dans Edge sur la vraie stack, puis les deux comptes synthétiques ont été nettoyés. Le script d'audit local utilise le runtime navigateur de l'environnement de travail ; la CI utilise le parcours API reproductible et les tests de session, sans prétendre exécuter cette recette navigateur.

## Précautions de test

Ne jamais supprimer les volumes pour rejouer un test. Le script réel nettoie seulement les adresses aléatoires qu'il vient de générer. La CI utilise une base PostgreSQL éphémère distincte. Les résultats ne constituent pas une mesure de couverture exhaustive du projet.
