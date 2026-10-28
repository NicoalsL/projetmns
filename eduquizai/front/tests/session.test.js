import test from 'node:test';
import assert from 'node:assert/strict';
import {
  definirSession, fermerSession, sessionValide, surveillerSession,
  tempsRestantSession, compteDuJeton,
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
