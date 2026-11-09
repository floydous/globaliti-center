import type { Expense, Sale } from '../types'

// Penyimpanan lama menyimpan nota dan beban contoh tanpa penanda. Yang cocok persis dengan
// data contoh bawaan ditandai di sini supaya bisa dihapus tanpa menyentuh catatan asli.
const LEGACY_SAMPLE_SALES: Record<string, number> = { 'TRX-0001': 16000, 'TRX-0002': 5000, 'TRX-0003': 18000 }
const LEGACY_SAMPLE_EXPENSES: Record<string, number> = { 'exp-1': 96000, 'exp-2': 150000 }

export const markLegacySales = (sales: Sale[]): Sale[] =>
  sales.map((sale) => (!sale.date && sale.sample === undefined && LEGACY_SAMPLE_SALES[sale.id] === sale.total ? { ...sale, sample: true } : sale))

export const markLegacyExpenses = (expenses: Expense[]): Expense[] =>
  expenses.map((expense) => (expense.sample === undefined && LEGACY_SAMPLE_EXPENSES[expense.id] === expense.amount ? { ...expense, sample: true } : expense))
