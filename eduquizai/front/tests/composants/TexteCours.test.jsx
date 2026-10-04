// Tests du composant TexteCours : rendu Markdown d'un cours, hiérarchie des
// titres et liens externes.

import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import TexteCours from '../../src/composants/TexteCours'

afterEach(cleanup)

describe('TexteCours', () => {
  test('décale les titres du Markdown d\'un niveau : « # » ne crée jamais un second <h1>', () => {
    render(<TexteCours texte={'# Chapitre\n\n## Partie'} />)

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Chapitre')
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('Partie')
  })

  test('annonce un lien vers un autre site et ne transmet pas l\'adresse du cours', () => {
    render(<TexteCours texte="[Wikipédia](https://fr.wikipedia.org)" />)

    const lien = screen.getByRole('link')
    expect(lien.textContent).toBe('Wikipédia (site externe)')
    expect(lien.getAttribute('rel')).toBe('noopener noreferrer')
  })

  test('n\'exécute jamais le HTML écrit dans un cours', () => {
    const { container } = render(<TexteCours texte={'<script>alert(1)</script>\n\nTexte'} />)

    expect(container.querySelector('script')).toBeNull()
  })
})
