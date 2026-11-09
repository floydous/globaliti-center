import { test, expect } from '@playwright/test'
import http from 'node:http'
import { spawn } from 'node:child_process'

// Permintaan mentah supaya header Host dan Origin bisa diatur, seperti penyerang di jaringan.
const raw = (port, { method = 'GET', path = '/', headers = {}, body } = {}) =>
  new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('error', reject)
    req.end(body)
  })

test.describe('Server produksi lokal', () => {
  test('setiap jawaban membawa header keamanan', async () => {
    const res = await raw(4173, { path: '/' })
    expect(res.status).toBe(200)
    expect(res.headers['content-security-policy']).toContain("default-src 'self'")
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
  })

  test('berkas di luar dist tidak bisa dibaca lewat path traversal', async () => {
    for (const path of ['/../package.json', '/..%2fpackage.json', '/%2e%2e/package.json', '/assets/../../package.json']) {
      const res = await raw(4173, { path })
      expect(res.text, path).not.toContain('"name": "globaliti-center"')
    }
  })

  test('endpoint kunci menolak host asing dan permintaan lintas situs', async () => {
    const foreignHost = await raw(4173, { path: '/api/groq-key', headers: { Host: 'evil.example' } })
    expect(foreignHost.status).toBe(403)

    const crossSite = await raw(4173, {
      method: 'POST',
      path: '/api/groq-key',
      headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'gsk_attacker_controlled_key' }),
    })
    expect(crossSite.status).toBe(403)
    const status = await raw(4173, { path: '/api/groq-key' })
    expect(JSON.parse(status.text).masked).not.toBe('gsk_..._key')
  })

  test('proxy chat menolak permintaan yang tidak wajar tanpa menjatuhkan server', async () => {
    const send = (body) => raw(4173, { method: 'POST', path: '/api/groq/chat', headers: { 'Content-Type': 'application/json' }, body })
    // Tanpa kunci tersimpan jawabannya 401; dengan kunci, bentuk yang tidak valid 400. Keduanya ditolak rapi.
    for (const body of ['{bukan json', JSON.stringify({ model: '../../etc', messages: [{ role: 'user', content: 'x' }] }), JSON.stringify({ model: 'allam-2-7b', messages: [] })]) {
      const res = await send(body)
      expect([400, 401]).toContain(res.status)
    }
    expect((await raw(4173, { path: '/' })).status).toBe(200)
  })

  test('dengan GLOBALITI_API_TOKEN, endpoint wajib membawa token yang benar', async () => {
    const port = 4199
    const server = spawn(process.execPath, ['scripts/serve.mjs'], {
      env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', GLOBALITI_API_TOKEN: 'token-uji-123', GLOBALITI_GROQ_KEY_FILE: 'test-results/none.txt' },
      stdio: 'ignore',
    })
    try {
      await expect.poll(async () => (await raw(port, { path: '/' }).catch(() => ({ status: 0 }))).status, { timeout: 10_000 }).toBe(200)
      expect((await raw(port, { path: '/api/groq-key' })).status).toBe(401)
      expect((await raw(port, { path: '/api/groq-key', headers: { 'x-globaliti-token': 'salah' } })).status).toBe(401)
      const ok = await raw(port, { path: '/api/groq-key', headers: { 'x-globaliti-token': 'token-uji-123' } })
      expect(ok.status).toBe(200)
      expect(JSON.parse(ok.text).configured).toBe(false)
    } finally {
      server.kill()
    }
  })
})
