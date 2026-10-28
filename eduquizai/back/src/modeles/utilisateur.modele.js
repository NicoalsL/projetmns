const bcrypt = require('bcryptjs');

// Rôle : un enseignant (table utilisateur).
// CHOIX — POO et SÉCURITÉ réunies : l'empreinte du mot de passe est un champ
// PRIVÉ (#). Elle n'est lisible que dans cette classe : impossible de l'envoyer
// par erreur au navigateur (JSON.stringify ne voit pas les champs privés).
// On ne la lit jamais : on demande à l'objet « ce mot de passe correspond-il ? ».

class Utilisateur {
  #motDePasseHache; // empreinte bcrypt, jamais exposée

  // ligne : une ligne de la table utilisateur (certaines colonnes peuvent manquer
  // selon la requête : le dépôt ne lit que ce qui est utile).
  constructor({ id_utilisateur, nom, email, role, version_jeton, mot_de_passe_hache }) {
    this.id_utilisateur = id_utilisateur;
    this.nom = nom;
    this.email = email;
    this.role = role;
    this.version_jeton = version_jeton;
    this.#motDePasseHache = mot_de_passe_hache;
  }

  // SÉCURITÉ — Compare avec bcrypt (lent exprès, contre la force brute).
  motDePasseCorrespond(motDePasse) {
    return bcrypt.compare(motDePasse, this.#motDePasseHache);
  }

  // SÉCURITÉ — Ce que le navigateur a le droit de voir : identifiant, nom, email.
  // Ni empreinte du mot de passe, ni rôle, ni version de session.
  versProfilPublic() {
    return { id_utilisateur: this.id_utilisateur, nom: this.nom, email: this.email };
  }
}

module.exports = Utilisateur;
