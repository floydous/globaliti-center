import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleGroqApi } from './scripts/groq-key-store.mjs'
import { handleSqliteApi } from './scripts/sqlite-store.mjs'

// Endpoint lokal untuk SQLite dan kunci API Groq.
const localBackendApi = (): Plugin => ({
  name: 'globaliti-local-backend-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const pathname = (req.url || '').split('?')[0]
      if (pathname.startsWith('/api/db')) {
        if (await handleSqliteApi(req, res, pathname)) return
      }
      if (pathname.startsWith('/api/groq')) {
        if (await handleGroqApi(req, res, pathname)) return
      }
      next()
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    localBackendApi(),
  ],
  server: {
    // Hanya mesin ini; untuk perangkat lain jalankan `npm run dev -- --host` dengan sadar
    host: 'localhost',
    port: 5173,
  },
})
