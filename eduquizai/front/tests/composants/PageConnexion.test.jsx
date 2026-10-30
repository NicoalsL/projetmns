// Tests de la page de connexion : onglets, affichage du mot de passe, erreurs
// reliées aux champs (RGAA 11.10) et envoi à l'API simulée.
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

function afficherPage(adresse = '/connexion') {
  render(
    <MemoryRouter initialEntries={[adresse]}>
      <Routes>
        <Route path="/connexion" element={<PageConnexion />} />
        <Route path="/inscription" element={<PageInscription />} />
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
  test('affiche l’email et le mot de passe, sans nom ni consentement', () => {
    afficherPage()

    expect(screen.getByRole('link', { name: 'Connexion' }).getAttribute('aria-current')).toBe('page')
    expect(screen.queryByLabelText('Nom')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getByLabelText('Mot de passe').getAttribute('aria-describedby')).toBeNull()
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeTruthy()
  })

  test('l’onglet Inscription mène à la page d’inscription', async () => {
    afficherPage()

    await userEvent.click(screen.getByRole('link', { name: 'Inscription' }))

    expect(screen.getByRole('link', { name: 'Inscription' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByLabelText('Nom')).toBeTruthy()
  })

  test('une ancienne adresse ?onglet=inscription redirige vers l’inscription', () => {
    afficherPage('/connexion?onglet=inscription')

    expect(screen.getByLabelText('Nom')).toBeTruthy()
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

  test('refuse un mot de passe de plus de 72 octets sans appeler l’API', async () => {
    afficherPage()

    // 19 emojis = 38 caractères mais 76 octets UTF-8.
    await remplirConnexion('prof@exemple.fr', '😀'.repeat(19))
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(screen.getByRole('alert').textContent).toContain('72 octets')
    expect(screen.getByLabelText('Mot de passe').getAttribute('aria-invalid')).toBe('true')
    expect(appelApi).not.toHaveBeenCalled()
  })

  test('un double-clic n’envoie la demande qu’une seule fois', async () => {
    // Réponse jamais reçue : l'envoi reste en cours pendant le second clic.
    appelApi.mockReturnValue(new Promise(() => {}))
    afficherPage()
    await remplirConnexion('prof@exemple.fr', 'MotDePasse-123')
    const bouton = screen.getByRole('button', { name: 'Se connecter' })

    await userEvent.dblClick(bouton)

    expect(appelApi).toHaveBeenCalledTimes(1)
  })

  test('déjà connecté : redirigé vers le tableau de bord', () => {
    definirSession({ id_utilisateur: 7, expiration: Date.now() + UNE_HEURE_MS })

    afficherPage()

    expect(screen.getByRole('heading', { name: 'Tableau de bord' })).toBeTruthy()
  })
})
