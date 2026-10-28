// Rôle : créer le compte MongoDB de l'API, en production (docker-compose.prod.yml).
// Exécuté automatiquement par l'image mongo, une seule fois, à la création de la base.
//
// SÉCURITÉ — Moindre privilège : l'API n'utilise pas le compte « root ».
// Son compte a le rôle readWrite sur la SEULE base eduquizai : lire et écrire
// des documents, créer ses index ; rien sur les autres bases ni sur les comptes.

const nomUtilisateur = 'eduquizai_app';
const motDePasse = process.env.MONGO_APP_MOT_DE_PASSE;

if (!motDePasse) {
  throw new Error('MONGO_APP_MOT_DE_PASSE est requis pour créer le compte de l\'API.');
}

db.getSiblingDB('eduquizai').createUser({
  user: nomUtilisateur,
  pwd: motDePasse,
  roles: [{ role: 'readWrite', db: 'eduquizai' }],
});

print('Compte MongoDB de l\'API créé : ' + nomUtilisateur + ' (readWrite sur eduquizai uniquement).');
