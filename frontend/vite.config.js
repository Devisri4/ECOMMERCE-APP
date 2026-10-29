import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// Link-preview tags in index.html need the site's absolute URL (%VITE_SITE_URL%). On Vercel it defaults to the
// project's production domain, so no extra setting is needed; an explicit VITE_SITE_URL still wins.
if (!process.env.VITE_SITE_URL && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  process.env.VITE_SITE_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server : {port:5173}
})
