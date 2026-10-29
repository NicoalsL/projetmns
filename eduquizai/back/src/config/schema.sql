-- Rôle : créer toutes les tables PostgreSQL d'EduQuizAI (quiz JSONB compris).
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

-- SÉCURITÉ — Révocation des sessions : ce numéro est recopié dans chaque jeton.
-- Se déconnecter l'augmente de 1, ce qui rend invalides tous les jetons déjà émis.
ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS version_jeton INTEGER NOT NULL DEFAULT 0;

-- Quiz et questions : un quiz = une ligne SQL, avec ses questions intégrées
-- dans JSONB (QCM, vrai/faux et ouverte). Même souplesse documentaire, mais
-- clés étrangères, transactions et cascades directement garanties par PostgreSQL.
-- L'ID en hexadécimal conserve les anciennes URL après migration de MongoDB.
-- La référence vers la génération est facultative : les journaux IA sont purgés
-- après 6 mois ; ON DELETE SET NULL préserve le quiz de l'enseignant.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cours_proprietaire
  ON cours(id_cours, id_utilisateur);

CREATE TABLE IF NOT EXISTS quiz (
  id_quiz VARCHAR(24) PRIMARY KEY CHECK (id_quiz ~ '^[a-f0-9]{24}$'),
  id_generation INTEGER REFERENCES generation_ia(id_generation) ON DELETE SET NULL,
  id_cours INTEGER NOT NULL,
  id_utilisateur INTEGER NOT NULL,
  titre VARCHAR(200) NOT NULL,
  statut VARCHAR(20) NOT NULL CHECK (statut IN ('brouillon', 'valide')),
  fournisseur VARCHAR(50),
  modele VARCHAR(100),
  parametres JSONB,
  questions JSONB NOT NULL
    CHECK (jsonb_typeof(questions) = 'array' AND jsonb_array_length(questions) BETWEEN 1 AND 20),
  date_creation TIMESTAMP NOT NULL DEFAULT now(),
  date_modification TIMESTAMP NOT NULL DEFAULT now(),
  date_validation TIMESTAMP,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 0),
  CONSTRAINT fk_quiz_cours_proprietaire
    FOREIGN KEY (id_cours, id_utilisateur)
    REFERENCES cours(id_cours, id_utilisateur) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quiz_cours_proprietaire
  ON quiz(id_cours, id_utilisateur, date_creation DESC);
