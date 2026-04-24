import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev-time proxy so the browser can reach ORCA without CORS issues.
// In production, the matching route is served by the Cloudflare Worker
// at src/worker/index.ts.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/models': {
        target: 'https://orca.orb.town',
        changeOrigin: true,
        rewrite: () => '/api/preview/v2/models',
        secure: true,
      },
    },
  },
})
