// Tests de la page d'inscription : champs propres à l'inscription, corps
// envoyé à l'API simulée et erreurs reliées aux champs (RGAA 11.10).
import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import appelApi from '../../src/api/client'
import PageConnexion from '../../src/pages/PageConnexion'
import PageInscription from '../../src/pages/PageInscription'
import { definirSession, sessionValide } from '../../src/auth/session'

vi.mock('../../src/api/client', () => ({ default: vi.fn() }))

const UNE_HEURE_MS = 3600000

afterEach(() => {
  cleanup()
  definirSession(null)
  localStorage.clear()
  vi.resetAllMocks()
})

function afficherPage() {
  render(
    <MemoryRouter initialEntries={['/inscription']}>
      <Routes>
        <Route path="/connexion" element={<PageConnexion />} />
        <Route path="/inscription" element={<PageInscription />} />
        <Route path="/dashboard" element={<h1>Tableau de bord</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function remplirFormulaire(nom) {
  await userEvent.type(screen.getByLabelText('Nom'), nom)
  await userEvent.type(screen.getByLabelText('Adresse email'), 'camille@exemple.fr')
  await userEvent.type(screen.getByLabelText('Mot de passe'), 'MotDePasse-123')
  await userEvent.click(screen.getByRole('checkbox'))
}

describe('PageInscription', () => {
  test('affiche le nom, l’aide du mot de passe et le consentement non coché', () => {
    afficherPage()

    expect(screen.getByRole('link', { name: 'Inscription' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByLabelText('Nom')).toBeTruthy()
    expect(screen.getByRole('checkbox').checked).toBe(false)
    expect(screen.getByLabelText('Mot de passe').getAttribute('aria-describedby')).toBe('aide-mot-de-passe')
    // Même minimum que le back (OWASP ASVS) : le navigateur bloque avant l'envoi.
    expect(screen.getByLabelText('Mot de passe').getAttribute('minlength')).toBe('12')
    expect(screen.getByText(/Au moins 12 caractères/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Créer mon compte' })).toBeTruthy()
  })

  test('l’onglet Connexion ramène à la page de connexion', async () => {
    afficherPage()

    await userEvent.click(screen.getByRole('link', { name: 'Connexion' }))

    expect(screen.queryByLabelText('Nom')).toBeNull()
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeTruthy()
  })

  test('envoie le nom, l’email, le mot de passe et le consentement, puis ouvre le tableau de bord', async () => {
    appelApi.mockResolvedValue({ id_utilisateur: 8, expiration: Date.now() + UNE_HEURE_MS })
    afficherPage()

    await remplirFormulaire(' Camille ')
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    expect(appelApi).toHaveBeenCalledWith('/api/auth/inscription', {
      method: 'POST',
      body: JSON.stringify({
        nom: 'Camille',
        email: 'camille@exemple.fr',
        motDePasse: 'MotDePasse-123',
        consentementRgpd: true,
      }),
    })
    expect(sessionValide()).toBe(true)
    expect(await screen.findByRole('heading', { name: 'Tableau de bord' })).toBeTruthy()
  })

  test('erreur sur le nom : seul le champ Nom est marqué, l’aide reste reliée au mot de passe', async () => {
    appelApi.mockRejectedValue(new Error('Le nom est obligatoire'))
    afficherPage()

    await remplirFormulaire('A')
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    await screen.findByRole('alert')
    expect(screen.getByLabelText('Nom').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByLabelText('Nom').getAttribute('aria-describedby')).toBe('erreur-connexion')
    expect(screen.getByLabelText('Adresse email').getAttribute('aria-invalid')).toBeNull()
    expect(screen.getByLabelText('Mot de passe').getAttribute('aria-describedby')).toBe('aide-mot-de-passe')
  })

  test('erreur sur le mot de passe : l’aide et le message sont tous deux reliés au champ', async () => {
    appelApi.mockRejectedValue(new Error('Le mot de passe doit contenir au moins 12 caractères'))
    afficherPage()

    await remplirFormulaire('Camille')
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    await screen.findByRole('alert')
    const champ = screen.getByLabelText('Mot de passe')
    expect(champ.getAttribute('aria-invalid')).toBe('true')
    expect(champ.getAttribute('aria-describedby')).toBe('aide-mot-de-passe erreur-connexion')
  })
})
