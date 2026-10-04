# Validation de la CI — 4 octobre 2026

La capture GitHub Actions fournie par le candidat montre le workflow « Vérification du projet »,
exécution « add new maj #1 », sur la branche `main`, commit `9c324d1`.
Son statut est **Success**, sa durée totale est de **2 min 3 s** et un artefact est disponible.
Le résumé Vitest indique **6 fichiers et 23 tests réussis**.

Le dépôt local pointe sur ce même commit. Il était sans modification avant cette mise à jour documentaire.
Les contrôles locaux relancés le 4 octobre réussissent :

- Backend : 255 tests Jest, 13 suites.
- Frontend : 15 tests Node et 23 tests Vitest, soit 38 tests.
- Lint et build frontend : réussis.

La capture mentionne **1 warning et 1 notice**, sans afficher leur détail.
Leur cause n'est donc pas établie. Les journaux distants et l'artefact n'ont pas été consultés.
Le workflow contient un scan ZAP passif sur `/sante` avec avertissements non bloquants ;
son succès ne démontre pas un audit complet des routes authentifiées.

Cette preuve lève la réserve « CI jamais exécutée sur GitHub » des audits précédents.
Elle ne démontre ni un déploiement public, ni la conformité RGAA complète, ni une génération IA sous cinq secondes.
Les estimations antérieures de réalisation ne sont pas recalculées à partir de cette seule capture.

## Détail des annotations et correction (4 octobre, 8 h 50)

Les annotations, lues par l'API publique de GitHub (check run `111376596235`), ne sont pas
des erreurs du projet mais des avis sur l'infrastructure de la CI :

| Niveau | Message | Correction |
|---|---|---|
| Warning | Node.js 20 abandonné : `actions/checkout@v4`, `actions/setup-node@v4` et `actions/upload-artifact@v4` sont forcées de tourner sous Node 24 | Passage aux versions `@v7` (dernières versions officielles, prévues pour Node 24) ; paramètres utilisés (`node-version`, `cache`, `cache-dependency-path`, `name`, `path`) vérifiés dans leur `action.yml` |
| Notice | `ubuntu-latest` passera à Ubuntu 26 à partir du 19 octobre 2026 | `runs-on: ubuntu-24.04` : environnement fixé, la CI ne change pas de système sans décision explicite |

Le résultat de la CI après ce changement est consigné ci-dessous.

**Résultat** : exécution `37184101413` sur le commit `74b8243` — **Success** en 1 min 58 s,
runner `ubuntu-24.04`, **0 annotation** (plus d'avertissement Node 20 ni d'avis de migration).
https://github.com/NicoalsL/projetmns/actions/runs/37184101413
