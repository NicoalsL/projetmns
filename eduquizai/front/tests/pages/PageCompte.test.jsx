// Tests de la page « Mon compte » : informations du compte, lien vers les droits
// RGPD et suppression du compte (confirmation et mot de passe redemandé).
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import appelApi from '../../src/api/client'
import PageCompte from '../../src/pages/PageCompte'
import RouteProtegee from '../../src/components/RouteProtegee'
import { definirSession, sessionValide } from '../../src/auth/session'

vi.mock('../../src/api/client', () => ({ default: vi.fn() }))

const UNE_HEURE_MS = 3600000
const PROFIL = { id_utilisateur: 7, nom: 'Camille Martin', email: 'camille@exemple.fr' }

// RouteProtegee demande l'état de la session au serveur (fetch) : réponse simulée.
beforeEach(() => {
  const session = { id_utilisateur: 7, expiration: Date.now() + UNE_HEURE_MS }
  definirSession(session)
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => session })))
})

afterEach(() => {
  cleanup()
  definirSession(null)
  localStorage.clear()
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

// Page de connexion simplifiée : affiche le message reçu, comme la vraie page.
function ConnexionFactice() {
  const emplacement = useLocation()
  return (
    <>
      <h1>Connexion</h1>
      <p>{emplacement.state?.message ?? (emplacement.state?.sessionExpiree ? 'Session expirée' : '')}</p>
    </>
  )
}

// La page est entourée de RouteProtegee, comme dans App.jsx : c'est ainsi
// qu'on a trouvé le mauvais message affiché après la suppression du compte.
function afficherPage() {
  render(
    <MemoryRouter initialEntries={['/compte']}>
      <Routes>
        <Route path="/compte" element={<RouteProtegee enfant={<PageCompte />} />} />
        <Route path="/connexion" element={<ConnexionFactice />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PageCompte', () => {
  test('affiche le nom et l’email du compte, et le lien vers les droits RGPD', async () => {
    appelApi.mockResolvedValue(PROFIL)

    afficherPage()

    expect(await screen.findByText('Camille Martin')).toBeTruthy()
    expect(screen.getByText('camille@exemple.fr')).toBeTruthy()
    expect(appelApi).toHaveBeenCalledWith('/api/compte')
    const lien = screen.getByRole('link', { name: /Politique de confidentialité/ })
    expect(lien.getAttribute('href')).toBe('/confidentialite')
  })

  test('affiche une erreur si le profil ne peut pas être chargé', async () => {
    appelApi.mockRejectedValue(new Error('Impossible de joindre le serveur.'))

    afficherPage()

    expect((await screen.findByRole('alert')).textContent).toBe('Impossible de joindre le serveur.')
  })

  test('la suppression demande une confirmation et le mot de passe, puis ferme la session', async () => {
    appelApi.mockResolvedValueOnce(PROFIL).mockResolvedValueOnce({})
    afficherPage()
    await screen.findByText('Camille Martin')

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer mon compte et mes données' }))
    await userEvent.type(screen.getByLabelText('Mot de passe (confirmation)'), 'MotDePasse-123')
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer définitivement' }))

    expect(appelApi).toHaveBeenLastCalledWith('/api/compte', {
      method: 'DELETE',
      body: JSON.stringify({ motDePasse: 'MotDePasse-123' }),
    })
    expect(sessionValide()).toBe(false)
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeTruthy()
    // Le bon message, et non « session expirée » (bug corrigé : ordre navigation / fermeture).
    expect(screen.getByText('Votre compte et toutes vos données ont été supprimés.')).toBeTruthy()
  })

  test('Annuler referme la confirmation sans rien supprimer', async () => {
    appelApi.mockResolvedValue(PROFIL)
    afficherPage()
    await screen.findByText('Camille Martin')

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer mon compte et mes données' }))
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.queryByLabelText('Mot de passe (confirmation)')).toBeNull()
    expect(appelApi).toHaveBeenCalledTimes(1)
    // Le focus revient sur le bouton d'ouverture : l'utilisateur au clavier ne perd pas sa place.
    expect(document.activeElement.textContent).toBe('Supprimer mon compte et mes données')
  })

  test('mot de passe incorrect : le champ est marqué en erreur et relié au message', async () => {
    appelApi.mockResolvedValueOnce(PROFIL).mockRejectedValueOnce(new Error('Mot de passe incorrect'))
    afficherPage()
    await screen.findByText('Camille Martin')

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer mon compte et mes données' }))
    await userEvent.type(screen.getByLabelText('Mot de passe (confirmation)'), 'Mauvais-123456')
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer définitivement' }))

    const champ = screen.getByLabelText('Mot de passe (confirmation)')
    const message = await screen.findByRole('alert')
    expect(message.textContent).toBe('Mot de passe incorrect')
    expect(champ.getAttribute('aria-invalid')).toBe('true')
    expect(champ.getAttribute('aria-describedby')).toBe(message.id)
    expect(sessionValide()).toBe(true)
  })

  test('panne du serveur : message affiché, sans marquer le mot de passe en erreur', async () => {
    appelApi.mockResolvedValueOnce(PROFIL).mockRejectedValueOnce(new Error('Impossible de joindre le serveur.'))
    afficherPage()
    await screen.findByText('Camille Martin')

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer mon compte et mes données' }))
    await userEvent.type(screen.getByLabelText('Mot de passe (confirmation)'), 'MotDePasse-123')
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer définitivement' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Impossible de joindre le serveur.')
    expect(screen.getByLabelText('Mot de passe (confirmation)').getAttribute('aria-invalid')).toBeNull()
  })
})
