import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Les événements de fichiers Windows ne traversent pas toujours le montage Docker.
  server: { watch: { usePolling: process.env.VITE_USE_POLLING === 'true', interval: 500 } },
  // Tests de composants React (Vitest) : rendu dans un faux navigateur (jsdom).
  // Seul le dossier tests/composants est concerné ; les autres tests du front
  // (fonctions sans React) tournent avec le lanceur intégré à Node.
  test: {
    environment: 'jsdom',
    include: ['tests/composants/**/*.test.jsx'],
  },
})
