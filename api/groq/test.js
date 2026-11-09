import { handleGroqApi } from '../../scripts/groq-key-store.mjs'

export default async function handler(req, res) {
  const pathname = (req.url || '/api/groq/test').split('?')[0]
  const handled = await handleGroqApi(req, res, pathname)
  if (!handled && !res.writableEnded) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: 'Endpoint tidak ditemukan' }))
  }
}
