# Dépôts — accès aux données PostgreSQL

Les dépôts sont les seuls fichiers du backend qui écrivent des requêtes SQL.
Ils utilisent pg, des requêtes paramétrées ($1, $2…) et le filtre id_utilisateur
pour empêcher un enseignant d'accéder aux données d'un autre.

| Dépôt | Rôle |
|---|---|
| depotPostgres.js | Classe mère abstraite : requêtes, lecture, transactions |
| journalPostgres.js | Classe intermédiaire abstraite : purge à 6 mois |
| utilisateur.depot.js | Comptes, suppression et sessions |
| cours.depot.js | CRUD des cours, contrôle du propriétaire, verrou FOR UPDATE |
| generationIa.depot.js | Historique des appels IA et de leur livraison |
| journalSecurite.depot.js | Traçabilité et purge sécurité |
| quiz.depot.js | Quiz SQL et questions JSONB, revision (verrou optimiste) |

## Hiérarchie POO

DepotPostgres est la classe mère de CoursDepot, UtilisateurDepot,
QuizDepot et JournalPostgres. Cette dernière est la classe mère de
GenerationIaDepot et JournalSecuriteDepot.

## Intégrité

- **Clé étrangère composée** (id_cours, id_utilisateur) :
  chaque quiz appartient à un cours du même enseignant.
- **Cascade SQL** : supprimer un cours ou un compte supprime ses quiz
  dans la même transaction. Il n'y a plus de nettoyage inter-bases.
- **JSONB** : les QCM, vrai/faux et questions ouvertes restent ensemble,
  dans une ligne quiz.
- **Révision** : UPDATE ... WHERE revision = version_lue
  et revision = revision + 1 ; aucune écriture si la version est périmée.
- **SQL paramétré** : les textes et JSON ne sont jamais concaténés au SQL.

Voir le MPD réel : documentation/conception/base-de-donnees.md.
