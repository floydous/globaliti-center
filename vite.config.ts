import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleGroqApi } from './scripts/groq-key-store.mjs'

// Endpoint lokal untuk kunci API Groq. Sama seperti server produksi: kunci dibaca
// dan ditulis sebagai file di mesin ini, bukan disimpan di localStorage browser.
const groqKeyApi = (): Plugin => ({
  name: 'globaliti-groq-key-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const pathname = (req.url || '').split('?')[0]
      if (!pathname.startsWith('/api/groq')) return next()
      if (await handleGroqApi(req, res, pathname)) return
      next()
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    groqKeyApi(),
  ],
  server: {
    // Hanya mesin ini; untuk perangkat lain jalankan `npm run dev -- --host` dengan sadar
    host: 'localhost',
    port: 5173,
  },
})
