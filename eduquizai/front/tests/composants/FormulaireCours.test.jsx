// Tests du composant FormulaireCours (création et modification d'un cours) :
// contrôles avant envoi, messages d'erreur et accessibilité des champs fautifs.

import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FormulaireCours from '../../src/composants/FormulaireCours'

afterEach(cleanup)

function afficher(onEnregistrer = vi.fn(), valeursInitiales) {
  render(
    <FormulaireCours
      libelleEnvoi="Enregistrer le cours"
      onEnregistrer={onEnregistrer}
      valeursInitiales={valeursInitiales}
    />,
  )
  return onEnregistrer
}

describe('FormulaireCours', () => {
  test('envoie le titre nettoyé et le contenu au parent', async () => {
    const onEnregistrer = afficher(vi.fn().mockResolvedValue())

    await userEvent.type(screen.getByLabelText('Titre'), '  Biologie  ')
    await userEvent.type(screen.getByLabelText('Contenu du cours (Markdown accepté)'), 'La cellule.')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le cours' }))

    expect(onEnregistrer).toHaveBeenCalledWith({ titre: 'Biologie', contenuTexte: 'La cellule.' })
  })

  test('un titre vide n\'est pas envoyé : le champ est marqué en erreur et relié au message', async () => {
    const onEnregistrer = afficher()

    // Contenu seul (le titre reste vide) ; on contourne la validation native du navigateur.
    await userEvent.type(screen.getByLabelText('Contenu du cours (Markdown accepté)'), 'Texte.')
    screen.getByLabelText('Titre').removeAttribute('required')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le cours' }))

    expect(onEnregistrer).not.toHaveBeenCalled()
    const champTitre = screen.getByLabelText('Titre')
    expect(champTitre.getAttribute('aria-invalid')).toBe('true')
    expect(champTitre.getAttribute('aria-describedby')).toBe('erreur-cours')
    expect(screen.getByRole('alert').textContent).toBe('Le titre et le contenu ne doivent pas être vides.')
  })

  test('une erreur de l\'API sur le titre marque le champ titre', async () => {
    afficher(vi.fn().mockRejectedValue(new Error('Le titre doit contenir entre 1 et 200 caractères')))

    await userEvent.type(screen.getByLabelText('Titre'), 'Biologie')
    await userEvent.type(screen.getByLabelText('Contenu du cours (Markdown accepté)'), 'La cellule.')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le cours' }))

    expect(await screen.findByRole('alert')).toBeDefined()
    expect(screen.getByLabelText('Titre').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByLabelText('Contenu du cours (Markdown accepté)').getAttribute('aria-invalid')).toBeNull()
  })

  test('en modification, les champs sont préremplis', () => {
    afficher(vi.fn(), { titre: 'Histoire', contenu: 'La Révolution.' })

    expect(screen.getByLabelText('Titre').value).toBe('Histoire')
    expect(screen.getByLabelText('Contenu du cours (Markdown accepté)').value).toBe('La Révolution.')
  })
})
