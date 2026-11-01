import test from 'node:test';
import assert from 'node:assert/strict';
import {
  definirSession, fermerSession, sessionValide, surveillerSession,
  tempsRestantSession, compteDuJeton, chargerSession,
} from '../src/auth/session.js';

test('la session est un état non sensible, sans exposer le JWT', () => {
  const ancienWindow = globalThis.window;
  globalThis.window = new EventTarget();
  try {
    definirSession({ id_utilisateur: 42, expiration: Date.now() + 60_000 });
    assert.equal(sessionValide(), true);
    assert.equal(compteDuJeton(), 42);
    assert.ok(tempsRestantSession() > 0);
    fermerSession();
    assert.equal(sessionValide(), false);
  } finally {
    definirSession(null);
    globalThis.window = ancienWindow;
  }
});

test('les observateurs sont notifiés, et la fermeture est immédiate', () => {
  const ancienWindow = globalThis.window;
  globalThis.window = new EventTarget();
  const notifications = [];
  try {
    const arreter = surveillerSession(etat => notifications.push(etat));
    definirSession({ id_utilisateur: 7, expiration: Date.now() + 20_000 });
    fermerSession();
    assert.equal(notifications.length, 3);
    assert.equal(notifications.at(-1), null);
    arreter();
    definirSession({ id_utilisateur: 8, expiration: Date.now() + 20_000 });
    assert.equal(notifications.length, 3);
  } finally {
    definirSession(null);
    globalThis.window = ancienWindow;
  }
});

// chargerSession dans Node : window, localStorage et fetch sont simulés.
async function chargerAvecReponse(simulerFetch) {
  const sauvegarde = {
    window: globalThis.window,
    localStorage: globalThis.localStorage,
    fetch: globalThis.fetch,
  };
  globalThis.window = new EventTarget();
  globalThis.localStorage = { removeItem() {} };
  globalThis.fetch = simulerFetch;
  try {
    definirSession({ id_utilisateur: 7, expiration: Date.now() + 60_000 });
    await chargerSession();
    return sessionValide();
  } finally {
    definirSession(null);
    globalThis.window = sauvegarde.window;
    globalThis.localStorage = sauvegarde.localStorage;
    globalThis.fetch = sauvegarde.fetch;
  }
}

test('session refusée par le serveur (401) : la session locale est fermée', async () => {
  const valide = await chargerAvecReponse(async () => ({ ok: false, status: 401 }));

  assert.equal(valide, false);
});

test('erreur du serveur (500, 503) : la session locale est gardée', async () => {
  const valide500 = await chargerAvecReponse(async () => ({ ok: false, status: 500 }));
  const valide503 = await chargerAvecReponse(async () => ({ ok: false, status: 503 }));

  assert.equal(valide500, true);
  assert.equal(valide503, true);
});

test('réseau coupé : la session locale est gardée', async () => {
  const valide = await chargerAvecReponse(async () => {
    throw new TypeError('Failed to fetch');
  });

  assert.equal(valide, true);
});

test('réponse illisible (page d’erreur d’un proxy) : la session locale est gardée', async () => {
  const valide = await chargerAvecReponse(async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('Unexpected token <');
    },
  }));

  assert.equal(valide, true);
});

test('session confirmée par le serveur : l’état du serveur est repris', async () => {
  const expiration = Date.now() + 120_000;
  const valide = await chargerAvecReponse(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ id_utilisateur: 7, expiration }),
  }));

  assert.equal(valide, true);
});
