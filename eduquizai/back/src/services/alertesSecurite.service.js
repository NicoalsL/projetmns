// OWASP A09 : journal d'incidents pour la démonstration locale et les diagnostics.
// Aucune donnée saisie, adresse IP, email, cookie ou JWT n'est journalisée.
// Le journal PostgreSQL existant conserve les événements métier sensibles.
const FENETRE_MS = 15 * 60 * 1000;
const SEUIL_ALERTE = 5;
const EVENEMENTS_ADMIS = new Set([
  'origine_refusee', 'csrf_refuse', 'auth_refusee',
  'connexion_limitee', 'requete_limitee', 'session_revoquee',
]);

// Une fenêtre par événement ; taille bornée par la liste des types admis.
const compteurs = new Map();

function signalerEvenementSecurite(type, maintenant = Date.now()) {
  if (!EVENEMENTS_ADMIS.has(type)) throw new TypeError('Événement de sécurité inconnu');
  const evenement = { date: new Date(maintenant).toISOString(), type };
  console.info('[SECURITE]', evenement);

  let compteur = compteurs.get(type);
  if (!compteur || compteur.fin <= maintenant) {
    compteur = { nombre: 0, fin: maintenant + FENETRE_MS, alerteDeclenchee: false };
    compteurs.set(type, compteur);
  }
  compteur.nombre += 1;
  if (compteur.nombre >= SEUIL_ALERTE && !compteur.alerteDeclenchee) {
    compteur.alerteDeclenchee = true;
    console.warn('[ALERTE_SECURITE]', {
      date: evenement.date,
      type,
      nombreEvenements: compteur.nombre,
      fenetreMinutes: FENETRE_MS / 60000,
    });
  }
}

module.exports = { signalerEvenementSecurite };
