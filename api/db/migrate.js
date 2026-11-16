import { handleSqliteApi } from '../../scripts/sqlite-store.mjs'

export default async function handler(req, res) {
  const pathname = (req.url || '/api/db/migrate').split('?')[0]
  const handled = await handleSqliteApi(req, res, pathname)
  if (!handled && !res.writableEnded) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: 'Endpoint tidak ditemukan' }))
  }
}
