// Vérifie que le navigateur transmet la version lue et conserve la saisie en conflit.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PageQuiz from '../../src/pages/PageQuiz'
import appelApi from '../../src/api/client'

vi.mock('../../src/api/client', () => ({ default: vi.fn(), telechargerFichier: vi.fn() }))

const quiz = {
  id_quiz: 'abc',
  id_cours: 1,
  titre: 'Quiz initial',
  revision: 4,
  statut: 'brouillon',
  fournisseur: 'simulation',
  questions: [{ type: 'vrai_faux', enonce: 'Une cellule est vivante.', bonne_reponse: true, explication: 'Oui.' }],
}

function afficher() {
  return render(
    <MemoryRouter initialEntries={['/quiz/abc']}>
      <Routes>
        <Route path="/quiz/:id" element={<PageQuiz />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

describe('révision du quiz côté navigateur', () => {
  test('la validation transmet la version effectivement affichée', async () => {
    appelApi.mockResolvedValueOnce(quiz)
    appelApi.mockResolvedValueOnce({ ...quiz, revision: 5, statut: 'valide' })
    const utilisateur = userEvent.setup()
    afficher()

    await utilisateur.click(await screen.findByRole('button', { name: 'J’ai relu ce quiz : le valider' }))

    expect(appelApi).toHaveBeenLastCalledWith('/api/quiz/abc/validation', {
      method: 'POST',
      body: JSON.stringify({ revision: 4 }),
    })
    expect(await screen.findByText('Validé', { selector: 'strong' })).toBeTruthy()
  })

  test('un conflit conserve la saisie et permet de recharger explicitement la nouvelle version', async () => {
    appelApi.mockResolvedValueOnce(quiz)
    appelApi.mockRejectedValueOnce(Object.assign(new Error('Quiz modifié dans un autre onglet'), { status: 409 }))
    appelApi.mockResolvedValueOnce({ ...quiz, titre: 'Version distante', revision: 5 })
    const utilisateur = userEvent.setup()
    afficher()
    await utilisateur.click(await screen.findByRole('button', { name: 'Modifier', exact: true }))
    await utilisateur.clear(screen.getByLabelText('Titre du quiz'))
    await utilisateur.type(screen.getByLabelText('Titre du quiz'), 'Ma saisie locale')

    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }))

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByLabelText('Titre du quiz').value).toBe('Ma saisie locale')
    const corps = JSON.parse(appelApi.mock.calls[1][1].body)
    expect(corps.revision).toBe(4)

    await utilisateur.click(screen.getByRole('button', { name: 'Recharger la dernière version' }))

    await waitFor(() => expect(screen.queryByLabelText('Titre du quiz')).toBeNull())
    expect(screen.getByRole('heading', { name: 'Version distante' })).toBeTruthy()
  })
})
