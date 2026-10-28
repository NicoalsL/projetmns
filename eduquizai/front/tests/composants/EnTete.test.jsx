import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import appelApi from '../../src/api/client'
import EnTete from '../../src/composants/EnTete'
import { definirSession, sessionValide } from '../../src/auth/session'

vi.mock('../../src/api/client', () => ({ default: vi.fn() }))

beforeEach(() => {
  definirSession({ id_utilisateur: 7, expiration: Date.now() + 3600000 })
})

afterEach(() => {
  cleanup()
  definirSession(null)
  localStorage.clear()
  vi.resetAllMocks()
})

describe('EnTete', () => {
  test('la déconnexion demande une révocation au serveur', async () => {
    appelApi.mockResolvedValue({})
    render(<MemoryRouter><EnTete /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))
    expect(appelApi).toHaveBeenCalledWith('/api/compte/deconnexion', { method: 'POST' })
    expect(sessionValide()).toBe(false)
  })

  test('serveur indisponible : la déconnexion ne prétend pas être réussie', async () => {
    appelApi.mockRejectedValue(new Error('Serveur indisponible'))
    render(<MemoryRouter><EnTete /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))
    expect(sessionValide()).toBe(true)
    expect(screen.getByRole('alert').textContent).toContain('Déconnexion non confirmée')
  })

  test('le logo ramène à l’accueil', () => {
    render(<MemoryRouter><EnTete /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'EduQuizAI, accueil' }).getAttribute('href')).toBe('/')
  })
})
