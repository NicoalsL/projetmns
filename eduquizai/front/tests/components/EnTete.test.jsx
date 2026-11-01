import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import appelApi from '../../src/api/client'
import EnTete from '../../src/components/EnTete'
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

// « Se déconnecter » est rangé dans le menu « Mon compte » : on l'ouvre d'abord.
async function cliquerSurSeDeconnecter() {
  await userEvent.click(screen.getByRole('button', { name: 'Mon compte' }))
  await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))
}

describe('EnTete', () => {
  test('la déconnexion demande une révocation au serveur', async () => {
    appelApi.mockResolvedValue({})
    render(<MemoryRouter><EnTete /></MemoryRouter>)
    await cliquerSurSeDeconnecter()
    expect(appelApi).toHaveBeenCalledWith('/api/compte/deconnexion', { method: 'POST' })
    expect(sessionValide()).toBe(false)
  })

  test('serveur indisponible : la déconnexion ne prétend pas être réussie', async () => {
    appelApi.mockRejectedValue(new Error('Serveur indisponible'))
    render(<MemoryRouter><EnTete /></MemoryRouter>)
    await cliquerSurSeDeconnecter()
    expect(sessionValide()).toBe(true)
    expect(screen.getByRole('alert').textContent).toContain('Déconnexion non confirmée')
  })

  test('le menu « Mon compte » mène à la page du compte', async () => {
    render(<MemoryRouter><EnTete /></MemoryRouter>)

    await userEvent.click(screen.getByRole('button', { name: 'Mon compte' }))

    expect(screen.getByRole('link', { name: 'Gérer mon compte' }).getAttribute('href')).toBe('/compte')
  })

  test('le bouton « Menu » (mobile) annonce si la navigation est ouverte', async () => {
    render(<MemoryRouter><EnTete /></MemoryRouter>)
    const boutonMenu = screen.getByRole('button', { name: 'Menu' })
    expect(boutonMenu.getAttribute('aria-expanded')).toBe('false')

    await userEvent.click(boutonMenu)

    expect(boutonMenu.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('navigation').className).toContain('ouverte')
  })

  test('Échap referme le menu mobile et rend le focus au bouton « Menu »', async () => {
    render(<MemoryRouter><EnTete /></MemoryRouter>)
    const boutonMenu = screen.getByRole('button', { name: 'Menu' })
    await userEvent.click(boutonMenu)

    await userEvent.keyboard('{Escape}')

    expect(boutonMenu.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(boutonMenu)
  })

  test('changer de page referme les menus', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <EnTete />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))

    await userEvent.click(screen.getByRole('link', { name: 'Nouveau cours' }))

    expect(screen.getByRole('button', { name: 'Menu' }).getAttribute('aria-expanded')).toBe('false')
  })

  test('après un rechargement, l’en-tête passe en mode connecté dès que la session est chargée', () => {
    definirSession(null)
    render(<MemoryRouter><EnTete /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Se connecter' })).toBeTruthy()

    act(() => definirSession({ id_utilisateur: 7, expiration: Date.now() + 3600000 }))

    expect(screen.getByRole('button', { name: 'Menu' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Se connecter' })).toBeNull()
  })

  test('un visiteur voit « Se connecter » et « Créer un compte », sans menu', () => {
    definirSession(null)

    render(<MemoryRouter><EnTete /></MemoryRouter>)

    expect(screen.getByRole('link', { name: 'Se connecter' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull()
  })

  test('le logo ramène à l’accueil', () => {
    render(<MemoryRouter><EnTete /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'EduQuizAI, accueil' }).getAttribute('href')).toBe('/')
  })
})
