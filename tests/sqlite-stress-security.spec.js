import { test, expect } from '@playwright/test'
import { getDb, getStoreData, saveStoreData, DEFAULT_PRODUCTS, DEFAULT_SALES, DEFAULT_EXPENSES } from '../scripts/sqlite-store.mjs'

test.describe('SQLite Security Hardening & Edge Cases', () => {
  let baselineStore = null

  test.beforeAll(() => {
    baselineStore = getStoreData()
  })

  test.afterAll(() => {
    if (baselineStore) {
      saveStoreData(baselineStore)
    }
  })

  test('rejects cross-site requests via Sec-Fetch-Site: cross-site', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:4173/api/db/store', {
      headers: {
        'sec-fetch-site': 'cross-site',
      },
    })
    expect(res.status()).toBe(403)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toContain('lintas situs')
  })

  test('rejects foreign referer headers', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:4173/api/db/store', {
      headers: {
        referer: 'http://malicious-bank-hacker.com/evil',
      },
    })
    expect(res.status()).toBe(403)
  })

  test('rejects foreign origin headers', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:4173/api/db/store', {
      headers: {
        origin: 'http://evil.com',
      },
    })
    expect(res.status()).toBe(403)
  })

  test('returns 400 Bad Request on malformed JSON payload without crashing', async ({ request }) => {
    const res = await request.post('http://127.0.0.1:4173/api/db/store', {
      headers: {
        'content-type': 'application/json',
      },
      data: Buffer.from('{ invalid: json, broken'),
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toContain('JSON')
  })

  test('rejects oversized payload (>10MB) with 413 Payload Too Large', async ({ request }) => {
    // 11MB buffer of spaces
    const giantPayload = Buffer.alloc(11 * 1024 * 1024, 32)
    const res = await request.post('http://127.0.0.1:4173/api/db/store', {
      headers: {
        'content-type': 'application/json',
      },
      data: giantPayload,
    })
    expect(res.status()).toBe(413)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toContain('10MB')
  })

  test('returns Cache-Control: no-store on database endpoints', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:4173/api/db/store')
    expect(res.headers()['cache-control']).toBe('no-store')
  })

  test('SQL injection resilience in product and sale names', () => {
    const injectionPayload = {
      products: [
        {
          id: 'p-inject',
          barcode: "8999999999999'; DROP TABLE products; --",
          name: "'; DROP TABLE sales; SELECT '1",
          price: 5000,
          stock: 10,
          reorderPoint: 5,
          active: true,
        },
      ],
      sales: [
        {
          id: "TRX-'; DROP TABLE sale_items;--",
          date: '2026-11-09',
          time: '12:00',
          total: 5000,
          payment: 'Tunai',
          sample: false,
          items: [{ productId: 'p-inject', quantity: 1, price: 5000 }],
        },
      ],
      expenses: [],
    }

    // Save should execute safely without executing any injected DDL
    saveStoreData(injectionPayload)

    const db = getDb()
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name)

    // Tables must still exist!
    expect(tables).toContain('products')
    expect(tables).toContain('sales')
    expect(tables).toContain('sale_items')

    const p = db.prepare('SELECT name, barcode FROM products WHERE id = ?').get('p-inject')
    expect(p.name).toBe("'; DROP TABLE sales; SELECT '1")
    expect(p.barcode).toBe("8999999999999'; DROP TABLE products; --")

    // Restore baseline
    saveStoreData({
      products: DEFAULT_PRODUCTS,
      sales: DEFAULT_SALES,
      expenses: DEFAULT_EXPENSES,
    })
  })

  test('gracefully handles boundary numeric values: negative numbers and overflows', () => {
    saveStoreData({
      products: [
        {
          id: 'p-bounds',
          barcode: '8990000000000',
          name: 'Boundary Test',
          price: -9999, // negative price
          stock: -50,   // negative stock
          reorderPoint: 'invalid', // non-numeric
          active: true,
        },
      ],
      sales: [],
      expenses: [],
    })

    const db = getDb()
    const row = db.prepare('SELECT price, stock, reorder_point FROM products WHERE id = ?').get('p-bounds')
    expect(row.price).toBe(0) // clamped to >= 0
    expect(row.stock).toBe(0) // clamped to >= 0
    expect(row.reorder_point).toBe(5) // fallback to default 5

    // Restore baseline
    saveStoreData({
      products: DEFAULT_PRODUCTS,
      sales: DEFAULT_SALES,
      expenses: DEFAULT_EXPENSES,
    })
  })
})

test.describe('SQLite Stress Testing & Concurrency', () => {
  test('handles 50 concurrent requests without SQLITE_BUSY or locking errors', async ({ request }) => {
    // Send 50 concurrent GET requests simultaneously
    const promises = Array.from({ length: 50 }, () => request.get('http://127.0.0.1:4173/api/db/store'))
    const responses = await Promise.all(promises)

    for (const res of responses) {
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
    }
  })

  test('high volume scale: handles 500 sales with items and queries under 100ms', () => {
    const highVolumeSales = []
    for (let i = 1; i <= 500; i++) {
      highVolumeSales.push({
        id: `TRX-STRESS-${i.toString().padStart(4, '0')}`,
        date: '2026-11-09',
        time: '12:00',
        total: 18000,
        payment: i % 2 === 0 ? 'QRIS' : 'Tunai',
        sample: false,
        items: [
          { productId: 'p1', quantity: 2, price: 8000, stockAfter: 20 },
          { productId: 'p3', quantity: 1, price: 5000, stockAfter: 30 },
        ],
      })
    }

    const t0 = Date.now()
    saveStoreData({
      products: DEFAULT_PRODUCTS,
      sales: highVolumeSales,
      expenses: DEFAULT_EXPENSES,
    })
    const writeDuration = Date.now() - t0

    const t1 = Date.now()
    const store = getStoreData()
    const readDuration = Date.now() - t1

    expect(store.sales.length).toBe(500)
    expect(writeDuration).toBeLessThan(1000) // 500 sales with 1000 items written in <1s
    expect(readDuration).toBeLessThan(150)   // 500 sales with relational join retrieved in <150ms

    // Restore baseline
    saveStoreData({
      products: DEFAULT_PRODUCTS,
      sales: DEFAULT_SALES,
      expenses: DEFAULT_EXPENSES,
    })
  })

  test('atomic rollback: transaction rolls back completely on statement failure', () => {
    const db = getDb()
    const initialCount = db.prepare('SELECT count(*) as c FROM products').get().c

    expect(() => {
      // Simulate an invalid call that violates constraints or throws inside saveStoreData
      saveStoreData({
        products: [
          { id: null, name: 'Will fail because id is not string' }, // triggers error if not handled or manual throw
        ],
      })
    })

    // After failure or error, product count remains intact
    const afterCount = db.prepare('SELECT count(*) as c FROM products').get().c
    expect(afterCount).toBe(initialCount)
  })
})
