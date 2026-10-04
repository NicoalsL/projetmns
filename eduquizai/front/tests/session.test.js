// Tests unitaires de la surveillance de session (src/auth/session.js), exécutés
// avec le lanceur de tests intégré à Node (node --test), sans navigateur :
// window et localStorage sont simulés, et le temps est contrôlé par des
// minuteurs factices (t.mock.timers) pour tester l'expiration sans attendre.

import test from 'node:test'
import assert from 'node:assert/strict'
import { surveillerSession, sessionValide } from '../src/auth/session.js'

const DEBUT = 1700000000000 // instant de départ fictif, en millisecondes

// Fabrique un faux JWT (signature non vérifiée côté front) expirant à "expirationMs".
function creerJeton(expirationMs) {
  const contenu = Buffer.from(JSON.stringify({ exp: expirationMs / 1000 })).toString('base64url')
  return 'a.' + contenu + '.b'
}

// Prépare un faux navigateur pour un test et le remet en état à la fin.
// Renvoie une fonction qui simule un changement de jeton depuis un autre onglet.
function preparerNavigateur(t) {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: DEBUT })

  const descripteursOriginaux = new Map(
    ['window', 'localStorage'].map((cle) => [cle, Object.getOwnPropertyDescriptor(globalThis, cle)]),
  )
  const stockage = new Map()
  Object.defineProperty(globalThis, 'window', { value: new EventTarget(), configurable: true })
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (cle) => stockage.get(cle) ?? null,
      setItem: (cle, valeur) => stockage.set(cle, valeur),
      removeItem: (cle) => stockage.delete(cle),
    },
    configurable: true,
  })

  const arrets = []
  t.after(() => {
    for (const arreter of arrets) arreter()
    for (const [cle, descripteur] of descripteursOriginaux) {
      if (descripteur) {
        Object.defineProperty(globalThis, cle, descripteur)
      } else {
        delete globalThis[cle]
      }
    }
  })

  function changerJetonDansAutreOnglet(nouveauJeton) {
    localStorage.setItem('jeton', nouveauJeton)
    const evenement = new Event('storage')
    Object.defineProperty(evenement, 'key', { value: 'jeton' })
    window.dispatchEvent(evenement)
  }
  changerJetonDansAutreOnglet.arreterALaFin = (arreter) => arrets.push(arreter)

  return changerJetonDansAutreOnglet
}

test('un renouvellement dans un autre onglet repousse l\'expiration au nouveau terme', (t) => {
  const changerJeton = preparerNavigateur(t)
  const notifications = []
  localStorage.setItem('jeton', creerJeton(DEBUT + 3000))
  changerJeton.arreterALaFin(surveillerSession((jeton) => notifications.push(jeton)))

  changerJeton(creerJeton(DEBUT + 6000))
  t.mock.timers.tick(3500) // l'ancien jeton aurait expiré ici
  assert.equal(notifications.at(-1), creerJeton(DEBUT + 6000))

  t.mock.timers.tick(2500) // le nouveau jeton expire
  assert.equal(notifications.at(-1), null)
})

test('un nouveau jeton qui expire plus tôt avance aussi le minuteur', (t) => {
  const changerJeton = preparerNavigateur(t)
  const notifications = []
  localStorage.setItem('jeton', creerJeton(DEBUT + 6000))
  changerJeton.arreterALaFin(surveillerSession((jeton) => notifications.push(jeton)))

  changerJeton(creerJeton(DEBUT + 1000))
  t.mock.timers.tick(1000)

  assert.equal(notifications.at(-1), null)
})

test('la fonction d\'arrêt retire les minuteurs et les écouteurs', (t) => {
  const changerJeton = preparerNavigateur(t)
  const notifications = []
  localStorage.setItem('jeton', creerJeton(DEBUT + 1000))
  const arreter = surveillerSession((jeton) => notifications.push(jeton))

  arreter()
  changerJeton(creerJeton(DEBUT + 2000))
  t.mock.timers.tick(3000)

  assert.equal(notifications.length, 1) // seule la vérification initiale
})

test('un événement de déconnexion invalide immédiatement la session', (t) => {
  const changerJeton = preparerNavigateur(t)
  const notifications = []
  localStorage.setItem('jeton', creerJeton(DEBUT + 6000))
  changerJeton.arreterALaFin(surveillerSession((jeton) => notifications.push(jeton)))

  localStorage.removeItem('jeton')
  window.dispatchEvent(new Event('session-expiree'))

  assert.equal(notifications.at(-1), null)
})

test('refuse les jetons vides, mal formés, expirés ou avec une date non numérique', () => {
  const dateEnTexte = 'a.' + Buffer.from(JSON.stringify({ exp: '9999999999' })).toString('base64url') + '.b'
  const jetonsInvalides = ['', 'invalide', dateEnTexte, creerJeton(0)]

  for (const jeton of jetonsInvalides) {
    assert.equal(sessionValide(jeton), false)
  }
})
