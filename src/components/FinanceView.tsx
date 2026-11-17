import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  DownloadSimple,
  Eye,
  FileText,
  Plus,
  Printer,
  X,
} from '@phosphor-icons/react'
import type { Expense, Product, Sale } from '../types'
import FormalFinancialReport from './FormalFinancialReport'
import DailySales from './DailySales'
import PrintFrame from './PrintFrame'
import { estimateCost } from '../lib/hpp'
import { costRatio, reportPeriod, type BusinessProfile } from '../lib/business'
import { formatLongDate } from '../lib/dailySales'

export type FinanceTab = 'laba_rugi' | 'neraca' | 'penjualan' | 'beban'

type FinanceViewProps = {
  products: Product[]
  sales: Sale[]
  expenses: Expense[]
  profile: BusinessProfile
  hasSampleData: boolean
  onClearSampleData: () => void
  onAddExpense: (expense: Omit<Expense, 'id'>) => void
  onCancelSaleItem?: (saleId: string, productId: string, cancelQty: number) => void
  onNotify?: (message: string) => void
  tab?: FinanceTab
  onTabChange?: (tab: FinanceTab) => void
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
  expenses,
  profile,
  hasSampleData,
  onClearSampleData,
  onAddExpense,
  onCancelSaleItem,
  onNotify,
  tab = 'laba_rugi',
}: FinanceViewProps) {
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [confirmClearSample, setConfirmClearSample] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    label: '',
    amount: 50000,
    date: new Date().toISOString().slice(0, 10),
  })

  // Escape menutup pratinjau dokumen, sama seperti tombol Tutup
  useEffect(() => {
    if (!showPreviewModal) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPreviewModal(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showPreviewModal])

  const ratio = costRatio(profile)
  const period = useMemo(() => reportPeriod(sales, expenses), [sales, expenses])

  // Perhitungan Pendapatan
  const iceCreamRevenue = useMemo(
    () => sales.reduce((sum, s) => sum + s.total, 0),
    [sales]
  )

  const totalRevenue = iceCreamRevenue

  // Perhitungan Beban Pokok Penjualan (HPP Es Krim) berdasarkan harga riil pada saat nota terjadi
  const cogsIceCream = useMemo(() => {
    let totalCogs = 0
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const cost = estimateCost(item.price, ratio)
        totalCogs += cost * item.quantity
      })
    })
    return totalCogs
  }, [sales, ratio])

  // Total Beban Operasional
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  )

  // Laba rugi satu langkah: seluruh pendapatan dikurangi seluruh beban (HPP + beban operasional)
  const netIncome = totalRevenue - cogsIceCream - totalExpenses

  // Neraca / Posisi Keuangan SAK EMKM
  const inventoryValue = useMemo(
    () => products.reduce((sum, p) => sum + p.stock * estimateCost(p.price, ratio), 0),
    [products, ratio]
  )

  // Kas = modal kas awal + penerimaan penjualan - beban operasional (HPP tidak mengeluarkan kas)
  const cashInHand = profile.openingCash + totalRevenue - totalExpenses

  const totalAssets = cashInHand + inventoryValue
  const totalLiabilities = 0
  // Saldo laba berjalan sama dengan laba bersih pada laporan laba rugi; sisanya adalah modal awal
  // (kas awal ditambah persediaan awal), sehingga neraca seimbang tanpa selisih yang disembunyikan.
  const retainedEarnings = netIncome
  const initialEquity = totalAssets - totalLiabilities - retainedEarnings

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseForm.label.trim() || expenseForm.amount <= 0) return
    onAddExpense(expenseForm)
    setShowExpenseModal(false)
    setExpenseForm({
      label: '',
      amount: 50000,
      date: new Date().toISOString().slice(0, 10),
    })
  }

  const handleDownloadPdf = async () => {
    if (window.electronAPI?.downloadPdf) {
      setIsDownloadingPdf(true)
      try {
        const defaultFilename = `Laporan-Keuangan-SAK-EMKM-${period.start}-${period.end}.pdf`
        const res = await window.electronAPI.downloadPdf({ filename: defaultFilename })
        if (res.success && res.filename) {
          onNotify?.(`Laporan keuangan berhasil disimpan: ${res.filename}`)
        } else if (res.error) {
          onNotify?.(`Gagal menyimpan PDF: ${res.error}`)
        }
      } catch (err) {
        onNotify?.(err instanceof Error ? err.message : 'Gagal mengekspor dokumen PDF')
      } finally {
        setIsDownloadingPdf(false)
      }
    } else {
      // Di peramban web (tanpa lingkungan desktop Electron), gunakan dialog cetak browser
      window.print()
    }
  }

  return (
    <section className="finance-page">
      <div className="finance-header">
        <div>
          <h2>Laporan Keuangan SAK EMKM</h2>
          <p className="finance-sub">
            Unit Usaha {profile.unitName} - Periode {formatLongDate(period.start)} s.d. {formatLongDate(period.end)}
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
            className="secondary-button"
            onClick={() => setShowPreviewModal(true)}
            title="Lihat format dokumen resmi sebelum mencetak"
          >
            <Eye size={16} /> Pratinjau Dokumen
          </button>
          <button
            className="primary-action"
            onClick={() => setShowPreviewModal(true)}
            title="Buka pratinjau dan opsi cetak laporan keuangan (PDF / Printer)"
          >
            <Printer size={16} /> Cetak Laporan
          </button>
        </div>
      </div>

      {hasSampleData && (
        <div className="sample-banner" role="status">
          <span>Laporan ini masih memuat nota dan beban contoh bawaan aplikasi.</span>
          <button type="button" className="secondary-button" onClick={() => setConfirmClearSample(true)}>Hapus data contoh</button>
        </div>
      )}

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
            <div className="statement-row subtotal">
              <strong>Total Pendapatan Usaha</strong>
              <strong>{formatRupiah(totalRevenue)}</strong>
            </div>

            <div className="statement-section-title">2. Beban Usaha</div>
            <div className="statement-row">
              <span>HPP Es Krim Terjual (estimasi)</span>
              <span>({formatRupiah(cogsIceCream)})</span>
            </div>
            {expenses.map((exp) => (
              <div className="statement-row" key={exp.id}>
                <span>{exp.label}</span>
                <span>({formatRupiah(exp.amount)})</span>
              </div>
            ))}
            <div className="statement-row subtotal">
              <strong>Total Beban Usaha</strong>
              <span>({formatRupiah(cogsIceCream + totalExpenses)})</span>
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
        <DailySales
          sales={sales}
          products={products}
          costRatio={ratio}
          profile={profile}
          onCancelSaleItem={onCancelSaleItem}
        />
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
                  <th className="text-right">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.date}</td>
                    <td>{exp.label}</td>
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

      {confirmClearSample && (
        <div className="modal-backdrop-globaliti" role="presentation" onClick={() => setConfirmClearSample(false)}>
          <div className="form-modal" role="dialog" aria-modal="true" aria-label="Hapus data contoh" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Hapus data contoh?</h2>
                <p className="modal-sub">Semua nota dan beban contoh dihapus dari pembukuan. Catatan yang Anda buat sendiri tidak ikut terhapus. Tindakan ini tidak bisa dibatalkan.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setConfirmClearSample(false)}>Batal</button>
              <button
                type="button"
                className="primary-action"
                onClick={() => {
                  onClearSampleData()
                  setConfirmClearSample(false)
                }}
              >
                Hapus data contoh
              </button>
            </div>
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
      {/* Target Cetak Dokumen Formal (Aktif saat window.print() / @media print) */}
      <div className="formal-report-print-target">
        <PrintFrame>
          <FormalFinancialReport
            expenses={expenses}
            iceCreamRevenue={iceCreamRevenue}
            totalRevenue={totalRevenue}
            cogsIceCream={cogsIceCream}
            totalExpenses={totalExpenses}
            netIncome={netIncome}
            inventoryValue={inventoryValue}
            cashInHand={cashInHand}
            totalAssets={totalAssets}
            totalLiabilities={totalLiabilities}
            initialEquity={initialEquity}
            retainedEarnings={retainedEarnings}
            profile={profile}
            periodStart={period.start}
            periodEnd={period.end}
            includesSampleData={hasSampleData}
          />
        </PrintFrame>
      </div>

      {/* Modal Pratinjau Dokumen Formal */}
      {showPreviewModal && (
        <div
          className="preview-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau Dokumen Laporan Keuangan"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="preview-modal-shell"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="preview-modal-bar">
              <div className="preview-bar-title">
                <FileText size={20} weight="bold" />
                <div>
                  <strong>Pratinjau Dokumen Laporan Keuangan</strong>
                  <span>Format Standar SAK EMKM Pertanggungjawaban Sekolah</span>
                </div>
              </div>
              <div className="preview-bar-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowPreviewModal(false)}
                >
                  <X size={16} /> Tutup
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  title="Unduh laporan keuangan langsung sebagai berkas PDF resmi"
                >
                  <DownloadSimple size={16} weight="bold" /> {isDownloadingPdf ? 'Menyimpan PDF...' : 'Unduh (PDF)'}
                </button>
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => window.print()}
                  title="Cetak langsung dokumen ke mesin printer fisik"
                >
                  <Printer size={16} /> Cetak Dokumen
                </button>
              </div>
            </div>
            <div className="preview-paper-container">
              <FormalFinancialReport
                      expenses={expenses}
                iceCreamRevenue={iceCreamRevenue}
                      totalRevenue={totalRevenue}
                cogsIceCream={cogsIceCream}
                      totalExpenses={totalExpenses}
                netIncome={netIncome}
                inventoryValue={inventoryValue}
                      cashInHand={cashInHand}
                totalAssets={totalAssets}
                totalLiabilities={totalLiabilities}
                initialEquity={initialEquity}
                retainedEarnings={retainedEarnings}
                profile={profile}
                periodStart={period.start}
                periodEnd={period.end}
                includesSampleData={hasSampleData}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
