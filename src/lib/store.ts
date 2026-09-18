import type { AiMessage, Expense, PrintOrder, PrintSettings, Product, Sale } from '../types'

export type StoreData = {
  products: Product[]
  sales: Sale[]
  expenses: Expense[]
  printOrders: PrintOrder[]
  printSettings: PrintSettings
  operator: string
  aiMessages: AiMessage[]
}

export const STORE_KEY = 'globaliti_store_v1'
export function loadStore(): Partial<StoreData> {
  const raw = localStorage.getItem(STORE_KEY)
  if (!raw) return {}
  const saved = JSON.parse(raw)
  if (saved.version !== 1 || !saved.data ||
      !['products', 'sales', 'expenses', 'printOrders', 'aiMessages'].every(key => Array.isArray(saved.data[key])) ||
      typeof saved.data.operator !== 'string' || !saved.data.printSettings) {
    throw new Error('Format penyimpanan tidak didukung')
  }
  return saved.data
}

export function saveStore(data: StoreData) {
  localStorage.setItem(STORE_KEY, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data }))
}
