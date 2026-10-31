// Tests du menu « Mon compte » de l'en-tête : ouverture, fermeture (Échap,
// clic ailleurs, focus qui sort) et état annoncé aux lecteurs d'écran.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MenuCompte from '../../src/components/MenuCompte'

afterEach(() => {
  cleanup()
})

function afficherMenu({ adresse = '/dashboard', surDeconnexion = vi.fn() } = {}) {
  render(
    <MemoryRouter initialEntries={[adresse]}>
      <MenuCompte surDeconnexion={surDeconnexion} deconnexionEnCours={false} />
      <button type="button">Ailleurs</button>
    </MemoryRouter>,
  )
  return screen.getByRole('button', { name: 'Mon compte' })
}

describe('MenuCompte', () => {
  // Le CSS n'est pas chargé dans les tests : on vérifie l'état annoncé
  // (aria-expanded) et la classe « ouvert » qui fait afficher la liste.
  test('fermé au départ', () => {
    const bouton = afficherMenu()

    expect(bouton.getAttribute('aria-expanded')).toBe('false')
    expect(bouton.parentElement.className).toBe('menu-compte')
  })

  test('un clic ouvre le menu et annonce qu’il est ouvert', async () => {
    const bouton = afficherMenu()

    await userEvent.click(bouton)

    expect(bouton.getAttribute('aria-expanded')).toBe('true')
    expect(bouton.parentElement.className).toBe('menu-compte ouvert')
    expect(screen.getByRole('link', { name: 'Gérer mon compte' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeTruthy()
  })

  test('« Se déconnecter » appelle la déconnexion de l’en-tête', async () => {
    const surDeconnexion = vi.fn()
    const bouton = afficherMenu({ surDeconnexion })
    await userEvent.click(bouton)

    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))

    expect(surDeconnexion).toHaveBeenCalledTimes(1)
  })

  test('Échap referme le menu et rend le focus au bouton', async () => {
    const bouton = afficherMenu()
    await userEvent.click(bouton)
    screen.getByRole('link', { name: 'Gérer mon compte' }).focus()

    await userEvent.keyboard('{Escape}')

    expect(bouton.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(bouton)
  })

  test('un clic en dehors du menu le referme', async () => {
    const bouton = afficherMenu()
    await userEvent.click(bouton)

    await userEvent.click(screen.getByRole('button', { name: 'Ailleurs' }))

    expect(bouton.getAttribute('aria-expanded')).toBe('false')
  })

  test('quitter le menu avec Tab le referme', async () => {
    const bouton = afficherMenu()
    await userEvent.click(bouton)

    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()

    expect(document.activeElement.textContent).toBe('Ailleurs')
    expect(bouton.getAttribute('aria-expanded')).toBe('false')
  })

  test('sur la page « Mon compte », le bouton est marqué comme actif', () => {
    const bouton = afficherMenu({ adresse: '/compte' })

    expect(bouton.className).toBe('actif')
  })
})
