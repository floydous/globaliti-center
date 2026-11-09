export type Product = {
  id: string
  barcode: string
  // Barcode dibuat aplikasi (EAN-13 internal) untuk produk tanpa barcode pabrik
  barcodeGenerated?: boolean
  name: string
  price: number
  stock: number
  reorderPoint: number
  active: boolean
  image?: string
}

export type SaleItem = {
  productId: string
  quantity: number
  price: number
  // Stok produk setelah nota ini; dipakai riwayat penjualan harian. Nota lama tidak punya.
  stockAfter?: number
}

export type Sale = {
  id: string
  // Tanggal lokal YYYY-MM-DD. Nota lama tidak punya.
  date?: string
  // Nota contoh bawaan aplikasi; bisa dihapus dari Laporan Keuangan
  sample?: boolean
  time: string
  items: SaleItem[]
  total: number
  payment: 'Tunai' | 'QRIS'
}

export type Expense = {
  id: string
  // Beban contoh bawaan aplikasi; bisa dihapus dari Laporan Keuangan
  sample?: boolean
  label: string
  amount: number
  date: string
}

export type PaymentHotkeys = {
  tunai: string
  qris: string
}

export type AiActionType =
  | 'adjust_stock'
  | 'record_sale'
  | 'record_expense'
  | 'add_product'
  | 'update_price'
  | 'update_payment_hotkeys'

export type AiAction = {
  id: string
  action: AiActionType
  description: string
  params: Record<string, any>
  status: 'pending' | 'applied' | 'rejected'
}

export type AiMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  time: string
  action?: AiAction
  actions?: AiAction[]
  streaming?: boolean
}
