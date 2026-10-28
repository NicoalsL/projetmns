-- Rôle : créer les tables PostgreSQL d'EduQuizAI (comptes, cours, journaux).
-- Conception (MCD, MLD, MPD) : documentation/conception/base-de-donnees.md.
-- Script « idempotent » : il ne crée que ce qui n'existe pas encore (IF NOT EXISTS).
-- On peut donc le relancer à chaque démarrage sans jamais perdre de données.
-- Les tables ROLE et PARTAGE du MCD cible n'existent pas encore : elles ne seront
-- créées que si les fonctionnalités bonus (plusieurs rôles, partage) sont développées.

-- Comptes des enseignants. Le mot de passe n'est jamais stocké : seulement son empreinte (hash).
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

-- Cours. ON DELETE CASCADE : supprimer un compte supprime automatiquement ses cours.
CREATE TABLE IF NOT EXISTS cours (
  id_cours SERIAL PRIMARY KEY,
  titre VARCHAR(200) NOT NULL,
  contenu_texte TEXT NOT NULL,
  date_creation TIMESTAMP NOT NULL DEFAULT now(),
  id_utilisateur INTEGER NOT NULL REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE
);

-- Journal des appels à l'IA : historique visible par l'enseignant, et preuve
-- mesurée du critère de performance (moins de 5 secondes).
-- ON DELETE CASCADE : supprimer un compte ou un cours supprime aussi son
-- historique (droit à l'effacement du RGPD).
-- CHECK : la base refuse elle-même un statut autre que « succes » ou « echec ».
CREATE TABLE IF NOT EXISTS generation_ia (
  id_generation SERIAL PRIMARY KEY,
  date_generation TIMESTAMP NOT NULL DEFAULT now(),
  statut VARCHAR(10) NOT NULL CHECK (statut IN ('succes', 'echec')),
  duree_ms INTEGER,
  nombre_questions_demandees INTEGER NOT NULL,
  id_utilisateur INTEGER NOT NULL REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
  id_cours INTEGER NOT NULL REFERENCES cours(id_cours) ON DELETE CASCADE
);

-- Index : accélèrent les recherches par propriétaire et par cours (faites à chaque requête).
CREATE INDEX IF NOT EXISTS idx_cours_id_utilisateur ON cours(id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_generation_ia_id_cours ON generation_ia(id_cours);
CREATE INDEX IF NOT EXISTS idx_generation_ia_id_utilisateur ON generation_ia(id_utilisateur);

-- SÉCURITÉ — Journal des actions sensibles (connexions réussies ou ratées,
-- suppression de compte, export de quiz), pour repérer un abus après coup.
-- Pas de clé étrangère sur id_utilisateur : la trace d'une suppression de compte
-- doit survivre au compte supprimé.
-- RGPD (minimisation) : ni email, ni adresse IP ; purge automatique après 6 mois.
CREATE TABLE IF NOT EXISTS journal_securite (
  id_evenement SERIAL PRIMARY KEY,
  date_evenement TIMESTAMP NOT NULL DEFAULT now(),
  type_evenement VARCHAR(30) NOT NULL CHECK (
    type_evenement IN ('connexion_reussie', 'connexion_echouee', 'compte_supprime', 'quiz_exporte')
  ),
  id_utilisateur INTEGER
);

CREATE INDEX IF NOT EXISTS idx_journal_securite_date ON journal_securite(date_evenement);

-- Ajout après coup : le quiz produit par l'IA a-t-il bien été enregistré ?
-- (distinct du succès de l'appel à l'IA). Les lignes plus anciennes restent
-- « inconnu » : on n'invente pas un résultat qu'on ne connaît pas.
ALTER TABLE generation_ia ADD COLUMN IF NOT EXISTS livraison VARCHAR(20)
  NOT NULL DEFAULT 'inconnu'
  CHECK (livraison IN ('inconnu', 'en_attente', 'enregistre', 'echec'));

-- File d'attente des quiz MongoDB à effacer après la suppression d'un cours.
-- Pas de clé étrangère : la demande doit survivre à la suppression du cours ou du compte.
CREATE TABLE IF NOT EXISTS nettoyage_quiz (
  id_cours INTEGER PRIMARY KEY,
  id_utilisateur INTEGER NOT NULL,
  date_demande TIMESTAMP NOT NULL DEFAULT now()
);

-- Déclencheur (trigger) : à chaque suppression d'un cours, la base écrit
-- automatiquement une demande « effacer ses quiz » dans nettoyage_quiz.
-- Il fonctionne aussi quand un compte entier est supprimé (cascade).
-- La suppression et la demande sont enregistrées ensemble, ou pas du tout.
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

-- SÉCURITÉ — Révocation des sessions : ce numéro est recopié dans chaque jeton.
-- Se déconnecter l'augmente de 1, ce qui rend invalides tous les jetons déjà émis.
ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS version_jeton INTEGER NOT NULL DEFAULT 0;
