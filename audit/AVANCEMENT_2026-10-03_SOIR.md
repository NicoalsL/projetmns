# Avancement d'EduQuizAI — audit du 3 octobre 2026 (soir)

**Estimation : environ 77 %, contre 35 % ce matin** (fourchette de jugement : 72 à 80 %).
Le **code** est presque terminé (≈ 88 % sur la partie fonctionnelle). Ce qui retient le
total sous 80 %, ce sont les **livrables d'examen** : le dossier projet et le dossier
professionnel sont encore des trames vides, il n'y a ni diaporama ni déploiement, et
**tout le travail depuis le 2ᵉ commit n'est pas versionné**.

Même méthode et mêmes poids que `AVANCEMENT_2026-10-03.md`, pour que les deux chiffres
soient comparables. Les scores par domaine restent des estimations argumentées, pas une
mesure ; ce n'est pas une prédiction du résultat à l'examen.

| Domaine | Poids | Matin | Soir | Contribution |
|---|---:|---:|---:|---:|
| Analyse, architecture et conception des données | 15 % | 80 % | 90 % | 13,5 |
| Authentification et protections associées | 10 % | 80 % | 95 % | 9,5 |
| Gestion des cours | 15 % | 10 % | 90 % | 13,5 |
| IA, quiz, MongoDB et journal des générations | 20 % | 0 % | 85 % | 17 |
| Interfaces et accessibilité | 10 % | 45 % | 85 % | 8,5 |
| Tests et preuves qualité | 10 % | 45 % | 80 % | 8 |
| Environnement, Git et déploiement | 10 % | 40 % | 45 % | 4,5 |
| Dossiers finaux, guide utilisateur et soutenance | 10 % | 5 % | 20 % | 2 |
| **Total** | **100 %** | **35** | | **76,5** |

Sous-ensemble fonctionnel (auth + cours + IA/quiz + interfaces, poids renormalisés) :
48,5 / 55 = **88 %**.

---

## 1. Ce qui est terminé (vérifié)

Vérifications du jour : 180 tests Jest back et 5 tests front réussis, lint et build
réussis, audit axe-core à 0 défaut sur 9 écrans × 2 largeurs, parcours réels sur la stack
Docker (inscription, cours, génération Ollama, validation, export, suppression du compte).

### Exigences du cahier des charges

| Exigence du CDC | État | Où |
|---|---|---|
| Inscription / connexion sécurisée (JWT) | ✅ | `auth.service.js`, `authentification.js` |
| Rédaction de cours / import texte | ✅ (.txt, .md, Markdown avec aperçu) | `PageCreationCours.jsx` |
| Historique des cours et quiz générés | ✅ (liste des cours, quiz par cours, journal des générations) | `PageDashboard.jsx`, `SectionQuizCours.jsx` |
| Export PDF **ou** JSON | ✅ JSON (après validation humaine) | `quiz.service.js` → `exporter` |
| Génération automatique (OpenAI ou LLM local) | ✅ Ollama vérifié en réel, OpenAI testé en simulé | `ia/genererQuiz.js`, `ia/fournisseurs/` |
| QCM avec distracteurs, questions ouvertes, vrai/faux avec explication | ✅ | `utilitaires/questions.js` |
| BDD utilisateurs, leçons, quiz | ✅ PostgreSQL + MongoDB | `schema.sql`, `quiz.depot.js` |
| API sécurisée front / back / IA | ✅ | routes + middlewares |
| Éditeur de texte Markdown | ✅ | `TexteCours.jsx` |
| Interface claire et accessible | ✅ partiel RGAA (voir §2) | `docs/accessibilite.md` |
| Sécurité : JWT, API, RGPD | ✅ | consentement daté, effacement, purge 6 mois |
| Éthique : validation manuelle | ✅ brouillon → validé, export bloqué avant | `quiz.service.js` |
| Code source commenté | ✅ (en français) | tout le dépôt |
| Jeu de tests automatisés | ✅ | `back/tests/`, `front/tests/`, `scripts/verifier-*.js` |
| Journal de veille (IA, RGPD, accessibilité) | ✅ 21 entrées datées + 3 démarches de résolution | `eduquizai/VEILLE.md` |
| Documentation utilisateur | ✅ (cours, quiz, compte) | `docs/guide-utilisateur.md` |

### Au-delà du minimum

Page d'accueil, charte graphique appliquée avec adaptation lisibilité, fournisseur IA
interchangeable (Ollama / OpenAI / simulation), paramètres de génération (nombre, types,
niveau, difficulté), contenu minimal exigé avant génération, limite de 10 générations par
heure, suppression de compte, sauvegarde / restauration des deux bases, jeu d'essai,
documentation d'accessibilité.

---

## 2. Ce qui reste, par priorité

### P1 — Indispensable pour l'examen

1. **Versionner le travail.** Seuls 2 commits existent (dont « Implemente les cours… »).
   **55 fichiers modifiés et 29 non suivis** ne sont dans aucun commit : tout l'IA, les
   quiz, la charte, l'accessibilité. Un incident disque ferait tout perdre. À commiter (par
   étapes logiques) puis pousser, avec l'accord du candidat.
2. **Exécuter la CI sur GitHub.** Le fichier `.github/workflows/ci.yml` existe mais n'a
   jamais tourné à distance. Il faut une capture d'un pipeline vert pour le dossier
   (compétence DevOps).
3. **Dossier projet (40 à 60 pages).** La trame Word est **vide** (539 mots, uniquement
   les titres). Bonne nouvelle : la matière existe déjà en Markdown (`ARCHITECTURE.md`,
   `docs/*.md`, `VEILLE.md`, `plan-tests.md`, `charte-graphique.md`, `accessibilite.md`)
   et doit surtout être assemblée, illustrée de captures et d'extraits de code.
4. **Dossier professionnel.** Le modèle est **vide** (champs « Cliquez ici pour taper du
   texte »). 1 à 3 exemples de pratique par activité-type, tirés du projet.
5. **Diaporama et démo.** Rien n'existe. Le CDC demande une présentation orale avec démo
   live ou enregistrée.
6. **Déploiement.** La stack Docker est une configuration de **développement**
   (`node --watch`, serveur Vite). Manquent : une configuration proche de la production
   (build du front servi en statique, serveur Node sans `--watch`, secrets propres,
   authentification MongoDB), une **procédure de déploiement** rédigée et, selon le CDC,
   une **démo déployée**.

### P2 — Exigences du CDC partiellement remplies

7. **Performance < 5 s** : non atteinte avec l'IA locale (**19,6 s** mesurées pour
   3 questions avec qwen3:8b). À mesurer avec une vraie clé OpenAI ou un modèle plus
   léger, sinon à présenter comme un écart assumé (choix RGPD/gratuité contre vitesse).
8. **Tests de sécurité outillés** : le CDC cite Postman et OWASP ZAP ; les tests SQL/XSS
   sont faits en scripts et en Jest, mais aucun scan ZAP ni collection Postman n'existe.
9. **Conformité RGAA 4.1** : tests automatiques et clavier faits, mais pas d'audit des
   106 critères ni de test au lecteur d'écran (détail dans `docs/accessibilite.md`, §3-4).
10. **Fiche de test de fonctionnalité représentative** : le jeu d'essai existe dans
    `plan-tests.md` ; il reste à le mettre au format « fiche » (entrée → attendu → obtenu
    → écart) pour le dossier.
11. **Outil de suivi de tâches** (GitHub Projects ou Trello) : non créé ; utile pour la
    compétence « gestion de projet ».

### P3 — Bonus ou finitions

12. Export PDF / CSV des quiz (le CDC les cite dans ses objectifs ; JSON suffit pour
    « export PDF ou JSON »).
13. Modification d'un cours existant (création, consultation et suppression seulement).
14. Points mineurs de code : fuite de connexion MongoDB si la création d'index échoue,
    fermeture de MongoDB à l'arrêt en erreur, balise `</cours>` non neutralisée dans le
    prompt, remplacement de mot imprécis dans le fournisseur de simulation.
15. Quelques commentaires en anglais (suggéré par la ROADMAP pour la compétence
    « communiquer en anglais ») : il n'y en a aucun.

---

## 3. Couverture des compétences du REAC

| Compétence | Support dans le projet | État |
|---|---|---|
| Installer et configurer son environnement | Docker, `.env`, scripts d'initialisation | ✅ |
| Développer des interfaces utilisateur | 7 pages React (dont relecture / édition de quiz), charte, accessibilité | ✅ |
| Développer des composants métier | services cours / quiz / compte, module IA | ✅ |
| Contribuer à la gestion d'un projet | ROADMAP, VEILLE ; **pas d'outil de suivi, pas de commits réguliers** | ⚠️ |
| Analyser les besoins et maquetter | cas d'utilisation, maquettes, charte | ✅ |
| Définir l'architecture logicielle | `ARCHITECTURE.md`, couches, patron dépôt | ✅ |
| Concevoir une base relationnelle | MCD / MLD, `schema.sql`, jeu d'essai | ✅ |
| Accès aux données SQL et NoSQL | dépôts PostgreSQL et MongoDB | ✅ |
| Préparer et exécuter les plans de tests | `plan-tests.md`, 185 tests, scripts réels | ✅ (ZAP/Postman manquants) |
| Préparer et documenter le déploiement | README ; **pas de procédure ni de config de production** | ❌ |
| Mise en production DevOps | fichier CI ; **jamais exécuté, pas de démo déployée** | ⚠️ |

---

## 4. Incohérences relevées dans les documents de suivi

- En-tête de `ROADMAP.md` : « IA/quiz et dossiers finaux restent à développer » — faux
  pour l'IA et les quiz, qui sont terminés.
- `ROADMAP.md` et `FONCTIONNALITES.md` laissent décochés « Créer `VEILLE.md` », « Journal
  de veille continu » et « exemple de démarche de résolution de problème » : ils sont
  faits (21 entrées, 3 démarches détaillées dans `VEILLE.md`).
- `ROADMAP.md`, étape 5 : « vraie clé OpenAI encore à tester » reste exact ; préciser que
  l'IA locale Ollama est, elle, vérifiée en réel.

---

## 5. Ordre de travail proposé

1. Commits par étapes + push (avec accord), puis vérifier que la CI passe sur GitHub.
2. Configuration de production + procédure de déploiement (+ démo en ligne si possible).
3. Mesure de performance avec OpenAI, fiche de test, scan OWASP ZAP.
4. Assemblage du dossier projet à partir des fichiers Markdown, puis dossier
   professionnel.
5. Diaporama et répétition de la démo.
