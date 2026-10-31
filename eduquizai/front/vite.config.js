import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// VITE_USE_POLLING est défini par docker-compose.yml : le front tourne alors dans Docker.
const DANS_DOCKER = process.env.VITE_USE_POLLING === 'true'

export default defineConfig({
  plugins: [react()],
  server: {
    // Les appels /api sont transmis au back : par son nom de service dans Docker,
    // par localhost hors de Docker.
    proxy: {
      '/api': {
        target: DANS_DOCKER ? 'http://back:3000' : 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    // Les événements de fichiers Windows ne traversent pas toujours le montage Docker :
    // Vite vérifie alors lui-même les fichiers toutes les 500 ms.
    watch: { usePolling: DANS_DOCKER, interval: 500 },
  },

  // Tests de composants et de pages React (Vitest) : rendu dans un faux navigateur
  // (jsdom). Seuls tests/composants et tests/pages sont concernés ; les autres tests du front
  // (fonctions sans React) tournent avec le lanceur intégré à Node.
  test: {
    environment: 'jsdom',
    include: ['tests/composants/**/*.test.jsx', 'tests/pages/**/*.test.jsx'],
  },
})
