import type { Expense, Sale } from '../types'
import { localDateKey } from './dailySales'

// Identitas unit usaha dan parameter pembukuan. Hanya nama unit dan modal kas awal yang bisa
// diubah di Pengaturan; sisanya tetap pada nilai bawaan di bawah (kop dan isi laporan).
export type BusinessProfile = {
  unitName: string
  schoolName: string
  foundationName: string
  address: string
  phone: string
  email: string
  website: string
  // Modal kas awal unit usaha (Rp)
  openingCash: number
  // Harga modal per produk tidak dicatat, jadi HPP diestimasi sebagai persen dari harga jual
  costRatioPercent: number
}

export const DEFAULT_PROFILE: BusinessProfile = {
  unitName: 'Globaliti Creative Center',
  schoolName: 'SMKS TI Bali Global Denpasar',
  foundationName: 'Yayasan Pendidikan Bali Global',
  address: 'Jl. Tukad Citarum No. 44, Renon, Denpasar Selatan, Kota Denpasar, Bali 80226',
  phone: '(0361) 249434',
  email: 'gcc@smktibaliglobal.sch.id',
  website: 'smktibaliglobal.sch.id',
  openingCash: 0,
  costRatioPercent: 57,
}

// Data dari penyimpanan lokal atau formulir tidak dipercaya: bentuk dan batasnya diperiksa.
export function normalizeProfile(input: unknown): BusinessProfile {
  const source = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const profile: BusinessProfile = { ...DEFAULT_PROFILE }
  if (typeof source.unitName === 'string' && source.unitName.trim()) profile.unitName = source.unitName.trim().slice(0, 160)
  const cash = Number(source.openingCash)
  if (Number.isFinite(cash) && cash >= 0 && cash <= 1e12) profile.openingCash = Math.round(cash)
  return profile
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Periode laporan: dari catatan tertanggal paling awal sampai hari ini.
export function reportPeriod(sales: Sale[], expenses: Expense[], today = localDateKey()) {
  const dates = [...sales.map((sale) => sale.date ?? ''), ...expenses.map((expense) => expense.date)].filter((date) => ISO_DATE.test(date))
  const earliest = dates.sort()[0]
  return { start: earliest && earliest < today ? earliest : today, end: today }
}

export const costRatio = (profile: BusinessProfile) => profile.costRatioPercent / 100
