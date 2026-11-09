import type { AiMessage, Expense, PaymentHotkeys, Product, Sale } from '../types'
import { normalizeProfile, type BusinessProfile } from './business'
import { markLegacyExpenses, markLegacySales } from './sampleData'

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
export function loadStore(): Partial<StoreData> {
  const raw = localStorage.getItem(STORE_KEY)
  if (!raw) return {}
  const saved = JSON.parse(raw)
  if (saved.version !== 1 || !saved.data ||
      !['products', 'sales', 'expenses', 'aiMessages'].every(key => Array.isArray(saved.data[key]))) {
    throw new Error('Format penyimpanan tidak didukung')
  }
  // Data lama masih menyimpan field yang sudah dihapus dari model (operator,
  // kategori, unit, harga modal); field itu dibuang saat pemuatan.
  const sales = saved.data.sales.map((sale: Sale & { operator?: string }) => {
    const { operator: _removed, ...rest } = sale
    return rest
  })
  const products = saved.data.products.map((product: Product & Record<string, unknown>) => {
    const { category: _c, unit: _u, cost: _m, ...rest } = product
    return rest
  })
  const expenses = saved.data.expenses.map((expense: Expense & { category?: string }) => {
    const { category: _c, ...rest } = expense
    return rest
  })
  return {
    ...saved.data,
    sales: markLegacySales(sales),
    products,
    expenses: markLegacyExpenses(expenses),
    profile: normalizeProfile(saved.data.profile),
    deletedProductIds: Array.isArray(saved.data.deletedProductIds) ? saved.data.deletedProductIds.filter((id: unknown) => typeof id === 'string') : [],
  }
}

export function saveStore(data: StoreData) {
  localStorage.setItem(STORE_KEY, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data }))
}
