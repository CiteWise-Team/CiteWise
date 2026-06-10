import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the merged Express backend (api/), port 8081.
      '/api': 'http://localhost:8081',
    },
  },
})
