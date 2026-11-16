import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { getDb, getStoreData, saveStoreData, isDbEmpty, DB_FILE, DEFAULT_PRODUCTS } from '../scripts/sqlite-store.mjs'

test.describe('SQLite Local Store Backend', () => {
  test('initializes database and creates required tables', () => {
    const db = getDb()
    expect(db).toBeDefined()
    expect(fs.existsSync(DB_FILE)).toBe(true)

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name)

    expect(tables).toContain('products')
    expect(tables).toContain('sales')
    expect(tables).toContain('sale_items')
    expect(tables).toContain('expenses')
    expect(tables).toContain('app_meta')
  })

  test('saves and retrieves products, sales, and expenses', () => {
    const testData = {
      products: DEFAULT_PRODUCTS,
      sales: [
        { id: 'TRX-TEST-1', date: '2026-11-16', time: '10:00', total: 10000, payment: 'Tunai', items: [{ productId: 'p1', quantity: 1, price: 10000 }] },
      ],
      expenses: [
        { id: 'EXP-TEST-1', label: 'Beban Uji', amount: 5000, date: '2026-11-16' },
      ],
      profile: {
        unitName: 'Globaliti Test Unit',
        openingCash: 500000,
      },
      paymentHotkeys: { tunai: '1', qris: '2' },
      deletedProductIds: ['del-1'],
    }

    const saved = saveStoreData(testData)
    expect(saved.ok).toBe(true)
    expect(isDbEmpty()).toBe(false)

    const retrieved = getStoreData()
    expect(retrieved.products.length).toBe(36)
    expect(retrieved.products[0].name).toBe('Matcha Cup')
    expect(retrieved.products[0].price).toBe(8000)

    expect(retrieved.sales.length).toBe(1)
    expect(retrieved.expenses.length).toBe(1)
    expect(retrieved.profile.unitName).toBe('Globaliti Test Unit')
    expect(retrieved.paymentHotkeys.qris).toBe('2')
    expect(retrieved.deletedProductIds).toContain('del-1')
  })
})

test.describe('SQLite API Endpoints & Download', () => {
  test('GET /api/db/store returns store data over HTTP', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:4173/api/db/store')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data).toBeDefined()
    expect(body.data.products.length).toBe(36)
  })

  test('GET /api/db/backup.sqlite downloads valid sqlite database file', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:4173/api/db/backup.sqlite')
    expect(res.ok()).toBe(true)
    expect(res.headers()['content-type']).toContain('sqlite')
    const buffer = await res.body()
    // SQLite file format header starts with "SQLite format 3\0"
    expect(buffer.slice(0, 15).toString()).toBe('SQLite format 3')
  })
})
