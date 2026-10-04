// Tests de la recherche et du tri de la liste « Mes cours »
// (src/utilitaires/filtrerCours.js), avec le lanceur intégré à Node.

import test from 'node:test'
import assert from 'node:assert/strict'
import { filtrerEtTrierCours } from '../src/utilitaires/filtrerCours.js'

const COURS = [
  { id_cours: 1, titre: 'La photosynthèse', date_creation: '2026-09-01T10:00:00Z' },
  { id_cours: 2, titre: 'Révolution française', date_creation: '2026-10-01T10:00:00Z' },
  { id_cours: 3, titre: 'Théorème de Pythagore', date_creation: '2026-09-15T10:00:00Z' },
]

function identifiants(liste) {
  return liste.map((unCours) => unCours.id_cours)
}

test('sans recherche, renvoie tous les cours, les plus récents d\'abord', () => {
  const resultat = filtrerEtTrierCours(COURS, '', 'recent')

  assert.deepEqual(identifiants(resultat), [2, 3, 1])
})

test('la recherche ignore la casse et les accents', () => {
  const resultat = filtrerEtTrierCours(COURS, '  REVOLUTION ', 'recent')

  assert.deepEqual(identifiants(resultat), [2])
})

test('trie du plus ancien au plus récent', () => {
  const resultat = filtrerEtTrierCours(COURS, '', 'ancien')

  assert.deepEqual(identifiants(resultat), [1, 3, 2])
})

test('trie par titre dans l\'ordre alphabétique français', () => {
  const resultat = filtrerEtTrierCours(COURS, '', 'titre')

  assert.deepEqual(identifiants(resultat), [1, 2, 3])
})

test('ne modifie jamais la liste reçue', () => {
  const copie = structuredClone(COURS)

  filtrerEtTrierCours(COURS, 'photo', 'titre')

  assert.deepEqual(COURS, copie)
})
