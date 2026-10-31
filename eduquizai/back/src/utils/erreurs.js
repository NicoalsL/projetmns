// Rôle : la famille des erreurs du projet, organisée en classes.
//
// CHOIX — POO : chaque erreur HÉRITE de la classe Error de JavaScript. Elle garde
// tout ce qu'a une erreur normale (message, pile d'appels) et ajoute ses propres
// informations. On peut ensuite reconnaître une erreur par sa CLASSE
// (« erreur instanceof ErreurIntrouvable ») au lieu de comparer des textes.
//
//   Error
//    ├── ErreurMetier (abstraite) : message prévu pour l'utilisateur + statut HTTP
//    │    ├── ErreurDonneesInvalides  400
//    │    │    └── ErreurQuestion     400 + numéro de la question et champ fautif
//    │    ├── ErreurNonAuthentifie    401
//    │    ├── ErreurAccesRefuse       403
//    │    ├── ErreurIntrouvable       404
//    │    ├── ErreurConflit           409
//    │    └── ErreurServiceIa         502
//    └── ErreurIa : panne technique du module IA, jamais montrée telle quelle

// Erreur « métier » : refus prévu par une règle du projet. Son message est écrit
// pour l'utilisateur, donc gestionErreurs.js peut l'afficher tel quel, avec son
// statut HTTP. Classe ABSTRAITE : on utilise toujours une de ses classes filles,
// qui fixe le statut (impossible de se tromper de code HTTP).
class ErreurMetier extends Error {
  constructor(message, status) {
    if (new.target === ErreurMetier) {
      throw new TypeError('ErreurMetier est abstraite : utiliser une classe fille (ErreurIntrouvable…).');
    }
    super(message); // appelle le constructeur de la classe mère (Error)
    this.name = new.target.name; // nom de la classe réelle, utile dans les journaux
    this.status = status;
  }
}

// 400 : la demande est mal formée ou ne respecte pas une règle (ex. cours trop court).
class ErreurDonneesInvalides extends ErreurMetier {
  constructor(message) {
    super(message, 400);
  }
}

// 400 aussi, mais on sait quelle question et quel champ sont en cause
// ('enonce', 'choix', 'bonne_reponse' ou 'explication').
// ACCESSIBILITÉ — L'interface peut ainsi entourer le bon champ (RGAA 11.10).
class ErreurQuestion extends ErreurDonneesInvalides {
  constructor(numero, message, champ) {
    super(`Question ${numero} : ${message}`);
    this.code = 'QUESTION_INVALIDE';
    this.numero = numero;
    this.champ = champ;
  }
}

// 401 : pas (ou plus) connecté, ou identifiants faux.
class ErreurNonAuthentifie extends ErreurMetier {
  constructor(message) {
    super(message, 401);
  }
}

// 403 : connecté, mais l'action est refusée (ex. mot de passe de confirmation faux).
class ErreurAccesRefuse extends ErreurMetier {
  constructor(message) {
    super(message, 403);
  }
}

// 404 : la ressource n'existe pas… ou appartient à un autre enseignant.
// SÉCURITÉ — Même erreur dans les deux cas : on ne révèle pas qu'elle existe.
class ErreurIntrouvable extends ErreurMetier {
  constructor(message) {
    super(message, 404);
  }
}

// 409 : conflit avec l'état actuel (email déjà pris, quiz modifié ailleurs…).
class ErreurConflit extends ErreurMetier {
  constructor(message) {
    super(message, 409);
  }
}

// 502 : le service d'IA n'a pas pu répondre (message simple pour l'utilisateur).
class ErreurServiceIa extends ErreurMetier {
  constructor(message) {
    super(message, 502);
  }
}

// Panne technique du module IA, avec un code compris par le service :
// IA_INDISPONIBLE, IA_DELAI_DEPASSE, IA_REFUS ou IA_REPONSE_INVALIDE.
// Ce n'est PAS une erreur métier : le service la traduit en ErreurServiceIa.
class ErreurIa extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ErreurIa';
    this.code = code;
  }
}

module.exports = {
  ErreurMetier,
  ErreurDonneesInvalides,
  ErreurQuestion,
  ErreurNonAuthentifie,
  ErreurAccesRefuse,
  ErreurIntrouvable,
  ErreurConflit,
  ErreurServiceIa,
  ErreurIa,
};
