// Tests du composant EditeurQuestion : modifications d'un QCM renvoyées au parent.

import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditeurQuestion from '../../src/composants/EditeurQuestion'

afterEach(cleanup)

const qcm = {
  type: 'qcm',
  enonce: 'Question ?',
  choix: ['Premier', 'Deuxième', 'Troisième'],
  bonne_reponse: 2,
  explication: '',
}

function afficher(question, onChange = vi.fn()) {
  render(
    <EditeurQuestion
      question={question}
      numero={1}
      onChange={onChange}
      onSupprimer={vi.fn()}
      suppressionPossible
    />,
  )
  return onChange
}

describe('EditeurQuestion', () => {
  test('retirer un choix placé avant la bonne réponse décale son index', async () => {
    const onChange = afficher(qcm)

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer le choix 1' }))

    expect(onChange).toHaveBeenCalledWith({ ...qcm, choix: ['Deuxième', 'Troisième'], bonne_reponse: 1 })
  })

  test('retirer la bonne réponse la reporte sur le premier choix', async () => {
    const onChange = afficher(qcm)

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer le choix 3' }))

    expect(onChange).toHaveBeenCalledWith({ ...qcm, choix: ['Premier', 'Deuxième'], bonne_reponse: 0 })
  })

  test('on ne peut pas descendre sous deux choix', () => {
    afficher({ ...qcm, choix: ['Premier', 'Deuxième'], bonne_reponse: 0 })

    expect(screen.getByRole('button', { name: 'Supprimer le choix 1' }).disabled).toBe(true)
  })

  test('marque seulement le champ signalé par l\'API et le relie au message d\'erreur', () => {
    render(
      <EditeurQuestion
        question={qcm}
        numero={1}
        onChange={vi.fn()}
        onSupprimer={vi.fn()}
        suppressionPossible
        champEnErreur="choix"
        idErreur="erreur-quiz"
      />,
    )

    const choix = screen.getByLabelText('Choix 2')
    expect(choix.getAttribute('aria-invalid')).toBe('true')
    expect(choix.getAttribute('aria-describedby')).toBe('erreur-quiz')
    expect(screen.getByLabelText('Énoncé').getAttribute('aria-invalid')).toBeNull()
  })

  test('sans erreur signalée, aucun champ n\'est marqué', () => {
    afficher(qcm)

    expect(document.querySelectorAll('[aria-invalid]')).toHaveLength(0)
  })

  test('cocher un autre bouton rond change la bonne réponse', async () => {
    const onChange = afficher(qcm)

    await userEvent.click(screen.getByLabelText('Le choix 1 est la bonne réponse'))

    expect(onChange).toHaveBeenCalledWith({ ...qcm, bonne_reponse: 0 })
  })
})
