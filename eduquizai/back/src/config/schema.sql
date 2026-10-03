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
