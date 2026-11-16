import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { handleGroqApi } from './groq-key-store.mjs'
import { handleSqliteApi, performDailyBackup } from './sqlite-store.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, '../dist')
const PORT = Number(process.env.PORT) || 4173
// Hanya mesin ini yang bisa membuka aplikasi, kecuali HOST diubah dengan sengaja
// (mis. HOST=0.0.0.0 agar kasir lain di jaringan toko bisa mengakses).
const HOST = process.env.HOST || '127.0.0.1'

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
}

// Header keamanan untuk setiap jawaban. Aplikasi hanya memuat sumbernya sendiri dan
// berbicara hanya dengan server ini (Groq dipanggil lewat proxy lokal).
const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

const fileCache = new Map()

function getCachedFile(filePath) {
  const stat = fs.statSync(filePath)
  const cached = fileCache.get(filePath)
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached
  }

  const raw = fs.readFileSync(filePath)
  const ext = path.extname(filePath)
  const isCompressedType = !['.woff', '.woff2', '.png', '.webp', '.jpg', '.jpeg'].includes(ext)

  const gzip = isCompressedType ? zlib.gzipSync(raw, { level: 9 }) : null
  const br = isCompressedType ? zlib.brotliCompressSync(raw, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 6,
    },
  }) : null

  const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`

  const record = {
    mtimeMs: stat.mtimeMs,
    raw,
    gzip,
    br,
    etag,
    contentType: MIME_TYPES[ext] || 'application/octet-stream',
    isHashed: filePath.split(path.sep).includes('assets'),
  }

  fileCache.set(filePath, record)
  return record
}

// Mengubah alamat permintaan menjadi berkas di dalam dist, atau null bila mencoba keluar dari dist.
function resolveStaticPath(urlPath) {
  let decoded
  try {
    decoded = decodeURIComponent(urlPath)
  } catch {
    return null
  }
  if (decoded.includes('\0')) return null
  const filePath = path.resolve(DIST_DIR, `.${path.posix.normalize(`/${decoded}`)}`)
  return filePath === DIST_DIR || filePath.startsWith(DIST_DIR + path.sep) ? filePath : null
}

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...headers })
  res.end(body)
}

async function handle(req, res) {
  const urlPath = req.url?.split('?')[0] || '/'

  if (await handleSqliteApi(req, res, urlPath)) return
  if (await handleGroqApi(req, res, urlPath)) return

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' })
  }

  let filePath = resolveStaticPath(urlPath)
  if (!filePath) return send(res, 400, 'Bad request')

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html')
  }

  if (!fs.existsSync(filePath)) {
    return send(res, 404, 'Not found')
  }

  const file = getCachedFile(filePath)

  if (req.headers['if-none-match'] === file.etag) {
    res.writeHead(304, SECURITY_HEADERS)
    return res.end()
  }

  const headers = {
    ...SECURITY_HEADERS,
    'Content-Type': file.contentType,
    'ETag': file.etag,
    'Vary': 'Accept-Encoding',
    'Cache-Control': file.isHashed
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
  }

  const accept = req.headers['accept-encoding'] || ''
  let body = file.raw

  if (file.br && accept.includes('br')) {
    headers['Content-Encoding'] = 'br'
    body = file.br
  } else if (file.gzip && accept.includes('gzip')) {
    headers['Content-Encoding'] = 'gzip'
    body = file.gzip
  }

  headers['Content-Length'] = body.length
  res.writeHead(200, headers)
  res.end(req.method === 'HEAD' ? undefined : body)
}

export function startServer(port = PORT, host = HOST) {
  const server = http.createServer((req, res) => {
    handle(req, res).catch(() => {
      if (res.headersSent) res.end()
      else send(res, 500, 'Internal server error')
    })
  })

  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(port, host, () => {
      try {
        performDailyBackup()
      } catch {}
      resolve(server)
    })
  })
}

// Pemeriksaan berkala cadangan harian setiap jam (untuk server yang berjalan terus-menerus)
setInterval(() => {
  try {
    performDailyBackup()
  } catch {}
}, 60 * 60 * 1000).unref()

const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('serve.mjs') ||
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
)

if (isDirectRun) {
  startServer(PORT, HOST).then(() => {
    console.log(`Globaliti server berjalan di http://${HOST}:${PORT}/`)
  }).catch((err) => {
    console.error('Gagal menjalankan server:', err)
    process.exit(1)
  })
}
