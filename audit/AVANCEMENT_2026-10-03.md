# Avancement recalculé d’EduQuizAI

**Estimation actuelle : 35 %, contre 26.25 % au premier audit, soit +8.75 points.** En chiffres arrondis : 26 % → 35 %, environ 9 points gagnés. Fourchette de jugement : 30 à 40 %.

Ce calcul reprend exactement les poids du premier audit, appliqués au MVP interne et aux livrables du projet. Les scores de chaque domaine restent des estimations argumentées, pas des mesures objectives de travail consommé. La fourchette n’est pas un intervalle statistique. Ce résultat ne constitue pas une certification de conformité au CDC complet ni une prédiction de résultat à l’examen.

| Domaine | Poids | Avant | Maintenant | Contribution actuelle |
|---|---:|---:|---:|---:|
| Analyse, architecture et conception des données | 15 % | 75 % | 80 % | 12 points |
| Authentification et protections associées | 10 % | 70 % | 80 % | 8 points |
| Gestion des cours | 15 % | 10 % | 10 % | 1.5 points |
| IA, quiz, MongoDB et journal des générations | 20 % | 0 % | 0 % | 0 points |
| Interfaces et accessibilité | 10 % | 35 % | 45 % | 4.5 points |
| Tests et preuves qualité | 10 % | 0 % | 45 % | 4.5 points |
| Environnement, Git et déploiement | 10 % | 25 % | 40 % | 4 points |
| Dossiers finaux, guide utilisateur et soutenance | 10 % | 5 % | 5 % | 0.5 points |
| **Total** | **100 %** | | | **35 points** |

## Justification des scores

- **Analyse, architecture et conception des données — 80 % :** Conception et schéma SQL présents ; cardinalités et responsabilités SQL/Mongo clarifiées. Séquence et validation complète des modèles manquantes.
- **Authentification et protections associées — 80 % :** Validation, secret, JWT, erreurs et limitation des tentatives renforcés ; tests HTTP réussis. Validation réelle avec PostgreSQL encore absente.
- **Gestion des cours — 10 % :** Table et formulaire présents ; routes, service et dépôt non implémentés. Aucun enregistrement possible.
- **IA, quiz, MongoDB et journal des générations — 0 % :** Les fichiers métier restent des squelettes ; ni génération ni persistance de quiz opérationnelles.
- **Interfaces et accessibilité — 45 % :** Labels, états d’erreur, double soumission et affichage améliorés ; régression du minuteur multi-onglets et formulaire de cours prématurément actif. Écran quiz absent.
- **Tests et preuves qualité — 45 % :** 3 suites et 41 tests réussis ; build, lint et contrôles navigateur effectués. Pas de tests avec vraie base, ni du métier IA/quiz ; pas de plan de tests complet.
- **Environnement, Git et déploiement — 40 % :** Docker renforcé, script SQL et configuration, README et workflow CI présents. Images et stack non validées en exécution, CI distante non exécutée, sources toujours non suivies.
- **Dossiers finaux, guide utilisateur et soutenance — 5 % :** Aucun nouveau dossier final rédigé, guide utilisateur complet ou diaporama identifié ; les rapports techniques d’audit ne les remplacent pas.

## Ce que signifie la progression

La progression vient surtout de la fiabilité, des contrôles automatisés et de la préparation de l’environnement. Le sous-ensemble fonctionnel auth + cours + quiz/IA + interfaces atteint 25.5 %, soit environ 25 %, contre environ 22 % auparavant. Il est calculé avec les mêmes poids renormalisés sur ces seuls domaines. La différence avec les 35 % globaux provient de la conception et des travaux transverses déjà réalisés.

Le parcours créer un cours → générer un quiz → modifier → valider/exporter n’est toujours pas disponible. Les quelque 65 % restants sont des points de réalisation estimés, pas 65 % de temps de développement. Le code ne doit pas être déclaré prêt à livrer.

## Preuves et limites

Inventaire et routes relus pour ce recalcul. Dernière exécution lors de la revue immédiatement précédente : 41 tests réussis, build et lint réussis ; configuration Compose validée. Le code ciblé est inchangé depuis cette revue, donc les contrôles n’ont pas été relancés inutilement. Les tests HTTP simulent PostgreSQL et les dépôts. Le moteur Docker était arrêté au dernier contrôle, la CI GitHub n’a pas été exécutée à distance et les sources demeurent non suivies par Git. Aucun nouveau livrable final CDA identifié dans le périmètre inspecté.

Les trois points de la revue restent ouverts : minuteur de session non reprogrammé après renouvellement multi-onglets, formulaire de cours actif sans API, documentation et test navigateur désynchronisés. Leur traitement n’est pas considéré comme terminé dans ce recalcul.

## Priorités

1. Corriger les deux problèmes d’interface et aligner les documents/tests.
2. Valider le démarrage réel avec PostgreSQL et finaliser le versionnement.
3. Implémenter les cours avec contrôle de propriété.
4. Implémenter la génération IA et le cycle de vie des quiz.
5. Étendre les tests métier et rédiger les dossiers en parallèle.

La ROADMAP historique n’est pas utilisée comme compteur de cases : certaines cases sont périmées ou regroupent plusieurs réalisations. Le détail de ce calcul est également disponible dans AVANCEMENT_2026-10-03.json.
