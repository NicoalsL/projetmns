import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import appelApi from '../../src/api/client'
import AvertissementSession from '../../src/composants/AvertissementSession'
import { definirSession, obtenirSession } from '../../src/auth/session'

vi.mock('../../src/api/client', () => ({ default: vi.fn() }))
const MINUTE = 60000
function fixerSession(minutes) {
  definirSession({ id_utilisateur: 7, expiration: Date.now() + minutes * MINUTE })
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => {
  cleanup()
  definirSession(null)
  vi.useRealTimers()
  localStorage.clear()
  vi.resetAllMocks()
})

describe('AvertissementSession', () => {
  test('n’affiche rien avant la période d’avertissement', () => {
    fixerSession(10)
    render(<AvertissementSession jeton={obtenirSession()} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
  test('avertit deux minutes avant expiration', () => {
    fixerSession(10)
    render(<AvertissementSession jeton={obtenirSession()} />)
    act(() => vi.advanceTimersByTime(8 * MINUTE + 1000))
    expect(screen.getByRole('alert').textContent).toContain('Votre session expire')
  })
  test('la prolongation actualise les informations sans exposer de JWT', async () => {
    fixerSession(1)
    appelApi.mockResolvedValue({ id_utilisateur: 7, expiration: Date.now() + 2 * 60 * MINUTE })
    render(<AvertissementSession jeton={obtenirSession()} />)
    act(() => vi.advanceTimersByTime(0))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Rester connecté' })))
    expect(appelApi).toHaveBeenCalledWith('/api/compte/session', { method: 'POST' })
    expect(obtenirSession().expiration).toBeGreaterThan(Date.now() + 60 * MINUTE)
    expect(localStorage.getItem('jeton')).toBeNull()
  })
  test('montre une erreur si la prolongation échoue', async () => {
    fixerSession(1)
    appelApi.mockRejectedValue(new Error('Serveur indisponible'))
    render(<AvertissementSession jeton={obtenirSession()} />)
    act(() => vi.advanceTimersByTime(0))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Rester connecté' })))
    expect(screen.getByRole('alert').textContent).toContain('Serveur indisponible')
  })
})
