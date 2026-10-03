const MESSAGE_LIMITE = { erreur: 'Trop de tentatives. Réessayez plus tard.' };

// Protection contre la force brute sur /api/auth : chaque adresse IP a droit
// à "maximum" requêtes par fenêtre de temps, puis reçoit une erreur 429.
//
// Limite connue : les compteurs sont en mémoire, donc propres à un processus
// et remis à zéro au redémarrage. Avec plusieurs instances, il faudrait un
// stockage partagé (Redis par exemple).
//
// "maintenant" est injectable pour que les tests puissent simuler le temps.
function creerLimiteur({
  maximum = 20,
  fenetreMs = 15 * 60 * 1000,
  maximumAdresses = 10000,
  maintenant = Date.now,
} = {}) {
  // Adresse IP -> { nombre de requêtes, instant d'expiration de la fenêtre }
  const tentatives = new Map();
  let prochainNettoyage = 0;

  // Supprime les compteurs expirés au plus une fois par minute, pour que la
  // Map ne grossisse pas indéfiniment.
  function nettoyer(instant) {
    if (instant < prochainNettoyage) return;
    for (const [adresse, compteur] of tentatives) {
      if (compteur.expiration <= instant) tentatives.delete(adresse);
    }
    prochainNettoyage = instant + Math.min(fenetreMs, 60000);
  }

  function refuser(reponse, secondesAvantNouvelEssai) {
    reponse.set('Retry-After', String(secondesAvantNouvelEssai));
    return reponse.status(429).json(MESSAGE_LIMITE);
  }

  return function limiterAuthentification(requete, reponse, suite) {
    const instant = maintenant();
    nettoyer(instant);

    // requete.ip ignore X-Forwarded-For par défaut : un client ne peut pas
    // contourner la limite en inventant cet en-tête.
    const adresse = requete.ip || requete.socket?.remoteAddress || 'inconnue';

    let compteur = tentatives.get(adresse);
    if (compteur && compteur.expiration <= instant) {
      tentatives.delete(adresse);
      compteur = undefined;
    }

    if (!compteur) {
      // Garde-fou mémoire : une attaque depuis des milliers d'IP ne doit pas
      // pouvoir saturer la RAM du serveur avec des compteurs.
      if (tentatives.size >= maximumAdresses) {
        return refuser(reponse, 60);
      }
      compteur = { nombre: 0, expiration: instant + fenetreMs };
      tentatives.set(adresse, compteur);
    }

    if (compteur.nombre >= maximum) {
      const secondesRestantes = Math.max(1, Math.ceil((compteur.expiration - instant) / 1000));
      return refuser(reponse, secondesRestantes);
    }

    compteur.nombre += 1;
    suite();
  };
}

module.exports = creerLimiteur;
