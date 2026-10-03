# Livraison comptes et cours — 3 octobre 2026

## Périmètre livré

- Création, liste, détail et suppression des cours, de React à PostgreSQL.
- Propriétaire déterminé par le JWT ; consultation et suppression limitées au compte connecté. Un cours absent ou appartenant à un autre compte renvoie la même réponse 404.
- Validation des identifiants, types, champs vides et limites : titre 200 caractères, texte 50 000 caractères. Requêtes SQL paramétrées et texte rendu sans interprétation HTML.
- Confirmation avant suppression, annulation, erreurs visibles et retour à la liste.
- Surveillance de session reprogrammée lors du changement de jeton ; les données affichées sont réinitialisées lors d'un changement de compte entre onglets.
- Démarrage Docker corrigé : le backend reçoit déjà son environnement via Compose et ne tente plus de surveiller un fichier .env absent du conteneur. Polling Vite activé pour les fichiers montés sous Windows.
- Initialisation SQL transactionnelle avec verrou consultatif ; image backend limitée aux dépendances de production.
- README, guide utilisateur, plan de tests et pipeline CI actualisés.

## Vérifications réellement exécutées

| Vérification | Résultat local |
|---|---|
| Backend Jest | 72 tests, 4 suites : réussite |
| Sessions front | 5 tests : réussite, dont exécution sous Node 22 dans Docker |
| API avec PostgreSQL réel | 19 assertions : réussite |
| Qualité front | Lint sans avertissement et build Vite réussis |
| Construction Docker | Images front/backend construites, initialisation SQL réussie, backend et PostgreSQL sains |
| Navigateur Edge sur la vraie application | Inscription, création, détail, reconnexion, annulation puis suppression, changement de compte multi-onglets et accès interdit : réussite |
| Affichage mobile et XSS | Largeur 320 px sans débordement ; balises affichées comme texte sans exécution |
| Dépendances backend de production | npm audit --omit=dev : aucune vulnérabilité signalée lors de cette vérification |

Les tests réels utilisent des comptes synthétiques uniques, supprimés en fin d'exécution. Aucun volume ni compte préexistant n'a été supprimé. Les commandes reproductibles et le jeu d'essai sont dans ../eduquizai/docs/plan-tests.md.

## Limites explicites

Cette livraison ne réalise pas la génération IA, les quiz, leur stockage MongoDB, l'édition des cours, la pagination ni la mise en production. MongoDB démarre mais reste inutilisé par les fonctionnalités livrées. Le pipeline GitHub Actions est écrit ; aucune exécution distante n'est revendiquée.

L'installation complète du backend signalait 28 alertes hautes dans les dépendances de développement, notamment l'arbre Jest ; elles restent à traiter séparément. Elles sont exclues de l'image backend, qui installe uniquement les dépendances de production. Les tests réussis ne valent pas audit de sécurité exhaustif.

Les documents originaux restent dans le dossier local instructction ignoré par Git ; leur présence dans le premier commit historique n'est pas effacée par cette exclusion. Aucun push ni publication n'est effectué.

Les rapports d'audit précédents décrivent leur état au moment de rédaction. Leurs pourcentages ne constituent pas une nouvelle mesure après cette livraison ; ce rapport consigne les résultats désormais vérifiés.