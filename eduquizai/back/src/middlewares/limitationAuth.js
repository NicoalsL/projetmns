const { signalerEvenementSecurite } = require('../services/alertesSecurite.service');
const MESSAGE_PAR_DEFAUT = 'Trop de tentatives. Réessayez plus tard.';

// Rôle : limiter le nombre d'essais. Au-delà de X essais dans une période,
// réponse 429 (« trop de requêtes ») avec le délai avant de réessayer.
// Deux usages :
// - contre la force brute sur la connexion : compteur par adresse IP ;
// - contre l'abus de l'IA (coûteuse) : compteur par enseignant.
//
// CHOIX — Écrit à la main (une Map) plutôt qu'avec express-rate-limit :
// une vingtaine de lignes que je peux expliquer et tester.
// CHOIX — POO : un limiteur garde un ÉTAT (ses compteurs) qui ne doit être
// modifié que par lui ; c'est donc un objet, avec ses données en champs privés (#).
// Pas de classe mère : rien d'autre dans le projet n'est « une sorte de limiteur ».
// LIMITE — Compteurs en mémoire : propres à ce serveur et remis à zéro au
// redémarrage. Avec plusieurs serveurs, il faudrait les partager (Redis).

// Clé par défaut : l'adresse IP. requete.ip ignore l'en-tête X-Forwarded-For
// (sauf réglage TRUST_PROXY) : un client ne peut pas s'inventer une adresse.
function cleParAdresseIp(requete) {
  return requete.ip || requete.socket?.remoteAddress || 'inconnue';
}

class LimiteurDeRequetes {
  // Un compteur par clé : { nombre d'essais, fin de la période }.
  #tentatives = new Map();
  #prochainNettoyage = 0;
  #reglages;

  // « maintenant » est un paramètre pour que les tests puissent avancer le temps.
  constructor({
    maximum = 20, // nombre d'essais autorisés…
    fenetreMs = 15 * 60 * 1000, // …dans cette période (15 minutes)
    maximumAdresses = 10000,
    maintenant = Date.now,
    obtenirCle = cleParAdresseIp,
    message = MESSAGE_PAR_DEFAUT,
  } = {}) {
    this.#reglages = { maximum, fenetreMs, maximumAdresses, maintenant, obtenirCle, message };
  }

  // Supprime les compteurs périmés (au plus une fois par minute)
  // pour que la mémoire ne grossisse pas sans fin.
  #nettoyer(instant) {
    if (instant < this.#prochainNettoyage) return;
    for (const [adresse, compteur] of this.#tentatives) {
      if (compteur.expiration <= instant) this.#tentatives.delete(adresse);
    }
    this.#prochainNettoyage = instant + Math.min(this.#reglages.fenetreMs, 60000);
  }

  // Refus : 429 + en-tête Retry-After (secondes avant de pouvoir réessayer).
  #refuser(reponse, secondesAvantNouvelEssai) {
    signalerEvenementSecurite('requete_limitee');
    reponse.set('Retry-After', String(secondesAvantNouvelEssai));
    return reponse.status(429).json({ erreur: this.#reglages.message });
  }

  // Le contrôle, exécuté à chaque requête (middleware Express).
  verifier(requete, reponse, suite) {
    const { maximum, fenetreMs, maximumAdresses, maintenant, obtenirCle } = this.#reglages;
    const instant = maintenant();
    this.#nettoyer(instant);

    const adresse = obtenirCle(requete);

    // Période terminée : on repart de zéro.
    let compteur = this.#tentatives.get(adresse);
    if (compteur && compteur.expiration <= instant) {
      this.#tentatives.delete(adresse);
      compteur = undefined;
    }

    if (!compteur) {
      // SÉCURITÉ — Garde-fou mémoire : une attaque depuis des milliers
      // d'adresses ne doit pas remplir la mémoire du serveur.
      if (this.#tentatives.size >= maximumAdresses) {
        return this.#refuser(reponse, 60);
      }
      compteur = { nombre: 0, expiration: instant + fenetreMs };
      this.#tentatives.set(adresse, compteur);
    }

    if (compteur.nombre >= maximum) {
      const secondesRestantes = Math.max(1, Math.ceil((compteur.expiration - instant) / 1000));
      return this.#refuser(reponse, secondesRestantes);
    }

    compteur.nombre += 1;
    suite(); // essai autorisé
  }
}

// Fabrique un limiteur et renvoie son contrôle, prêt à être placé dans une route.
// (Express attend une fonction : on lui donne la méthode verifier, liée à l'objet.)
function creerLimiteur(options) {
  const limiteur = new LimiteurDeRequetes(options);
  return limiteur.verifier.bind(limiteur);
}

module.exports = creerLimiteur;
module.exports.LimiteurDeRequetes = LimiteurDeRequetes;
