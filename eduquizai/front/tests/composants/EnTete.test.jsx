// Tests de l'en-tête : la déconnexion révoque la session sur le serveur.

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import appelApi from '../../src/api/client'
import EnTete from '../../src/composants/EnTete'

vi.mock('../../src/api/client', () => ({ default: vi.fn() }))

// Jeton factice dont la date d'expiration est dans une heure : l'en-tête
// affiche alors la navigation d'un enseignant connecté.
function jetonValide() {
  const contenu = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
  return 'a.' + contenu.replace(/=+$/, '') + '.b'
}

beforeEach(() => {
  localStorage.setItem('jeton', jetonValide())
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.resetAllMocks()
})

describe('EnTete', () => {
  test('« Se déconnecter » révoque la session côté serveur puis vide la session locale', async () => {
    appelApi.mockResolvedValue({})
    render(<MemoryRouter><EnTete /></MemoryRouter>)

    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))

    expect(appelApi).toHaveBeenCalledWith('/api/compte/deconnexion', { method: 'POST' })
    expect(localStorage.getItem('jeton')).toBeNull()
  })

  test('serveur injoignable : la déconnexion locale a lieu quand même', async () => {
    appelApi.mockRejectedValue(new Error('Impossible de joindre le serveur.'))
    render(<MemoryRouter><EnTete /></MemoryRouter>)

    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))

    expect(localStorage.getItem('jeton')).toBeNull()
  })

  test('le logo ramène toujours à l\'accueil', () => {
    render(<MemoryRouter><EnTete /></MemoryRouter>)

    expect(screen.getByRole('link', { name: 'EduQuizAI, accueil' }).getAttribute('href')).toBe('/')
  })
})
