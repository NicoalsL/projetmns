# `services/` — les règles métier

Le « chef de cuisine » : c'est ici que sont décidées les règles du projet.
Les règles propres à un objet sont dans sa classe (`modeles/`) : le service les lui demande
(`cours.estAssezLongPourUnQuiz()`, `quiz.estExportable()`…). Les refus prévus lèvent une
classe fille d'`ErreurMetier` : `new ErreurIntrouvable('Cours introuvable')`, `new ErreurConflit(…)`…

| Fichier | Rôle |
|---|---|
| `auth.service.js` | Inscription (hash bcrypt), connexion, fabrication du JWT. |
| `session.service.js` | Révocation des jetons (`version_jeton`) et prolongation de session. |
| `compte.service.js` | Suppression du compte (RGPD) et déconnexion de tous les appareils. |
| `cours.service.js` | CRUD des cours ; 404 si absent **ou** appartenant à un autre. |
| `quiz.service.js` | **Cœur du projet** : générer, modifier, valider, exporter, régénérer, corriger. |
| `journalSecurite.service.js` | Trace connexions, échecs, suppressions, exports (OWASP A09). |

## Règles métier clés

- **Cycle de vie d'un quiz** : `brouillon` → l'enseignant relit → `valide` → export.
  Toute modification le **repasse en brouillon**. Pas d'export d'un brouillon (409).
- **Cours trop court** (< 300 caractères ou < 3 phrases) : refusé **avant** l'appel
  à l'IA (pas de coût), car l'IA inventerait.
- **Révision** (verrou optimiste) : modifier un quiz exige le numéro de version lu ;
  s'il a changé dans un autre onglet → 409 « Rechargez ».
- Chaque appel à l'IA est **chronométré et journalisé** (`generation_ia`), réussi ou non.
- **Enregistrement atomique** du quiz et de la livraison IA avec PostgreSQL.
- **Suppression en cascade** : un cours supprimé emporte directement ses quiz SQL.

## Choix de sécurité

- **bcrypt** (10 tours) : le mot de passe n'est jamais stocké en clair.
- **Temps de réponse constant** : même avec un email inconnu, un calcul bcrypt est fait
  (empreinte factice) → la durée ne révèle pas quels emails existent.
- **Ressource d'autrui = 404**, comme une ressource absente.
- **Suppression du compte** : mot de passe redemandé (403 si faux, pour ne pas déconnecter).
- **Déconnexion** = `version_jeton + 1` → tous les jetons du compte deviennent invalides.
- **Journal de sécurité** : ne bloque jamais l'utilisateur s'il est en panne, et ne
  contient ni email ni mot de passe.
- **Erreur de l'IA** : message générique pour l'utilisateur (502), détail seulement
  dans les journaux du serveur.
