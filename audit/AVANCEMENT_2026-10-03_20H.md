# Avancement d'EduQuizAI — 3 octobre 2026, 20 h

**Environ 80 % global (80,4 points), 90 % sur la partie fonctionnelle.** Fourchette de
jugement : 77 à 82 %. Même grille de poids que les rapports précédents ; les scores sont des
estimations argumentées, pas une mesure ni une prédiction de la note.

| Domaine | Poids | Matin | 19 h (autre audit) | 20 h | Points |
|---|---:|---:|---:|---:|---:|
| Analyse, architecture, conception des données | 15 % | 80 % | 90 % | 90 % | 13,5 |
| Authentification et protections | 10 % | 80 % | 90 % | 90 % | 9 |
| Gestion des cours | 15 % | 10 % | 90 % | 95 % | 14,25 |
| IA, quiz, MongoDB, journal | 20 % | 0 % | 80 % | 88 % | 17,6 |
| Interfaces et accessibilité | 10 % | 45 % | 85 % | 85 % | 8,5 |
| Tests et preuves qualité | 10 % | 45 % | 85 % | 90 % | 9 |
| Environnement, Git, déploiement | 10 % | 40 % | 65 % | 65 % | 6,5 |
| Dossiers finaux, guide, soutenance | 10 % | 5 % | 20 % | 20 % | 2 |
| **Total** | **100 %** | **35** | **77,5** | | **80,35** |

Partie fonctionnelle (authentification + cours + IA/quiz + interfaces) : 49,35 / 55 = **90 %**.

## Corrections de 20 h

| Constat | Correction | Preuve |
|---|---|---|
| Génération en erreur 500 sur vraie base (`$1` de type ambigu) | `$1::varchar` dans `generationIa.depot.js` | 27/27 cohérence, 24/24 parcours quiz réel, test de non-régression |
| Suppression de compte : quiz orphelins anciens non effacés | `supprimerParUtilisateur` rappelé après la suppression SQL, panne Mongo tolérée | 2 tests (nominal + panne) |
| Environnement de développement sur l'ancien code | Image reconstruite, `db:init`, API redémarrée | `/pret` OK, code corrigé chargé |
| Chiffres des tests périmés dans la documentation | `plan-tests.md`, ROADMAP, FONCTIONNALITES, VEILLE mis à jour | — |
| Caractère cyrillique invisible dans un nom de variable de test | Remplacé ; contrôle sur tout le code | Aucun caractère cyrillique restant |

## Vérifications exécutées à 20 h

| Vérification | Résultat |
|---|---|
| Tests back (Jest 30) | 238 / 238 |
| Tests front (Node + Vitest) | 15 + 18 |
| Lint, build, lignes ≤ 120 caractères | Réussis |
| `npm audit` back et front | 0 vulnérabilité |
| `test:reel` / `test:reel:quiz` (API, PostgreSQL, MongoDB, Ollama) | 19 / 24 réussies (génération 32,2 s pour 6 questions) |
| `verifier-coherence-reelle.js` (bases temporaires supprimées après) | 27 / 27 |
| Navigateur : axe-core, 9 pages × 2 largeurs | 0 défaut, 0 débordement, 0 erreur console |

## Reste à faire

| Priorité | Tâche | Type |
|---|---|---|
| 🔴 | Commiter le travail (≈ 110 fichiers non versionnés) puis pousser, avec accord | Git |
| 🔴 | Faire tourner la CI sur GitHub et en garder une capture | DevOps |
| 🔴 | Rédiger le dossier projet (40-60 pages) à partir des fichiers Markdown | Examen |
| 🔴 | Rédiger le dossier professionnel | Examen |
| 🔴 | Préparer le diaporama et répéter la démo | Examen |
| 🟠 | Latence : 17 à 32 s avec Ollama, cible < 5 s (mesure OpenAI ou écart argumenté) | CDC |
| 🟠 | Démo accessible en ligne (configuration prête, non publiée) | CDC |
| 🟠 | Audit RGAA complet (106 critères) et test au lecteur d'écran | CDC |
| 🟡 | Erreur rattachée au champ dans l'éditeur de quiz ; révocation des JWT | Qualité |
| 🟡 | Outil de suivi de tâches, comptes rendus | Gestion de projet |
