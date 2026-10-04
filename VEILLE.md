# VEILLE — EduQuizAI

Journal de veille tenu à jour tout au long du projet, comme demandé par le CDC
("Journal de veille : IA dans l'éducation, RGPD, accessibilité") et par la compétence
transversale du REAC "Apprendre en continu". Une entrée courte à chaque étape franchie
de la `ROADMAP.md`, pas un seul paragraphe rédigé à la fin.

Format par entrée : date, thème, source, ce que ça change pour le projet.

## IA dans l'éducation

- [Date] — [source] — [impact sur EduQuizAI]

## RGPD / protection des données

- [Date] — [source] — [impact sur EduQuizAI]

## Accessibilité (RGAA)

- [Date] — [source] — [impact sur EduQuizAI]

## Sécurité (vulnérabilités, ANSSI, OWASP)

- [Date] — [source] — [vulnérabilité identifiée / corrigée le cas échéant]

## Démarche(s) de résolution de problème rencontrée(s)

- [Date] — Contexte du bug/incident — Diagnostic — Correction — Vérification
## 3 octobre 2026 — Cohérence des données et validation concurrente

Source : audit local des services cours/quiz et tests reproductibles décrits dans `audit/AUDIT_COMPLET_SITE_2026-10-03.md`. Le journal de veille détaillé des étapes précédentes se trouve dans `eduquizai/VEILLE.md`.

Une suppression répartie entre PostgreSQL et MongoDB peut laisser des quiz orphelins en cas de panne ou de génération simultanée. Une validation sans numéro de version peut approuver un contenu modifié depuis un autre onglet. Les défauts sont reproduits ; ils ne sont pas encore corrigés. Pistes : nettoyage durable, coordination des écritures et contrôle de révision atomique.

Le contrôle npm signale également 28 entrées hautes dans les dépendances de développement du backend, contre aucune alerte de production et aucune alerte frontend lors de cet audit. Prévoir une mise à jour contrôlée de l’outillage et les tests de non-régression.
