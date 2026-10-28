const { signalerEvenementSecurite } = require('../src/services/alertesSecurite.service');

describe('A09 — alertes de sécurité locales', () => {
  afterEach(() => jest.restoreAllMocks());

  test('journalise un code et une date sans identité ni secret', () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    signalerEvenementSecurite('origine_refusee', Date.parse('2026-10-27T08:00:00Z'));
    expect(info).toHaveBeenCalledWith('[SECURITE]', {
      date: '2026-10-27T08:00:00.000Z', type: 'origine_refusee',
    });
    expect(JSON.stringify(info.mock.calls)).not.toMatch(/@|Bearer|JWT_SECRET|motDePasse/);
    expect(warning).not.toHaveBeenCalled();
  });

  test('déclenche une seule alerte par fenêtre pour cinq refus', () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const debut = Date.parse('2026-10-27T09:00:00Z');
    for (let i = 0; i < 7; i += 1) signalerEvenementSecurite('csrf_refuse', debut + i);
    expect(info).toHaveBeenCalledTimes(7);
    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith('[ALERTE_SECURITE]', expect.objectContaining({
      type: 'csrf_refuse', nombreEvenements: 5, fenetreMinutes: 15,
    }));
  });

  test('refuse un événement non prévu pour éviter de journaliser une entrée libre', () => {
    expect(() => signalerEvenementSecurite('alice@example.com')).toThrow(TypeError);
  });
});
