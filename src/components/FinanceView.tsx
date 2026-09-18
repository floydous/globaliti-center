import { useMemo, useState } from 'react'
import {
  Check,
  Plus,
  Printer,
} from '@phosphor-icons/react'
import type { Expense, PrintOrder, Product, Sale } from '../types'

type FinanceViewProps = {
  products: Product[]
  sales: Sale[]
  printOrders: PrintOrder[]
  expenses: Expense[]
  onAddExpense: (expense: Omit<Expense, 'id'>) => void
}

const formatRupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)

export default function FinanceView({
  products,
  sales,
  printOrders,
  expenses,
  onAddExpense,
}: FinanceViewProps) {
  const [tab, setTab] = useState<'laba_rugi' | 'neraca' | 'penjualan' | 'beban'>('laba_rugi')
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    label: '',
    category: 'Operasional',
    amount: 50000,
    date: new Date().toISOString().slice(0, 10),
  })

  // Perhitungan Pendapatan
  const iceCreamRevenue = useMemo(
    () => sales.reduce((sum, s) => sum + s.total, 0),
    [sales]
  )

  const printRevenue = useMemo(
    () =>
      printOrders
        .filter((o) => o.payment === 'Lunas di muka' || o.payment === 'Lunas setelah cetak')
        .reduce((sum, o) => sum + o.total, 0),
    [printOrders]
  )

  const totalRevenue = iceCreamRevenue + printRevenue

  // Perhitungan Beban Pokok Penjualan (HPP Es Krim)
  const cogsIceCream = useMemo(() => {
    let totalCogs = 0
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId)
        const cost = prod ? prod.cost : item.price * 0.5
        totalCogs += cost * item.quantity
      })
    })
    return totalCogs
  }, [sales, products])

  const grossProfit = totalRevenue - cogsIceCream

  // Total Beban Operasional
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  )

  const netIncome = grossProfit - totalExpenses

  // Neraca / Posisi Keuangan SAK EMKM
  const inventoryValue = useMemo(
    () => products.reduce((sum, p) => sum + p.stock * p.cost, 0),
    [products]
  )

  const accountsReceivable = useMemo(
    () =>
      printOrders
        .filter((o) => o.payment === 'Bayar di akhir')
        .reduce((sum, o) => sum + o.total, 0),
    [printOrders]
  )

  const cashInHand = 1500000 + totalRevenue - totalExpenses // Modal kas awal 1.5jt + penerimaan kas - pengeluaran

  const totalAssets = cashInHand + accountsReceivable + inventoryValue
  const totalLiabilities = 0
  const initialEquity = 1500000 + inventoryValue
  const retainedEarnings = totalAssets - initialEquity - totalLiabilities

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseForm.label.trim() || expenseForm.amount <= 0) return
    onAddExpense(expenseForm)
    setShowExpenseModal(false)
    setExpenseForm({
      label: '',
      category: 'Operasional',
      amount: 50000,
      date: new Date().toISOString().slice(0, 10),
    })
  }

  return (
    <section className="finance-page">
      <div className="finance-header">
        <div>
          <h2>Laporan Keuangan SAK EMKM</h2>
          <p className="finance-sub">
            Unit Usaha Globaliti Creative Center - Periode September 2026
          </p>
        </div>
        <div className="finance-actions">
          <button
            className="secondary-button"
            onClick={() => setShowExpenseModal(true)}
          >
            <Plus size={16} weight="bold" /> Catat Beban
          </button>
          <button
            className="primary-action"
            onClick={() => window.print()}
          >
            <Printer size={16} /> Cetak Laporan
          </button>
        </div>
      </div>

      {/* Tabs Navigasi Bersih */}
      <div className="finance-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'laba_rugi'}
          className={tab === 'laba_rugi' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setTab('laba_rugi')}
        >
          Laba Rugi
        </button>
        <button
          role="tab"
          aria-selected={tab === 'neraca'}
          className={tab === 'neraca' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setTab('neraca')}
        >
          Posisi Keuangan (Neraca)
        </button>
        <button
          role="tab"
          aria-selected={tab === 'penjualan'}
          className={tab === 'penjualan' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setTab('penjualan')}
        >
          Penjualan Harian
        </button>
        <button
          role="tab"
          aria-selected={tab === 'beban'}
          className={tab === 'beban' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setTab('beban')}
        >
          Beban Operasional
        </button>
      </div>

      {/* TAB 1: Laba Rugi */}
      {tab === 'laba_rugi' && (
        <div className="finance-card">
          <div className="statement-head">
            <h3>Laporan Laba Rugi</h3>
            <span>Standar SAK EMKM</span>
          </div>

          <div className="statement-table">
            <div className="statement-section-title">1. Pendapatan Usaha</div>
            <div className="statement-row">
              <span>Penjualan Es Krim</span>
              <strong>{formatRupiah(iceCreamRevenue)}</strong>
            </div>
            <div className="statement-row">
              <span>Pendapatan Jasa Print Word</span>
              <strong>{formatRupiah(printRevenue)}</strong>
            </div>
            <div className="statement-row subtotal">
              <strong>Total Pendapatan Usaha</strong>
              <strong>{formatRupiah(totalRevenue)}</strong>
            </div>

            <div className="statement-section-title">2. Beban Pokok Penjualan (HPP)</div>
            <div className="statement-row">
              <span>HPP Es Krim Terjual</span>
              <span>({formatRupiah(cogsIceCream)})</span>
            </div>
            <div className="statement-row subtotal">
              <strong>Laba Bruto</strong>
              <strong>{formatRupiah(grossProfit)}</strong>
            </div>

            <div className="statement-section-title">3. Beban Operasional</div>
            {expenses.map((exp) => (
              <div className="statement-row" key={exp.id}>
                <span>{exp.label} ({exp.category})</span>
                <span>({formatRupiah(exp.amount)})</span>
              </div>
            ))}
            <div className="statement-row subtotal">
              <strong>Total Beban Operasional</strong>
              <span>({formatRupiah(totalExpenses)})</span>
            </div>

            <div className="statement-row grand-total">
              <div>
                <strong>Laba Bersih Usaha</strong>
                <small>Hasil bersih setelah HPP dan beban operasional</small>
              </div>
              <strong className={netIncome >= 0 ? 'text-profit' : 'text-loss'}>
                {formatRupiah(netIncome)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Posisi Keuangan (Neraca) */}
      {tab === 'neraca' && (
        <div className="finance-grid-neraca">
          <div className="finance-card">
            <div className="statement-head">
              <h3>Aset</h3>
              <span>Posisi Lancar & Tetap</span>
            </div>
            <div className="statement-table">
              <div className="statement-section-title">Aset Lancar</div>
              <div className="statement-row">
                <span>Kas dan Setara Kas</span>
                <strong>{formatRupiah(cashInHand)}</strong>
              </div>
              <div className="statement-row">
                <span>Piutang Jasa Print (Belum Lunas)</span>
                <strong>{formatRupiah(accountsReceivable)}</strong>
              </div>
              <div className="statement-row">
                <span>Persediaan Barang Dagang (Stok Es Krim)</span>
                <strong>{formatRupiah(inventoryValue)}</strong>
              </div>
              <div className="statement-row grand-total">
                <strong>Jumlah Aset</strong>
                <strong>{formatRupiah(totalAssets)}</strong>
              </div>
            </div>
          </div>

          <div className="finance-card">
            <div className="statement-head">
              <h3>Liabilitas & Ekuitas</h3>
              <span>Kewajiban dan Modal</span>
            </div>
            <div className="statement-table">
              <div className="statement-section-title">Liabilitas</div>
              <div className="statement-row">
                <span>Kewajiban Jangka Pendek</span>
                <strong>Rp 0</strong>
              </div>
              <div className="statement-row subtotal">
                <span>Total Liabilitas</span>
                <strong>Rp 0</strong>
              </div>

              <div className="statement-section-title">Ekuitas</div>
              <div className="statement-row">
                <span>Modal Awal Unit Usaha</span>
                <strong>{formatRupiah(initialEquity)}</strong>
              </div>
              <div className="statement-row">
                <span>Saldo Laba Berjalan</span>
                <strong>{formatRupiah(retainedEarnings)}</strong>
              </div>
              <div className="statement-row grand-total">
                <strong>Jumlah Liabilitas & Ekuitas</strong>
                <strong>{formatRupiah(totalAssets)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Penjualan Harian */}
      {tab === 'penjualan' && (
        <div className="finance-card">
          <div className="statement-head">
            <h3>Daftar Transaksi Kasir</h3>
            <span>{sales.length} transaksi tercatat hari ini</span>
          </div>
          <div className="finance-table-wrapper">
            <table className="finance-simple-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Waktu</th>
                  <th>Kasir</th>
                  <th>Rincian Produk</th>
                  <th>Metode</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td><code>{sale.id}</code></td>
                    <td>{sale.time}</td>
                    <td>{sale.operator}</td>
                    <td>
                      {sale.items
                        .map((it) => {
                          const p = products.find((prod) => prod.id === it.productId)
                          return `${it.quantity}x ${p?.name || 'Produk'}`
                        })
                        .join(', ')}
                    </td>
                    <td>
                      <span className="badge-payment">{sale.payment}</span>
                    </td>
                    <td className="text-right font-bold">
                      {formatRupiah(sale.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Beban Operasional */}
      {tab === 'beban' && (
        <div className="finance-card">
          <div className="statement-head">
            <h3>Daftar Beban Pengeluaran</h3>
            <span>Pengeluaran operasional toko</span>
          </div>
          <div className="finance-table-wrapper">
            <table className="finance-simple-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keperluan</th>
                  <th>Kategori</th>
                  <th className="text-right">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.date}</td>
                    <td>{exp.label}</td>
                    <td><span className="badge-payment">{exp.category}</span></td>
                    <td className="text-right font-bold">
                      {formatRupiah(exp.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Catat Beban */}
      {showExpenseModal && (
        <div
          className="modal-backdrop-globaliti"
          role="presentation"
          onClick={() => setShowExpenseModal(false)}
        >
          <form
            className="form-modal"
            role="dialog"
            aria-modal="true"
            onSubmit={handleCreateExpense}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Catat Pengeluaran</h2>
                <p className="modal-sub">Input beban operasional toko sekolah</p>
              </div>
            </div>
            <label className="field full">
              <span>Keperluan Beban</span>
              <input
                type="text"
                required
                placeholder="Contoh: Pembelian Kertas HVS A4 1 Rim"
                value={expenseForm.label}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, label: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Kategori</span>
              <select
                value={expenseForm.category}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, category: e.target.value })
                }
              >
                <option value="Operasional">Operasional Toko</option>
                <option value="Bahan Habis Pakai">Kertas & Tinta</option>
                <option value="Listrik & Utilitas">Listrik & Utilitas</option>
                <option value="Lainnya">Lain-lain</option>
              </select>
            </label>
            <label className="field">
              <span>Nominal (Rp)</span>
              <input
                type="number"
                min="1000"
                step="500"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })
                }
              />
            </label>
            <div className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowExpenseModal(false)}
              >
                Batal
              </button>
              <button type="submit" className="primary-action">
                <Check size={16} weight="bold" /> Simpan Beban
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
