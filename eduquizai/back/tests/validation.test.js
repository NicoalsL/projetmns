// Tests unitaires des middlewares de validation : aucune donnée mal formée ne
// doit atteindre le contrôleur.

const { validerInscription, validerConnexion } = require('../src/middlewares/validation');

// Exécute un middleware avec un corps donné et renvoie ce qui s'est passé.
function executer(middleware, corps) {
  const requete = { body: corps };
  const reponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const suite = jest.fn();
  middleware(requete, reponse, suite);
  return { requete, reponse, suite };
}

const inscriptionValide = { nom: 'Enseignant', email: 'prof@example.com', motDePasse: 'MotDePasse123' };

describe('validerInscription', () => {
  test('accepte une inscription valide, retire les espaces et les champs non prévus', () => {
    const resultat = executer(validerInscription, {
      ...inscriptionValide,
      nom: '  Enseignant  ',
      email: ' prof@example.com ',
      role: 'admin', // tentative d'élévation de privilèges
    });

    expect(resultat.suite).toHaveBeenCalledTimes(1);
    expect(resultat.requete.body).toEqual(inscriptionValide);
  });

  test('accepte un mot de passe d\'exactement 72 octets UTF-8', () => {
    const resultat = executer(validerInscription, { ...inscriptionValide, motDePasse: 'é'.repeat(36) });
    expect(resultat.suite).toHaveBeenCalled();
  });

  test.each([
    ['mot de passe numérique', { ...inscriptionValide, motDePasse: 12345678 }],
    ['mot de passe objet', { ...inscriptionValide, motDePasse: {} }],
    ['email tableau', { ...inscriptionValide, email: ['prof@example.com'] }],
    ['nom trop long', { ...inscriptionValide, nom: 'x'.repeat(101) }],
    ['email trop long', { ...inscriptionValide, email: 'x'.repeat(251) + '@a.fr' }],
    ['nom vide', { ...inscriptionValide, nom: '   ' }],
    ['mot de passe court', { ...inscriptionValide, motDePasse: '1234567' }],
    ['mot de passe UTF-8 trop long', { ...inscriptionValide, motDePasse: 'é'.repeat(37) }],
    ['mot de passe ASCII trop long', { ...inscriptionValide, motDePasse: 'x'.repeat(73) }],
    ['corps absent', undefined],
    ['corps nul', null],
    ['corps tableau', []],
  ])('refuse : %s', (_description, corps) => {
    const resultat = executer(validerInscription, corps);
    expect(resultat.reponse.status).toHaveBeenCalledWith(400);
    expect(resultat.suite).not.toHaveBeenCalled();
  });
});

describe('validerConnexion', () => {
  test.each([
    ['corps absent', undefined],
    ['corps nul', null],
    ['corps tableau', []],
    ['champs objets', { email: {}, motDePasse: {} }],
    ['email sans domaine', { email: 'a@b', motDePasse: 'abc' }],
    ['mot de passe trop long', { email: inscriptionValide.email, motDePasse: 'x'.repeat(73) }],
  ])('refuse : %s', (_description, corps) => {
    expect(executer(validerConnexion, corps).reponse.status).toHaveBeenCalledWith(400);
  });
});
