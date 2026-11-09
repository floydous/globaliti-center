import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Kunci API Groq hidup sebagai file di mesin ini, bukan di localStorage browser.
// Lokasi bisa dipindah lewat env var untuk mesin yang tidak menulis ke repo.
// Pada Vercel / serverless environment, filesystem selain /tmp bersifat read-only.
export const KEY_FILE = process.env.GLOBALITI_GROQ_KEY_FILE
  ? path.resolve(process.env.GLOBALITI_GROQ_KEY_FILE)
  : (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
    ? path.resolve('/tmp', 'groq-key.txt')
    : path.resolve(__dirname, '../.globaliti/groq-key.txt')

const SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const KEY_PATTERN = /^gsk_[A-Za-z0-9_-]{8,}$/
const MODEL_PATTERN = /^[A-Za-z0-9._/-]{1,64}$/
const MAX_BODY_BYTES = 1024 * 1024
const MAX_MESSAGES = 40
const MAX_COMPLETION_TOKENS = 4096
const UPSTREAM_TIMEOUT_MS = 60_000
const TOKEN_HEADER = 'x-globaliti-token'
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]']

// Rantai model resmi Groq, dari yang paling pintar ke paling dasar.
const TEST_MODELS = [
  'qwen/qwen3.8-27b',
  'groq/compound-mini',
  'groq/compound',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'allam-2-7b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
]

export function readKey() {
  if (process.env.GROQ_API_KEY && KEY_PATTERN.test(process.env.GROQ_API_KEY.trim())) {
    return process.env.GROQ_API_KEY.trim()
  }
  try {
    const key = fs.readFileSync(KEY_FILE, 'utf8').trim()
    return KEY_PATTERN.test(key) ? key : ''
  } catch {
    return ''
  }
}

export function writeKey(key) {
  fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true })
  fs.writeFileSync(KEY_FILE, key.trim(), { encoding: 'utf8', mode: 0o600 })
}

export function clearKey() {
  try {
    fs.unlinkSync(KEY_FILE)
  } catch {
    // berkas tidak ada, tidak ada yang perlu dihapus
  }
}

export function maskKey(key) {
  return key ? `${key.slice(0, 4)}...${key.slice(-4)}` : ''
}

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const readBody = async (req) => {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') return req.body
    if (Buffer.isBuffer(req.body)) return req.body.toString('utf8')
    return JSON.stringify(req.body)
  }
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'Permintaan terlalu besar'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const sendJson = (res, status, payload) => {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(status).json(payload)
  }
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(payload))
}

const hostnameOf = (host = '') => String(host).toLowerCase().replace(/:\d+$/, '')

const sameToken = (given, expected) => {
  const a = Buffer.from(String(given))
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Endpoint ini memegang kunci berbayar, jadi tidak pernah terbuka untuk sembarang pengunjung:
// - GLOBALITI_API_TOKEN diatur: setiap permintaan harus membawa token itu.
// - Serverless tanpa token: ditolak, karena alamatnya publik.
// - Lokal tanpa token: hanya host lokal (atau GLOBALITI_ALLOWED_HOSTS) dan hanya dari
//   halaman aplikasi sendiri, supaya situs lain di browser tidak bisa memakainya.
// Mengembalikan null bila boleh, atau { status, message } bila ditolak.
export function authorize(req) {
  const token = (process.env.GLOBALITI_API_TOKEN || '').trim()
  if (token) {
    return sameToken(req.headers[TOKEN_HEADER] || '', token)
      ? null
      : { status: 401, message: 'Token akses server salah atau belum diisi di Pengaturan' }
  }
  if (SERVERLESS) {
    return { status: 503, message: 'GLOBALITI_API_TOKEN belum diatur di server, asisten AI dinonaktifkan' }
  }
  const extra = (process.env.GLOBALITI_ALLOWED_HOSTS || '').split(',').map((host) => host.trim().toLowerCase()).filter(Boolean)
  if (![...LOCAL_HOSTS, ...extra].includes(hostnameOf(req.headers.host))) {
    return { status: 403, message: 'Alamat akses tidak diizinkan. Tambahkan ke GLOBALITI_ALLOWED_HOSTS atau atur GLOBALITI_API_TOKEN' }
  }
  const origin = req.headers.origin
  if (origin) {
    let sameOrigin = false
    try {
      sameOrigin = new URL(origin).host.toLowerCase() === String(req.headers.host).toLowerCase()
    } catch {
      // Origin tidak valid dianggap lintas situs
    }
    if (!sameOrigin) return { status: 403, message: 'Permintaan lintas situs ditolak' }
  }
  return null
}

// Hanya meneruskan bentuk permintaan yang dipakai aplikasi, dengan batas ukuran jawaban,
// supaya proxy tidak bisa dipakai untuk pemakaian kuota di luar asisten toko.
function normalizeChatBody(raw) {
  let body
  try {
    body = JSON.parse(raw || '{}')
  } catch {
    throw new HttpError(400, 'Permintaan tidak valid')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Permintaan tidak valid')
  if (typeof body.model !== 'string' || !MODEL_PATTERN.test(body.model)) throw new HttpError(400, 'Model tidak valid')
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    throw new HttpError(400, 'Jumlah pesan tidak valid')
  }
  for (const key of ['max_tokens', 'max_completion_tokens']) {
    if (key in body) body[key] = Math.min(Math.max(1, Math.floor(Number(body[key])) || 1), MAX_COMPLETION_TOKENS)
  }
  if (!('max_tokens' in body) && !('max_completion_tokens' in body)) body.max_tokens = MAX_COMPLETION_TOKENS
  return JSON.stringify(body)
}

async function handleRequest(req, res, pathname) {
  if (pathname === '/api/groq-key' && req.method === 'GET') {
    const key = readKey()
    sendJson(res, 200, { configured: Boolean(key), masked: maskKey(key) })
    return true
  }

  if (pathname === '/api/groq-key' && req.method === 'POST') {
    let payload = {}
    try {
      payload = JSON.parse((await readBody(req)) || '{}')
    } catch (error) {
      if (error instanceof HttpError) throw error
      throw new HttpError(400, 'Permintaan tidak valid')
    }
    const key = String(payload.key || '').trim()
    if (!key) {
      clearKey()
      sendJson(res, 200, { ok: true, configured: false, masked: '' })
      return true
    }
    if (!KEY_PATTERN.test(key)) {
      throw new HttpError(400, 'Format kunci Groq tidak valid (harus diawali gsk_)')
    }
    writeKey(key)
    sendJson(res, 200, { ok: true, configured: true, masked: maskKey(key) })
    return true
  }

  if (pathname === '/api/groq/chat' && req.method === 'POST') {
    const key = readKey()
    if (!key) throw new HttpError(401, 'Kunci API Groq belum diatur di Pengaturan')
    const body = normalizeChatBody(await readBody(req))
    const abort = new AbortController()
    res.on('close', () => abort.abort())
    let upstream
    try {
      upstream = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.any([abort.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]),
      })
    } catch {
      throw new HttpError(502, 'Gagal menghubungi Groq')
    }
    // Alirkan jawaban Groq apa adanya supaya streaming SSE di browser tetap jalan.
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    })
    if (upstream.body) {
      Readable.fromWeb(upstream.body).on('error', () => res.end()).pipe(res)
    } else {
      res.end()
    }
    return true
  }

  if (pathname === '/api/groq/test' && req.method === 'POST') {
    let key = readKey()
    try {
      const payload = JSON.parse((await readBody(req)) || '{}')
      const candidate = String(payload.key || '').trim()
      if (candidate) key = candidate
    } catch (error) {
      if (error instanceof HttpError) throw error
      // badan tidak valid, pakai kunci yang tersimpan
    }
    if (!key) throw new HttpError(400, 'Masukkan kunci API terlebih dahulu.')
    let lastErr = ''
    for (const model of TEST_MODELS) {
      try {
        const upstream = await fetch(GROQ_ENDPOINT, {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: 'tes koneksi' }], max_tokens: 5 }),
          signal: AbortSignal.timeout(15_000),
        })
        if (upstream.ok) {
          sendJson(res, 200, { ok: true, model })
          return true
        }
        const body = await upstream.json().catch(() => null)
        lastErr = body?.error?.message || `HTTP ${upstream.status}`
      } catch (error) {
        lastErr = error instanceof Error && error.name === 'TimeoutError' ? 'Groq tidak merespons' : 'Koneksi jaringan gagal'
      }
    }
    sendJson(res, 200, { ok: false, message: `Gagal terhubung ke Groq: ${lastErr}` })
    return true
  }

  return false
}

// Menangani seluruh endpoint lokal untuk asisten AI.
// Mengembalikan true bila request sudah dijawab, false bila bukan urusan API ini.
export async function handleGroqApi(req, res, pathname) {
  if (!pathname.startsWith('/api/groq')) return false
  try {
    const denied = authorize(req)
    if (denied) {
      sendJson(res, denied.status, { ok: false, message: denied.message, error: { message: denied.message } })
      return true
    }
    return await handleRequest(req, res, pathname)
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message = error instanceof HttpError ? error.message : 'Terjadi kesalahan pada server'
    if (res.headersSent) {
      res.end()
    } else {
      sendJson(res, status, { ok: false, message, error: { message } })
    }
    return true
  }
}
