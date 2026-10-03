import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Les événements de fichiers Windows ne traversent pas toujours le montage Docker.
  server: { watch: { usePolling: process.env.VITE_USE_POLLING === 'true', interval: 500 } },
})
