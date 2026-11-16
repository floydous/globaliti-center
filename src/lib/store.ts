import type { AiMessage, Expense, PaymentHotkeys, Product, Sale } from '../types'
import { normalizeProfile, type BusinessProfile } from './business'
import { markLegacyExpenses, markLegacySales } from './sampleData'
import { apiHeaders } from './apiAuth'

export type StoreData = {
  products: Product[]
  sales: Sale[]
  expenses: Expense[]
  aiMessages: AiMessage[]
  paymentHotkeys?: PaymentHotkeys
  profile?: BusinessProfile
  // Produk bawaan yang sudah dihapus; dicatat supaya tidak muncul lagi saat aplikasi dimuat ulang
  deletedProductIds?: string[]
}

export const STORE_KEY = 'globaliti_store_v1'

export function normalizeStoreData(source: any): Partial<StoreData> {
  if (!source || typeof source !== 'object') return {}
  const sales = (Array.isArray(source.sales) ? source.sales : []).map((sale: Sale & { operator?: string }) => {
    const { operator: _removed, ...rest } = sale
    return rest
  })
  const products = (Array.isArray(source.products) ? source.products : []).map((product: Product & Record<string, unknown>) => {
    const { category: _c, unit: _u, cost: _m, ...rest } = product
    return rest
  })
  const expenses = (Array.isArray(source.expenses) ? source.expenses : []).map((expense: Expense & { category?: string }) => {
    const { category: _c, ...rest } = expense
    return rest
  })
  return {
    ...source,
    sales: markLegacySales(sales),
    products,
    expenses: markLegacyExpenses(expenses),
    profile: normalizeProfile(source.profile),
    deletedProductIds: Array.isArray(source.deletedProductIds)
      ? source.deletedProductIds.filter((id: unknown) => typeof id === 'string')
      : [],
  }
}

export function loadStore(): Partial<StoreData> {
  const raw = localStorage.getItem(STORE_KEY)
  if (!raw) return {}
  const saved = JSON.parse(raw)
  if (
    saved.version !== 1 ||
    !saved.data ||
    !['products', 'sales', 'expenses', 'aiMessages'].every((key) => Array.isArray(saved.data[key]))
  ) {
    throw new Error('Format penyimpanan tidak didukung')
  }
  return normalizeStoreData(saved.data)
}

export async function syncToServer(data: StoreData): Promise<boolean> {
  try {
    const res = await fetch('/api/db/store', {
      method: 'PUT',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    })
    return res.ok
  } catch {
    return false
  }
}

export function saveStore(data: StoreData) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data }))
  } catch {
    // Abaikan kegagalan kuota localStorage; sync ke server SQLite tetap berjalan
  }

  // Di lingkungan pengujian otomatis (Playwright / WebDriver), isolasi data antar-worker
  // dijaga agar pengujian paralel tidak saling mengotori state server.
  if (typeof navigator !== 'undefined' && navigator.webdriver) return

  // Simpan langsung ke server SQLite lokal secara asynchronous tanpa penundaan
  syncToServer(data).catch(() => {})
}

export async function fetchServerStore(): Promise<{ ok: boolean; data?: Partial<StoreData>; empty?: boolean; isDefaultSeed?: boolean }> {
  try {
    const res = await fetch('/api/db/store', {
      headers: apiHeaders(),
    })
    if (!res.ok) return { ok: false }
    const json = await res.json()
    if (!json.ok) return { ok: false }
    if (json.empty) return { ok: true, empty: true, isDefaultSeed: Boolean(json.isDefaultSeed) }
    if (json.data) {
      const normalized = normalizeStoreData(json.data)
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data: normalized }))
      } catch {}
      return { ok: true, data: normalized, empty: false, isDefaultSeed: Boolean(json.isDefaultSeed) }
    }
    return { ok: true, empty: true, isDefaultSeed: Boolean(json.isDefaultSeed) }
  } catch {
    return { ok: false }
  }
}

export async function migrateLocalStoreToServer(data: StoreData): Promise<boolean> {
  try {
    const res = await fetch('/api/db/migrate', {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    })
    const json = await res.json()
    return Boolean(json.ok && json.migrated)
  } catch {
    return false
  }
}
