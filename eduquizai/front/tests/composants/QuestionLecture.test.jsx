// Tests du composant QuestionLecture : ce que l'enseignant (et un lecteur
// d'écran) voit au moment de relire une question.

import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import QuestionLecture from '../../src/composants/QuestionLecture'

afterEach(cleanup)

const qcm = {
  type: 'qcm',
  enonce: 'Où se trouve le noyau ?',
  choix: ['Dans la cellule', 'Dans la membrane'],
  bonne_reponse: 0,
  explication: 'Le cours le précise.',
}

describe('QuestionLecture', () => {
  test('signale la bonne réponse par un texte lu par les lecteurs d\'écran, pas seulement par la couleur', () => {
    render(<QuestionLecture question={qcm} numero={1} />)

    const bonneReponse = screen.getByText('Dans la cellule').closest('li')
    expect(bonneReponse.className).toBe('bonne-reponse')
    expect(bonneReponse.textContent).toContain('(bonne réponse)')
    expect(screen.getByText('Dans la membrane').closest('li').textContent).not.toContain('(bonne réponse)')
  })

  test('affiche le type de question en toutes lettres', () => {
    render(<QuestionLecture question={qcm} numero={1} />)

    expect(screen.getByText('QCM')).toBeDefined()
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('1. Où se trouve le noyau ?')
  })

  test('présente un vrai/faux comme deux réponses, Vrai et Faux', () => {
    render(<QuestionLecture question={{ type: 'vrai_faux', enonce: 'Vrai ?', bonne_reponse: false }} numero={2} />)

    expect(screen.getByText('Faux').closest('li').className).toBe('bonne-reponse')
  })

  test('avertit quand la citation de l\'IA est introuvable dans le cours', () => {
    const question = { ...qcm, source: 'Phrase inventée.', source_trouvee: false }

    render(<QuestionLecture question={question} numero={1} />)

    expect(screen.getByText(/Phrase inventée/)).toBeDefined()
    expect(screen.getByText('Citation introuvable dans le cours.')).toBeDefined()
  })

  test('n\'avertit pas quand la citation a été retrouvée', () => {
    render(<QuestionLecture question={{ ...qcm, source: 'Phrase du cours.', source_trouvee: true }} numero={1} />)

    expect(screen.queryByText('Citation introuvable dans le cours.')).toBeNull()
  })
})
