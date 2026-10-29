// Tests de la page de connexion / inscription : onglets, affichage du mot de
// passe, erreurs reliées aux champs (RGAA 11.10) et envoi à l'API simulée.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import appelApi from '../../src/api/client'
import PageConnexion from '../../src/pages/PageConnexion'
import { definirSession, sessionValide } from '../../src/auth/session'

vi.mock('../../src/api/client', () => ({ default: vi.fn() }))

const UNE_HEURE_MS = 3600000

afterEach(() => {
  cleanup()
  definirSession(null)
  localStorage.clear()
  vi.resetAllMocks()
})

function afficherPage(adresse = '/connexion') {
  render(
    <MemoryRouter initialEntries={[adresse]}>
      <Routes>
        <Route path="/connexion" element={<PageConnexion />} />
        <Route path="/dashboard" element={<h1>Tableau de bord</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function remplirConnexion(email, motDePasse) {
  await userEvent.type(screen.getByLabelText('Adresse email'), email)
  await userEvent.type(screen.getByLabelText('Mot de passe'), motDePasse)
}

describe('PageConnexion', () => {
  test('affiche la connexion par défaut, sans nom ni consentement', () => {
    afficherPage()

    expect(screen.getByRole('button', { name: 'Connexion' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByLabelText('Nom')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeTruthy()
  })

  test('l’onglet Inscription ajoute le nom, l’aide du mot de passe et le consentement', async () => {
    afficherPage()

    await userEvent.click(screen.getByRole('button', { name: 'Inscription' }))

    expect(screen.getByLabelText('Nom')).toBeTruthy()
    expect(screen.getByRole('checkbox').checked).toBe(false)
    expect(screen.getByLabelText('Mot de passe').getAttribute('aria-describedby')).toBe('aide-mot-de-passe')
    expect(screen.getByRole('button', { name: 'Créer mon compte' })).toBeTruthy()
  })

  test('le bouton Afficher montre le mot de passe en clair, puis le masque', async () => {
    afficherPage()
    const champ = screen.getByLabelText('Mot de passe')

    await userEvent.click(screen.getByRole('button', { name: 'Afficher' }))

    expect(champ.getAttribute('type')).toBe('text')
    expect(screen.getByRole('button', { name: 'Masquer' }).getAttribute('aria-pressed')).toBe('true')

    await userEvent.click(screen.getByRole('button', { name: 'Masquer' }))

    expect(champ.getAttribute('type')).toBe('password')
  })

  test('connexion réussie : envoie l’email nettoyé, garde la session et ouvre le tableau de bord', async () => {
    appelApi.mockResolvedValue({ id_utilisateur: 7, expiration: Date.now() + UNE_HEURE_MS })
    afficherPage()

    await remplirConnexion('  prof@exemple.fr ', 'MotDePasse-123')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(appelApi).toHaveBeenCalledWith('/api/auth/connexion', {
      method: 'POST',
      body: JSON.stringify({ email: 'prof@exemple.fr', motDePasse: 'MotDePasse-123' }),
    })
    expect(sessionValide()).toBe(true)
    expect(await screen.findByRole('heading', { name: 'Tableau de bord' })).toBeTruthy()
  })

  test('inscription : envoie le nom, l’email, le mot de passe et le consentement', async () => {
    appelApi.mockResolvedValue({ id_utilisateur: 8, expiration: Date.now() + UNE_HEURE_MS })
    afficherPage('/connexion?onglet=inscription')

    await userEvent.type(screen.getByLabelText('Nom'), ' Camille ')
    await remplirConnexion('camille@exemple.fr', 'MotDePasse-123')
    await userEvent.click(screen.getByRole('checkbox'))
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
  })

  test('mot de passe incorrect : email et mot de passe marqués en erreur et reliés au message', async () => {
    appelApi.mockRejectedValue(new Error('Email ou mot de passe incorrect'))
    afficherPage()

    await remplirConnexion('prof@exemple.fr', 'mauvais')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    const message = await screen.findByRole('alert')
    expect(message.textContent).toBe('Email ou mot de passe incorrect')
    expect(document.activeElement).toBe(message)
    for (const libelle of ['Adresse email', 'Mot de passe']) {
      const champ = screen.getByLabelText(libelle)
      expect(champ.getAttribute('aria-invalid')).toBe('true')
      expect(champ.getAttribute('aria-describedby')).toBe('erreur-connexion')
    }
    expect(sessionValide()).toBe(false)
  })

  test('erreur sur le nom à l’inscription : seul le champ Nom est marqué', async () => {
    appelApi.mockRejectedValue(new Error('Le nom est obligatoire'))
    afficherPage('/connexion?onglet=inscription')

    await userEvent.type(screen.getByLabelText('Nom'), 'A')
    await remplirConnexion('a@exemple.fr', 'MotDePasse-123')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    await screen.findByRole('alert')
    expect(screen.getByLabelText('Nom').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByLabelText('Adresse email').getAttribute('aria-invalid')).toBeNull()
    expect(screen.getByLabelText('Mot de passe').getAttribute('aria-describedby')).toBe('aide-mot-de-passe')
  })

  test('refuse un mot de passe de plus de 72 octets sans appeler l’API', async () => {
    afficherPage()

    // 19 emojis = 38 caractères mais 76 octets UTF-8.
    await remplirConnexion('prof@exemple.fr', '😀'.repeat(19))
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(screen.getByRole('alert').textContent).toContain('72 octets')
    expect(screen.getByLabelText('Mot de passe').getAttribute('aria-invalid')).toBe('true')
    expect(appelApi).not.toHaveBeenCalled()
  })

  test('déjà connecté : redirigé vers le tableau de bord', () => {
    definirSession({ id_utilisateur: 7, expiration: Date.now() + UNE_HEURE_MS })

    afficherPage()

    expect(screen.getByRole('heading', { name: 'Tableau de bord' })).toBeTruthy()
  })
})
