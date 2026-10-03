const LONGUEUR_MAX_TITRE = 200;
const LONGUEUR_MAX_CONTENU = 50000;

function validerCours(requete, reponse, suite) {
  const corps = requete.body;
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) {
    return reponse.status(400).json({ erreur: 'Un titre et un contenu de cours sont requis' });
  }
  const { titre, contenuTexte } = corps;
  if (typeof titre !== 'string' || !titre.trim() || titre.trim().length > LONGUEUR_MAX_TITRE || titre.includes('\0')) {
    return reponse.status(400).json({ erreur: 'Le titre doit contenir entre 1 et 200 caractères, sans caractère nul' });
  }
  if (typeof contenuTexte !== 'string' || !contenuTexte.trim() || contenuTexte.length > LONGUEUR_MAX_CONTENU || contenuTexte.includes('\0')) {
    return reponse.status(400).json({ erreur: 'Le contenu doit contenir entre 1 et 50 000 caractères, sans caractère nul' });
  }
  // L'auteur vient exclusivement du JWT, jamais d'un champ envoyé par le client.
  requete.body = { titre: titre.trim(), contenuTexte: contenuTexte.trim() };
  suite();
}

function validerIdentifiantCours(requete, reponse, suite) {
  const valeur = requete.params.id;
  if (!/^[1-9][0-9]*$/.test(valeur) || !Number.isSafeInteger(Number(valeur)) || Number(valeur) > 2147483647) {
    return reponse.status(400).json({ erreur: 'Identifiant de cours invalide' });
  }
  requete.idCours = Number(valeur);
  suite();
}
module.exports = { validerCours, validerIdentifiantCours };
