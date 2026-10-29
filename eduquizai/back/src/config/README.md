# Configuration PostgreSQL et du serveur

| Fichier | Rôle |
|---|---|
| environnement.js | Valide JWT_SECRET, DATABASE_URL et la configuration IA/CORS |
| postgres.js | Pool partagé de connexions PostgreSQL (pg) |
| schema.sql | Crée les 5 tables, clés étrangères, index et contraintes |
| verificationSchema.js | Vérifie les 5 tables et le compte applicatif restreint |

## Choix actuels

- **Une seule base PostgreSQL** pour les utilisateurs, cours, générations,
  journaux et quiz avec leurs questions dans une colonne JSONB.
- **Quiz et cours** liés par une clé étrangère composée sur
  (id_cours, id_utilisateur), avec ON DELETE CASCADE.
- **Transactions SQL** : l'enregistrement d'un quiz et l'état de livraison
  d'une génération sont atomiques.
- Le compte API eduquizai_app ne possède que des droits de lecture/écriture
  des lignes ; le propriétaire n'intervient que pour npm run db:init.
- Le journal de sécurité n'a volontairement pas de FK sur id_utilisateur.
- Les mots de passe ne sont pas stockés en clair ; les secrets sont hors Git.
- Ollama en HTTP seulement en local ; HTTPS obligatoire vers une machine distante.

Voir documentation/conception/base-de-donnees.md.
