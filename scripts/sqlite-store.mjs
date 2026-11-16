import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { authorize } from './groq-key-store.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DB_FILE = process.env.GLOBALITI_DB_FILE
  ? path.resolve(process.env.GLOBALITI_DB_FILE)
  : (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
    ? path.resolve('/tmp', 'store.db')
    : path.resolve(__dirname, '../.globaliti/store.db')

export const BACKUP_DIR = path.resolve(path.dirname(DB_FILE), 'backups')

export const DAY_NAMES = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export const DEFAULT_PRODUCTS = [
  { id: 'p1', barcode: '8990000000010', name: 'Matcha Cup', price: 8000, stock: 24, reorderPoint: 8, active: true, image: '/products/histeria-matcha.webp' },
  { id: 'p2', barcode: '8990000000027', name: 'Vanilla Cone', price: 6000, stock: 18, reorderPoint: 8, active: true, image: '/products/vanilla.webp' },
  { id: 'p3', barcode: '8990000000034', name: 'Cokelat Stick', price: 5000, stock: 32, reorderPoint: 10, active: true, image: '/products/chocolate.webp' },
  { id: 'p4', barcode: '8990000000041', name: 'Strawberry Cup', price: 8000, stock: 11, reorderPoint: 8, active: true, image: '/products/strawberry-sundae.webp' },
  { id: 'p5', barcode: '8990000000058', name: 'Aice Chocolate Sundae', price: 8000, stock: 20, reorderPoint: 8, active: true, image: '/products/chocolate-sundae.webp' },
  { id: 'p6', barcode: '8990000000065', name: 'Aice Choco Meets Oats', price: 5000, stock: 25, reorderPoint: 8, active: true, image: '/products/choco-meets-oats.webp' },
  { id: 'p7', barcode: '8990000000072', name: 'Aice Coffee Crispy', price: 5000, stock: 22, reorderPoint: 8, active: true, image: '/products/cofee-crispy.webp' },
  { id: 'p8', barcode: '8990000000089', name: 'Aice Coklat 2 Colors', price: 3000, stock: 30, reorderPoint: 10, active: true, image: '/products/coklat-2-colors.webp' },
  { id: 'p9', barcode: '8990000000096', name: 'Aice Durian Asli', price: 10000, stock: 15, reorderPoint: 6, active: true, image: '/products/durian.webp' },
  { id: 'p10', barcode: '8990000000102', name: 'Aice Durian Cup', price: 12000, stock: 12, reorderPoint: 5, active: true, image: '/products/durian-cupp.webp' },
  { id: 'p11', barcode: '8990000000119', name: 'Aice Fruizzy', price: 4000, stock: 28, reorderPoint: 8, active: true, image: '/products/fruizzy.webp' },
  { id: 'p12', barcode: '8990000000126', name: 'Aice Histeria Vanilla', price: 8000, stock: 18, reorderPoint: 6, active: true, image: '/products/histeria.webp' },
  { id: 'p13', barcode: '8990000000133', name: 'Aice Klepon', price: 4000, stock: 24, reorderPoint: 8, active: true, image: '/products/klepon.webp' },
  { id: 'p14', barcode: '8990000000140', name: 'Aice Mango Stick', price: 4000, stock: 25, reorderPoint: 8, active: true, image: '/products/mango.webp' },
  { id: 'p15', barcode: '8990000000157', name: 'Aice Mango Hi-C', price: 4000, stock: 20, reorderPoint: 8, active: true, image: '/products/mango-hi-c-tanpa-fifa.webp' },
  { id: 'p16', barcode: '8990000000164', name: 'Aice Mango Slush Low Fat', price: 8000, stock: 16, reorderPoint: 6, active: true, image: '/products/mango-slush.webp' },
  { id: 'p17', barcode: '8990000000171', name: 'Aice Milk Melon', price: 4000, stock: 26, reorderPoint: 8, active: true, image: '/products/milk-melon-2.webp' },
  { id: 'p18', barcode: '8990000000188', name: 'Aice Milk Tea Boba', price: 6000, stock: 20, reorderPoint: 8, active: true, image: '/products/milktea-boba.webp' },
  { id: 'p19', barcode: '8990000000195', name: 'Aice Mochi Milk Tea', price: 4500, stock: 30, reorderPoint: 10, active: true, image: '/products/mochi-milk-tea.webp' },
  { id: 'p20', barcode: '8990000000201', name: 'Aice Nanas Stick', price: 3000, stock: 35, reorderPoint: 10, active: true, image: '/products/nanas.webp' },
  { id: 'p21', barcode: '8990000000218', name: 'Aice Sweet Peach', price: 4000, stock: 22, reorderPoint: 8, active: true, image: '/products/peach.webp' },
  { id: 'p22', barcode: '8990000000225', name: 'Aice Semangka', price: 3000, stock: 40, reorderPoint: 12, active: true, image: '/products/semangka-kemasan.webp' },
  { id: 'p23', barcode: '8990000000232', name: 'Aice Sesame Choco Crispy', price: 5000, stock: 18, reorderPoint: 6, active: true, image: '/products/sesame-choco-crispy.webp' },
  { id: 'p24', barcode: '8990000000249', name: 'Aice Shine Muscat', price: 4000, stock: 25, reorderPoint: 8, active: true, image: '/products/shine-muscat.png' },
  { id: 'p25', barcode: '8990000000256', name: 'Aice Jagung Sweet Corn', price: 4000, stock: 35, reorderPoint: 10, active: true, image: '/products/sweetcorn.webp' },
  { id: 'p26', barcode: '8990000000263', name: 'Aice Taro Crispy', price: 5000, stock: 20, reorderPoint: 8, active: true, image: '/products/taro-crispy-3.webp' },
  { id: 'p27', barcode: '8990000000270', name: 'Aice Vanilla Chocolate Cup', price: 7000, stock: 18, reorderPoint: 6, active: true, image: '/products/vanilla-chocolate-cup.webp' },
  { id: 'p28', barcode: '8990000000287', name: 'Aice Crispy Balls', price: 6000, stock: 24, reorderPoint: 8, active: true, image: '/products/aice-crispy-balls.webp' },
  { id: 'p29', barcode: '8990000000294', name: 'Aice Durian Crispy', price: 10000, stock: 15, reorderPoint: 6, active: true, image: '/products/aice-durian.webp' },
  { id: 'p30', barcode: '8990000000300', name: 'Aice Jeruk Stick', price: 3000, stock: 30, reorderPoint: 10, active: true, image: '/products/aice-jeruk.webp' },
  { id: 'p31', barcode: '8990000000317', name: 'Aice Miki-Miki', price: 3000, stock: 35, reorderPoint: 10, active: true, image: '/products/aice-miki-miki.webp' },
  { id: 'p32', barcode: '8990000000324', name: 'Aice Susu Segar Milk', price: 3000, stock: 28, reorderPoint: 10, active: true, image: '/products/aice-milk.webp' },
  { id: 'p33', barcode: '8990000000331', name: 'Aice Mung Bean (Kacang Hijau)', price: 4000, stock: 25, reorderPoint: 8, active: true, image: '/products/aice-moong-bean.webp' },
  { id: 'p34', barcode: '8990000000348', name: 'Aice Banana Crispy', price: 5000, stock: 22, reorderPoint: 8, active: true, image: '/products/banana.webp' },
  { id: 'p35', barcode: '8990000000355', name: 'Aice Blueberry Cookies', price: 5000, stock: 20, reorderPoint: 8, active: true, image: '/products/blueberry-cookies.webp' },
  { id: 'p36', barcode: '8990000000362', name: 'Aice Choco Crispy Stick', price: 5000, stock: 25, reorderPoint: 8, active: true, image: '/products/choco-crispy.webp' },
]

export const DEFAULT_SALES = [
  { id: 'TRX-0001', sample: true, date: new Date().toISOString().slice(0, 10), time: '08:14', items: [{ productId: 'p1', quantity: 2, price: 8000 }], total: 16000, payment: 'Tunai' },
  { id: 'TRX-0002', sample: true, date: new Date().toISOString().slice(0, 10), time: '09:02', items: [{ productId: 'p3', quantity: 1, price: 5000 }], total: 5000, payment: 'QRIS' },
  { id: 'TRX-0003', sample: true, date: new Date().toISOString().slice(0, 10), time: '10:26', items: [{ productId: 'p2', quantity: 3, price: 6000 }], total: 18000, payment: 'Tunai' },
]

export const DEFAULT_EXPENSES = [
  { id: 'exp-1', sample: true, label: 'Pembelian Kertas HVS A4 2 Rim', amount: 96000, date: new Date().toISOString().slice(0, 10) },
  { id: 'exp-2', sample: true, label: 'Cup dan Sedotan Es Krim', amount: 150000, date: new Date(Date.now() - 86400000).toISOString().slice(0, 10) },
]

const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024 // 10MB maximum JSON payload

let dbInstance = null

export function getDb() {
  if (dbInstance) return dbInstance
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
  const db = new DatabaseSync(DB_FILE)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec('PRAGMA busy_timeout = 5000;')
  initSchema(db)
  dbInstance = db
  return db
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      barcode TEXT NOT NULL,
      barcode_generated INTEGER NOT NULL DEFAULT 0,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL,
      reorder_point INTEGER NOT NULL DEFAULT 5,
      active INTEGER NOT NULL DEFAULT 1,
      image TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      total INTEGER NOT NULL,
      payment TEXT NOT NULL,
      sample INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL,
      stock_after INTEGER
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      amount INTEGER NOT NULL,
      date TEXT NOT NULL,
      sample INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
  `)

  const row = db.prepare('SELECT count(*) as count FROM products').get()
  if ((row?.count ?? 0) === 0) {
    saveStoreDataInternal(db, {
      products: DEFAULT_PRODUCTS,
      sales: DEFAULT_SALES,
      expenses: DEFAULT_EXPENSES,
    })
    db.prepare('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)').run('is_default_seed', '1')
  }
}

export function isDbEmpty() {
  const db = getDb()
  const row = db.prepare('SELECT count(*) as count FROM products').get()
  return (row?.count ?? 0) === 0
}

export function isDefaultSeed() {
  const db = getDb()
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get('is_default_seed')
  return row?.value === '1'
}

export function getStoreData() {
  const db = getDb()
  const products = db.prepare('SELECT * FROM products ORDER BY sort_order ASC, name ASC').all().map(p => ({
    id: p.id,
    barcode: p.barcode,
    barcodeGenerated: Boolean(p.barcode_generated),
    name: p.name,
    price: Number(p.price),
    stock: Number(p.stock),
    reorderPoint: Number(p.reorder_point),
    active: Boolean(p.active),
    image: p.image || undefined,
  }))

  const rawSales = db.prepare('SELECT * FROM sales ORDER BY date DESC, time DESC').all()
  const itemsStmt = db.prepare('SELECT product_id, quantity, price, stock_after FROM sale_items WHERE sale_id = ?')

  const sales = rawSales.map(s => {
    const items = itemsStmt.all(s.id).map(i => ({
      productId: i.product_id,
      quantity: Number(i.quantity),
      price: Number(i.price),
      ...(i.stock_after != null ? { stockAfter: Number(i.stock_after) } : {}),
    }))
    return {
      id: s.id,
      date: s.date,
      time: s.time,
      total: Number(s.total),
      payment: s.payment,
      sample: Boolean(s.sample),
      items,
    }
  })

  const expenses = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all().map(e => ({
    id: e.id,
    label: e.label,
    amount: Number(e.amount),
    date: e.date,
    sample: Boolean(e.sample),
  }))

  const metaRows = db.prepare('SELECT key, value FROM app_meta').all()
  const meta = {}
  for (const row of metaRows) {
    try {
      meta[row.key] = JSON.parse(row.value)
    } catch {
      meta[row.key] = row.value
    }
  }

  return {
    products,
    sales,
    expenses,
    aiMessages: meta.aiMessages || [],
    paymentHotkeys: meta.paymentHotkeys || undefined,
    profile: meta.profile || undefined,
    deletedProductIds: meta.deletedProductIds || [],
  }
}

function saveStoreDataInternal(db, data) {
  db.exec('BEGIN TRANSACTION')
  try {
    if (Array.isArray(data.products)) {
      const upsertProduct = db.prepare(`
        INSERT INTO products (id, barcode, barcode_generated, name, price, stock, reorder_point, active, image, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          barcode = excluded.barcode,
          barcode_generated = excluded.barcode_generated,
          name = excluded.name,
          price = excluded.price,
          stock = excluded.stock,
          reorder_point = excluded.reorder_point,
          active = excluded.active,
          image = excluded.image,
          sort_order = excluded.sort_order
      `)

      const productIds = new Set()
      data.products.forEach((p, idx) => {
        if (!p || typeof p.id !== 'string') return
        productIds.add(p.id)
        upsertProduct.run(
          p.id.slice(0, 64),
          String(p.barcode || '').slice(0, 100),
          p.barcodeGenerated ? 1 : 0,
          String(p.name || '').slice(0, 200),
          Math.max(0, Math.round(Number(p.price) || 0)),
          Math.max(0, Math.round(Number(p.stock) || 0)),
          Math.max(0, Math.round(Number(p.reorderPoint) || 5)),
          p.active !== false ? 1 : 0,
          typeof p.image === 'string' ? p.image : null,
          idx
        )
      })

      if (productIds.size > 0) {
        const allExisting = db.prepare('SELECT id FROM products').all().map(r => r.id)
        const toDelete = allExisting.filter(id => !productIds.has(id))
        if (toDelete.length > 0) {
          const delStmt = db.prepare('DELETE FROM products WHERE id = ?')
          for (const id of toDelete) delStmt.run(id)
        }
      }
    }

    if (Array.isArray(data.sales)) {
      const insertSale = db.prepare(`
        INSERT INTO sales (id, date, time, total, payment, sample)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          date = excluded.date,
          time = excluded.time,
          total = excluded.total,
          payment = excluded.payment,
          sample = excluded.sample
      `)
      const deleteItems = db.prepare('DELETE FROM sale_items WHERE sale_id = ?')
      const insertItem = db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, quantity, price, stock_after)
        VALUES (?, ?, ?, ?, ?)
      `)

      const saleIds = new Set()
      for (const s of data.sales) {
        if (!s || typeof s.id !== 'string') continue
        saleIds.add(s.id)
        insertSale.run(
          s.id.slice(0, 64),
          String(s.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
          String(s.time || '00:00').slice(0, 8),
          Math.max(0, Math.round(Number(s.total) || 0)),
          s.payment === 'QRIS' ? 'QRIS' : 'Tunai',
          s.sample ? 1 : 0
        )
        deleteItems.run(s.id)
        if (Array.isArray(s.items)) {
          for (const item of s.items) {
            if (!item || !item.productId) continue
            insertItem.run(
              s.id,
              String(item.productId).slice(0, 64),
              Math.max(1, Math.round(Number(item.quantity) || 1)),
              Math.max(0, Math.round(Number(item.price) || 0)),
              item.stockAfter != null ? Math.round(Number(item.stockAfter)) : null
            )
          }
        }
      }

      const existingSales = db.prepare('SELECT id FROM sales').all().map(r => r.id)
      const toDeleteSales = existingSales.filter(id => !saleIds.has(id))
      if (toDeleteSales.length > 0) {
        const delSaleStmt = db.prepare('DELETE FROM sales WHERE id = ?')
        for (const id of toDeleteSales) delSaleStmt.run(id)
      }
    }

    if (Array.isArray(data.expenses)) {
      const insertExpense = db.prepare(`
        INSERT INTO expenses (id, label, amount, date, sample)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          label = excluded.label,
          amount = excluded.amount,
          date = excluded.date,
          sample = excluded.sample
      `)
      const expenseIds = new Set()
      for (const e of data.expenses) {
        if (!e || typeof e.id !== 'string') continue
        expenseIds.add(e.id)
        insertExpense.run(
          e.id.slice(0, 64),
          String(e.label || '').slice(0, 200),
          Math.max(0, Math.round(Number(e.amount) || 0)),
          String(e.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
          e.sample ? 1 : 0
        )
      }

      const existingExpenses = db.prepare('SELECT id FROM expenses').all().map(r => r.id)
      const toDeleteExpenses = existingExpenses.filter(id => !expenseIds.has(id))
      if (toDeleteExpenses.length > 0) {
        const delExpStmt = db.prepare('DELETE FROM expenses WHERE id = ?')
        for (const id of toDeleteExpenses) delExpStmt.run(id)
      }
    }

    const setMeta = db.prepare('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)')
    if (data.profile) setMeta.run('profile', JSON.stringify(data.profile))
    if (data.paymentHotkeys) setMeta.run('paymentHotkeys', JSON.stringify(data.paymentHotkeys))
    if (data.deletedProductIds) setMeta.run('deletedProductIds', JSON.stringify(data.deletedProductIds))
    if (data.aiMessages) setMeta.run('aiMessages', JSON.stringify(data.aiMessages))
    setMeta.run('is_default_seed', '0')

    db.exec('COMMIT')
    return { ok: true }
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export function saveStoreData(data) {
  const db = getDb()
  const result = saveStoreDataInternal(db, data)
  try {
    performDailyBackup()
  } catch {}
  return result
}

export function getBackupSlotInfo(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date
  const jsDay = d.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const slot = jsDay === 0 ? 7 : jsDay // 1 = Monday (Day 1) ... 7 = Sunday (Day 7)
  const dayName = DAY_NAMES[slot - 1]
  const filename = `globaliti-backup-day-${slot}-${dayName}.sqlite`
  const dateStr = d.toISOString().slice(0, 10)
  return {
    slot,
    dayName,
    filename,
    dateStr,
  }
}

export function performDailyBackup({ force = false, date = new Date() } = {}) {
  const slotInfo = getBackupSlotInfo(date)
  const backupDir = BACKUP_DIR
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const manifestPath = path.join(backupDir, 'backup-manifest.json')
  let manifest = {
    totalBackupsRun: 0,
    lastRunDate: null,
    slots: {},
  }

  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    } catch {}
  }

  const existingSlot = manifest.slots?.[slotInfo.slot]
  const targetPath = path.join(backupDir, slotInfo.filename)

  if (!force && existingSlot?.date === slotInfo.dateStr && fs.existsSync(targetPath)) {
    return {
      ok: true,
      skipped: true,
      message: `Cadangan hari ke-${slotInfo.slot} (${slotInfo.dayName}) untuk tanggal ${slotInfo.dateStr} sudah ada.`,
      slot: slotInfo.slot,
      dayName: slotInfo.dayName,
      filename: slotInfo.filename,
      path: targetPath,
    }
  }

  const db = getDb()
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);')
  } catch {}

  if (fs.existsSync(targetPath)) {
    try {
      fs.unlinkSync(targetPath)
    } catch {}
  }

  const escapedPath = targetPath.replace(/'/g, "''")
  db.exec(`VACUUM INTO '${escapedPath}';`)

  const stat = fs.statSync(targetPath)
  manifest.totalBackupsRun = (manifest.totalBackupsRun || 0) + 1
  manifest.lastRunDate = slotInfo.dateStr
  manifest.updatedAt = new Date().toISOString()
  manifest.slots = manifest.slots || {}
  manifest.slots[slotInfo.slot] = {
    slot: slotInfo.slot,
    dayName: slotInfo.dayName,
    filename: slotInfo.filename,
    date: slotInfo.dateStr,
    timestamp: manifest.updatedAt,
    size: stat.size,
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

  return {
    ok: true,
    skipped: false,
    slot: slotInfo.slot,
    dayName: slotInfo.dayName,
    filename: slotInfo.filename,
    path: targetPath,
    size: stat.size,
    date: slotInfo.dateStr,
    overwritten: manifest.totalBackupsRun > 7,
  }
}

export function getBackupList() {
  const backupDir = BACKUP_DIR
  const manifestPath = path.join(backupDir, 'backup-manifest.json')
  let manifest = { totalBackupsRun: 0, lastRunDate: null, slots: {} }

  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    } catch {}
  }

  const todayInfo = getBackupSlotInfo()
  const slots = []
  for (let i = 1; i <= 7; i++) {
    const dayName = DAY_NAMES[i - 1]
    const filename = `globaliti-backup-day-${i}-${dayName}.sqlite`
    const filePath = path.join(backupDir, filename)
    const exists = fs.existsSync(filePath)
    const info = manifest.slots?.[i] || null
    let size = 0
    if (exists) {
      try {
        size = fs.statSync(filePath).size
      } catch {}
    }

    slots.push({
      slot: i,
      dayName,
      label: `Hari ${i} (${dayName.charAt(0).toUpperCase() + dayName.slice(1)})`,
      filename,
      exists,
      isToday: i === todayInfo.slot,
      size,
      date: info?.date || null,
      timestamp: info?.timestamp || null,
    })
  }

  return {
    ok: true,
    todaySlot: todayInfo.slot,
    todayDayName: todayInfo.dayName,
    totalBackupsRun: manifest.totalBackupsRun || 0,
    lastRunDate: manifest.lastRunDate || null,
    slots,
  }
}

async function readJsonBody(req) {
  const contentLength = Number(req.headers['content-length'])
  if (Number.isFinite(contentLength) && contentLength > MAX_PAYLOAD_BYTES) {
    const err = new Error('Ukuran permintaan melebihi batas maksimum 10MB')
    err.status = 413
    throw err
  }

  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let rejected = false
    req.on('data', (chunk) => {
      if (rejected) return
      size += chunk.length
      if (size > MAX_PAYLOAD_BYTES) {
        rejected = true
        const err = new Error('Ukuran permintaan melebihi batas maksimum 10MB')
        err.status = 413
        req.pause()
        reject(err)
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (rejected) return
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw.trim()) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        const err = new Error('Format JSON tidak valid')
        err.status = 400
        reject(err)
      }
    })
    req.on('error', (err) => {
      if (!rejected) reject(err)
    })
  })
}

export async function handleSqliteApi(req, res, pathname) {
  if (!pathname.startsWith('/api/db')) return false

  // Tolak permintaan cross-site dari tab atau situs asing
  if (req.headers['sec-fetch-site'] === 'cross-site') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.writeHead(403)
    res.end(JSON.stringify({ ok: false, error: 'Permintaan lintas situs ditolak' }))
    return true
  }

  const referer = req.headers.referer
  if (referer && req.headers.host) {
    try {
      if (new URL(referer).host.toLowerCase() !== String(req.headers.host).toLowerCase()) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.writeHead(403)
        res.end(JSON.stringify({ ok: false, error: 'Permintaan lintas situs ditolak' }))
        return true
      }
    } catch {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.writeHead(403)
      res.end(JSON.stringify({ ok: false, error: 'Referer tidak valid' }))
      return true
    }
  }

  const authError = authorize(req)
  if (authError) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.writeHead(authError.status)
    res.end(JSON.stringify({ ok: false, error: authError.message }))
    return true
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')

  try {
    if (pathname === '/api/db/store') {
      if (req.method === 'GET') {
        const empty = isDbEmpty()
        const data = empty ? null : getStoreData()
        res.writeHead(200)
        res.end(JSON.stringify({ ok: true, empty, isDefaultSeed: isDefaultSeed(), data }))
        return true
      }
      if (req.method === 'PUT' || req.method === 'POST') {
        const body = await readJsonBody(req)
        saveStoreData(body)
        res.writeHead(200)
        res.end(JSON.stringify({ ok: true }))
        return true
      }
    }

    if (pathname === '/api/db/migrate' && (req.method === 'POST' || req.method === 'PUT')) {
      const body = await readJsonBody(req)
      if (isDbEmpty() || isDefaultSeed()) {
        saveStoreData(body)
        res.writeHead(200)
        res.end(JSON.stringify({ ok: true, migrated: true }))
      } else {
        res.writeHead(200)
        res.end(JSON.stringify({ ok: true, migrated: false, message: 'Database sudah berisi data' }))
      }
      return true
    }

    if (pathname === '/api/db/backups') {
      if (req.method === 'GET') {
        const list = getBackupList()
        res.writeHead(200)
        res.end(JSON.stringify(list))
        return true
      }
      if (req.method === 'POST') {
        const result = performDailyBackup({ force: true })
        res.writeHead(200)
        res.end(JSON.stringify(result))
        return true
      }
    }

    if (pathname === '/api/db/backups/run' && req.method === 'POST') {
      const result = performDailyBackup({ force: true })
      res.writeHead(200)
      res.end(JSON.stringify(result))
      return true
    }

    const backupSlotMatch = pathname.match(/^\/api\/db\/backups\/([1-7]|day-[1-7])$/)
    if (backupSlotMatch && req.method === 'GET') {
      const rawSlot = backupSlotMatch[1]
      const slotNum = parseInt(rawSlot.replace('day-', ''), 10)
      const dayName = DAY_NAMES[slotNum - 1]
      const filename = `globaliti-backup-day-${slotNum}-${dayName}.sqlite`
      const targetPath = path.join(BACKUP_DIR, filename)

      if (!fs.existsSync(targetPath)) {
        res.writeHead(404)
        res.end(JSON.stringify({ ok: false, error: `Berkas cadangan hari ke-${slotNum} (${filename}) belum tersedia` }))
        return true
      }

      const stat = fs.statSync(targetPath)
      res.writeHead(200, {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stat.size,
        'Cache-Control': 'no-store',
      })
      fs.createReadStream(targetPath).pipe(res)
      return true
    }

    if ((pathname === '/api/db/backup.sqlite' || pathname === '/api/db/backup') && req.method === 'GET') {
      const db = getDb() // pastikan db ada
      try {
        db.exec('PRAGMA wal_checkpoint(TRUNCATE);')
      } catch {
        // checkpoint fallback jika sibuk
      }
      if (!fs.existsSync(DB_FILE)) {
        res.writeHead(404)
        res.end(JSON.stringify({ ok: false, error: 'Database belum dibuat' }))
        return true
      }
      const stat = fs.statSync(DB_FILE)
      res.writeHead(200, {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="globaliti-store-${new Date().toISOString().slice(0, 10)}.sqlite"`,
        'Content-Length': stat.size,
        'Cache-Control': 'no-store',
      })
      fs.createReadStream(DB_FILE).pipe(res)
      return true
    }

    res.writeHead(404)
    res.end(JSON.stringify({ ok: false, error: 'Endpoint database tidak ditemukan' }))
    return true
  } catch (err) {
    const status = err.status || 500
    res.writeHead(status)
    res.end(JSON.stringify({ ok: false, error: err.message || 'Gagal memproses permintaan database' }))
    return true
  }
}
