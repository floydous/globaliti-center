import type { Sale } from '../types'

// Tanggal lokal (bukan UTC) dalam bentuk YYYY-MM-DD, supaya penjualan pukul 00:30
// tidak jatuh ke hari sebelumnya.
export const localDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const shiftDays = (key: string, delta: number) => {
  const [year, month, day] = key.split('-').map(Number)
  return localDateKey(new Date(year, month - 1, day + delta))
}

export const formatLongDate = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const periodLabel = (from: string, to: string) => {
  if (from && to) return from === to ? formatLongDate(from) : `${formatLongDate(from)} s.d. ${formatLongDate(to)}`
  if (from) return `Sejak ${formatLongDate(from)}`
  if (to) return `Sampai ${formatLongDate(to)}`
  return 'Semua tanggal tercatat'
}

export const formatDayLabel = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export type DayProduct = {
  productId: string
  quantity: number
  revenue: number
  // Stok sebelum penjualan pertama produk ini pada hari itu; null bila nota lama tidak mencatatnya.
  before: number | null
  // Stok setelah penjualan terakhir produk ini pada hari itu; null bila nota lama tidak mencatatnya.
  remaining: number | null
}

export type DayRow = {
  // null = nota lama yang tersimpan sebelum tanggal dicatat
  date: string | null
  sales: Sale[]
  items: number
  revenue: number
  cost: number
  products: DayProduct[]
}

// `sales` diurutkan terbaru lebih dulu (cara aplikasi menyimpannya), jadi nota pertama
// yang memuat sebuah produk pada hari itu adalah penjualan terakhirnya. Stok yang berubah karena
// restok atau koreksi di antara dua penjualan tidak dicatat per hari, jadi awal -> akhir hanya
// membandingkan stok sebelum penjualan pertama dan sesudah penjualan terakhir.
export function groupSalesByDay(sales: Sale[], estimateCost: (price: number) => number): DayRow[] {
  const days = new Map<string, DayRow>()
  for (const sale of sales) {
    const key = sale.date ?? ''
    let day = days.get(key)
    if (!day) {
      day = { date: sale.date ?? null, sales: [], items: 0, revenue: 0, cost: 0, products: [] }
      days.set(key, day)
    }
    day.sales.push(sale)
    day.revenue += sale.total
    for (const item of sale.items) {
      day.items += item.quantity
      day.cost += estimateCost(item.price) * item.quantity
      const existing = day.products.find((product) => product.productId === item.productId)
      // Nota diurutkan terbaru dulu: nilai pertama yang diketahui adalah stok akhir hari,
      // dan nilai yang terakhir menimpa adalah stok sebelum penjualan paling awal.
      const before = item.stockAfter === undefined ? null : item.stockAfter + item.quantity
      if (existing) {
        existing.quantity += item.quantity
        existing.revenue += item.price * item.quantity
        if (before !== null) existing.before = before
        if (existing.remaining === null && item.stockAfter !== undefined) existing.remaining = item.stockAfter
      } else {
        day.products.push({ productId: item.productId, quantity: item.quantity, revenue: item.price * item.quantity, before, remaining: item.stockAfter ?? null })
      }
    }
  }
  return [...days.values()].sort((a, b) => {
    if (a.date === b.date) return 0
    if (a.date === null) return 1
    if (b.date === null) return -1
    return a.date < b.date ? 1 : -1
  })
}
