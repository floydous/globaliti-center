import { defineConfig } from '@playwright/test'

// `npm test` membangun aplikasi lalu menjalankan seluruh pengujian terhadap server produksi lokal.
export default defineConfig({
  testDir: 'tests',
  webServer: {
    command: 'npm run build && node scripts/serve.mjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
