// Tests des règles du mode « Tester le quiz » (src/utilitaires/essaiQuiz.js).

import test from 'node:test'
import assert from 'node:assert/strict'
import { calculerScore, estBonneReponse, messageScore } from '../src/utilitaires/essaiQuiz.js'

const QCM = { type: 'qcm', choix: ['A', 'B', 'C'], bonne_reponse: 1 }
const VRAI_FAUX = { type: 'vrai_faux', bonne_reponse: false }
const OUVERTE = { type: 'ouverte', bonne_reponse: 'Réponse attendue' }

test('un QCM est juste seulement si l\'index choisi est celui de la bonne réponse', () => {
  assert.equal(estBonneReponse(QCM, 1), true)
  assert.equal(estBonneReponse(QCM, 0), false)
})

test('un vrai/faux compare le booléen choisi à la bonne réponse', () => {
  assert.equal(estBonneReponse(VRAI_FAUX, false), true)
  assert.equal(estBonneReponse(VRAI_FAUX, true), false)
})

test('une question ouverte n\'est jamais corrigée automatiquement (null)', () => {
  assert.equal(estBonneReponse(OUVERTE, 'Réponse attendue'), null)
})

test('le score compte uniquement les questions évaluées justes', () => {
  const score = calculerScore([QCM, VRAI_FAUX, OUVERTE], { 0: true, 1: false, 2: true })

  assert.deepEqual(score, { points: 2, total: 3 })
})

test('le message de score accorde le pluriel et donne le pourcentage', () => {
  assert.equal(messageScore({ points: 1, total: 4 }), '1 bonne réponse sur 4 (25 %)')
  assert.equal(messageScore({ points: 3, total: 4 }), '3 bonnes réponses sur 4 (75 %)')
  assert.equal(messageScore({ points: 0, total: 0 }), '0 bonne réponse sur 0 (0 %)')
})
