import { expect } from '@playwright/test'

// Kunci API Groq tinggal sebagai file lokal di server; browser tidak pernah
// memegang kuncinya. Tes memalsukan endpoint lokal itu per konteks browser,
// sehingga tidak ada state server yang dibagi antar berkas tes.

// Melaporkan ke aplikasi apakah kunci Groq sudah terkonfigurasi.
export const mockGroqStatus = (page, { enabled = true } = {}) =>
  page.route('**/api/groq-key', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        configured: enabled,
        masked: enabled ? 'gsk_mock...test' : '',
      }),
    })
  })

// Aplikasi memanggil Groq lewat proxy lokal di /api/groq/chat.
export const mockGroqChat = (page, handler) =>
  page.route('**/api/groq/chat', handler)

// Membuat Groq gagal supaya mesin bawaan aplikasi yang menjawab.
export const mockGroqOffline = (page) =>
  page.route('**/api/groq/chat', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'Groq offline (tes)' } }),
    })
  })

// Setup default untuk tes yang memakai mesin bawaan: asisten aktif, Groq offline.
export const useLocalAssistant = async (page) => {
  await mockGroqStatus(page, { enabled: true })
  await mockGroqOffline(page)
}

// Menyimpan kunci sungguhan ke berkas lokal server, untuk tes Groq langsung.
export const storeRealKey = async (page, key) => {
  const res = await page.request.post('http://127.0.0.1:4173/api/groq-key', { data: { key } })
  expect(res.ok()).toBe(true)
}

export const removeRealKey = async (page) => {
  await page.request.post('http://127.0.0.1:4173/api/groq-key', { data: { key: '' } })
}

export const expectKeyEndpoint = async (page, configured) => {
  const res = await page.request.get('http://127.0.0.1:4173/api/groq-key')
  expect((await res.json()).configured).toBe(configured)
}
