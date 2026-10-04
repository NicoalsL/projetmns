-- Script de création de la base relationnelle (PostgreSQL).
-- Correspond à la partie MVP du MPD dans docs/base-de-donnees.md.
-- ROLE et PARTAGE ne sont pas créées ici : elles n'existent que si les
-- fonctionnalités bonus correspondantes (multi-rôles, partage) sont activées.

CREATE TABLE IF NOT EXISTS utilisateur (
  id_utilisateur SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  mot_de_passe_hache VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'enseignant',
  consentement_rgpd BOOLEAN NOT NULL DEFAULT false,
  date_consentement TIMESTAMP,
  date_creation TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cours (
  id_cours SERIAL PRIMARY KEY,
  titre VARCHAR(200) NOT NULL,
  contenu_texte TEXT NOT NULL,
  date_creation TIMESTAMP NOT NULL DEFAULT now(),
  id_utilisateur INTEGER NOT NULL REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE
);

-- Journal des générations IA : sert à la fois d'historique visible par
-- l'enseignant et de preuve du critère de performance (< 5 secondes).
-- ON DELETE CASCADE : supprimer un compte ou un cours doit supprimer son
-- historique de générations (droit à l'effacement RGPD).
CREATE TABLE IF NOT EXISTS generation_ia (
  id_generation SERIAL PRIMARY KEY,
  date_generation TIMESTAMP NOT NULL DEFAULT now(),
  statut VARCHAR(10) NOT NULL CHECK (statut IN ('succes', 'echec')),
  duree_ms INTEGER,
  nombre_questions_demandees INTEGER NOT NULL,
  id_utilisateur INTEGER NOT NULL REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
  id_cours INTEGER NOT NULL REFERENCES cours(id_cours) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cours_id_utilisateur ON cours(id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_generation_ia_id_cours ON generation_ia(id_cours);
CREATE INDEX IF NOT EXISTS idx_generation_ia_id_utilisateur ON generation_ia(id_utilisateur);

-- Journal de sécurité : actions sensibles (connexions réussies ou échouées,
-- suppression de compte, export de quiz), pour repérer un abus a posteriori.
-- Pas de clé étrangère sur id_utilisateur : la trace d'une suppression de
-- compte doit survivre au compte supprimé. Minimisation RGPD : ni email, ni
-- adresse IP ; purge automatique après 6 mois, comme generation_ia.
CREATE TABLE IF NOT EXISTS journal_securite (
  id_evenement SERIAL PRIMARY KEY,
  date_evenement TIMESTAMP NOT NULL DEFAULT now(),
  type_evenement VARCHAR(30) NOT NULL CHECK (
    type_evenement IN ('connexion_reussie', 'connexion_echouee', 'compte_supprime', 'quiz_exporte')
  ),
  id_utilisateur INTEGER
);

CREATE INDEX IF NOT EXISTS idx_journal_securite_date ON journal_securite(date_evenement);

-- État de livraison distinct du résultat IA : les anciennes lignes restent
-- « inconnu », sans inventer un succès de persistance rétrospectif.
ALTER TABLE generation_ia ADD COLUMN IF NOT EXISTS livraison VARCHAR(20)
  NOT NULL DEFAULT 'inconnu'
  CHECK (livraison IN ('inconnu', 'en_attente', 'enregistre', 'echec'));

-- Pas de FK : la demande doit survivre à la suppression du cours/compte.
CREATE TABLE IF NOT EXISTS nettoyage_quiz (
  id_cours INTEGER PRIMARY KEY,
  id_utilisateur INTEGER NOT NULL,
  date_demande TIMESTAMP NOT NULL DEFAULT now()
);

-- Le déclencheur couvre aussi les cascades lors de la suppression du compte.
-- La suppression SQL et sa demande Mongo sont validées ou annulées ensemble.
CREATE OR REPLACE FUNCTION demander_nettoyage_quiz() RETURNS trigger AS $$
BEGIN
  INSERT INTO nettoyage_quiz (id_cours, id_utilisateur)
  VALUES (OLD.id_cours, OLD.id_utilisateur)
  ON CONFLICT (id_cours) DO NOTHING;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER suppression_cours_nettoyage
AFTER DELETE ON cours FOR EACH ROW EXECUTE FUNCTION demander_nettoyage_quiz();

-- Révocation des sessions : numéro recopié dans chaque JWT. L'incrémenter
-- (déconnexion) invalide tous les jetons déjà émis pour ce compte.
ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS version_jeton INTEGER NOT NULL DEFAULT 0;
