import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, '../dist')
const PORT = Number(process.env.PORT) || 4173
const HOST = process.env.HOST || '0.0.0.0'

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
    isHashed: filePath.includes('/assets/'),
  }

  fileCache.set(filePath, record)
  return record
}

const server = http.createServer((req, res) => {
  const urlPath = req.url?.split('?')[0] || '/'
  let safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '')
  let filePath = path.join(DIST_DIR, safePath)

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html')
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404)
    return res.end('Not found')
  }

  const file = getCachedFile(filePath)

  if (req.headers['if-none-match'] === file.etag) {
    res.writeHead(304)
    return res.end()
  }

  const headers = {
    'Content-Type': file.contentType,
    'ETag': file.etag,
    'Vary': 'Accept-Encoding',
    'Cache-Control': file.isHashed
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
  }

  const accept = req.headers['accept-encoding'] || ''

  if (file.br && accept.includes('br')) {
    headers['Content-Encoding'] = 'br'
    headers['Content-Length'] = file.br.length
    res.writeHead(200, headers)
    res.end(file.br)
  } else if (file.gzip && accept.includes('gzip')) {
    headers['Content-Encoding'] = 'gzip'
    headers['Content-Length'] = file.gzip.length
    res.writeHead(200, headers)
    res.end(file.gzip)
  } else {
    headers['Content-Length'] = file.raw.length
    res.writeHead(200, headers)
    res.end(file.raw)
  }
})

server.listen(PORT, HOST, () => {
  console.log(`Optimized high-performance production server listening at http://${HOST}:${PORT}/`)
})
