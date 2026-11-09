import type { Expense } from '../types'
import type { BusinessProfile } from '../lib/business'
import { formatLongDate } from '../lib/dailySales'
import FormalKop from './FormalKop'

export type FormalFinancialReportProps = {
  expenses: Expense[]
  iceCreamRevenue: number
  totalRevenue: number
  cogsIceCream: number
  totalExpenses: number
  netIncome: number
  inventoryValue: number
  cashInHand: number
  totalAssets: number
  totalLiabilities: number
  initialEquity: number
  retainedEarnings: number
  profile: BusinessProfile
  periodStart: string
  periodEnd: string
  includesSampleData: boolean
}

const formatRupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)

const formatDeduction = (value: number) => '(' + formatRupiah(Math.abs(value)) + ')'

export default function FormalFinancialReport({
  expenses,
  iceCreamRevenue,
  totalRevenue,
  cogsIceCream,
  totalExpenses,
  netIncome,
  inventoryValue,
  cashInHand,
  totalAssets,
  totalLiabilities,
  initialEquity,
  retainedEarnings,
  profile,
  periodStart,
  periodEnd,
  includesSampleData,
}: FormalFinancialReportProps) {
  const totalEquity = initialEquity + retainedEarnings
  const balanced = totalAssets === totalLiabilities + totalEquity
  const endDate = formatLongDate(periodEnd)

  const expenseRows = expenses.map((exp, index) => (
    <tr key={exp.id || index}>
      <td className="formal-indent">{exp.label}</td>
      <td className="text-center">4</td>
      <td className="text-right">{formatDeduction(exp.amount)}</td>
      <td className="text-right"></td>
    </tr>
  ))

  return (
    <article className="formal-report-document" aria-label="Laporan Keuangan Formal SAK EMKM">
      {/* 1. KOP SURAT FORMAL DINAS / SEKOLAH */}
      <FormalKop profile={profile} />

      {/* 2. JUDUL DOKUMEN & METADATA RESMI */}
      <section className="formal-title-block">
        <h2 className="formal-doc-main-title">LAPORAN KEUANGAN PERTANGGUNGJAWABAN</h2>
        <div className="formal-doc-subtitle">
          STANDAR AKUNTANSI KEUANGAN ENTITAS MIKRO, KECIL, DAN MENENGAH (SAK EMKM)
        </div>
        <div className="formal-doc-period">Periode: {formatLongDate(periodStart)} s.d. {endDate}</div>
      </section>

      {/* 3. LAPORAN LABA RUGI */}
      <section className="formal-statement-section">
        <div className="formal-statement-heading">
          <h3>I. LAPORAN LABA RUGI</h3>
          <span>Untuk Periode yang Berakhir {endDate}</span>
        </div>

        <table className="formal-accounting-table">
          <thead>
            <tr>
              <th style={{ width: '50%' }}>Keterangan Pos Akun</th>
              <th style={{ width: '12%' }} className="text-center">Cat.</th>
              <th style={{ width: '19%' }} className="text-right">Rincian Nominal</th>
              <th style={{ width: '19%' }} className="text-right">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="formal-cat-header">
              <td colSpan={4}><strong>A. PENDAPATAN USAHA</strong></td>
            </tr>
            <tr>
              <td className="formal-indent">Pendapatan Penjualan Es Krim</td>
              <td className="text-center">1</td>
              <td className="text-right">{formatRupiah(iceCreamRevenue)}</td>
              <td className="text-right"></td>
            </tr>
            <tr className="formal-subtotal-row">
              <td><strong>Total Pendapatan Usaha</strong></td>
              <td></td>
              <td></td>
              <td className="text-right"><strong>{formatRupiah(totalRevenue)}</strong></td>
            </tr>

            <tr className="formal-cat-header">
              <td colSpan={4}><strong>B. BEBAN USAHA</strong></td>
            </tr>
            <tr>
              <td className="formal-indent">Beban Pokok Penjualan Es Krim Terjual</td>
              <td className="text-center">3</td>
              <td className="text-right">{formatDeduction(cogsIceCream)}</td>
              <td className="text-right"></td>
            </tr>
            {expenseRows}
            <tr className="formal-subtotal-row">
              <td><strong>Total Beban Usaha</strong></td>
              <td></td>
              <td></td>
              <td className="text-right"><strong>{formatDeduction(cogsIceCream + totalExpenses)}</strong></td>
            </tr>

            <tr className="formal-grand-row">
              <td>
                <strong>LABA BERSIH TAHUN / PERIODE BERJALAN</strong>
              </td>
              <td></td>
              <td></td>
              <td className="text-right">
                <span className="accounting-double-line">
                  {netIncome >= 0 ? formatRupiah(netIncome) : formatDeduction(netIncome)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 4. LAPORAN POSISI KEUANGAN (NERACA) */}
      <section className="formal-statement-section formal-page-break-before">
        <div className="formal-statement-heading">
          <h3>II. LAPORAN POSISI KEUANGAN (NERACA)</h3>
          <span>Per Tanggal {endDate}</span>
        </div>

        <div className="formal-skontro-grid">
          {/* SISI KIRI: ASET */}
          <div className="formal-skontro-column">
            <table className="formal-accounting-table">
              <thead>
                <tr>
                  <th colSpan={2} className="text-center formal-side-title">
                    ASET (AKTIVA)
                  </th>
                </tr>
                <tr>
                  <th style={{ width: '65%' }}>Pos Akun Aset</th>
                  <th style={{ width: '35%' }} className="text-right">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="formal-cat-header">
                  <td colSpan={2}><strong>Aset Lancar:</strong></td>
                </tr>
                <tr>
                  <td className="formal-indent">Kas dan Setara Kas</td>
                  <td className="text-right">{formatRupiah(cashInHand)}</td>
                </tr>
                <tr>
                  <td className="formal-indent">Persediaan Barang Dagangan (Stok Es Krim)</td>
                  <td className="text-right">{formatRupiah(inventoryValue)}</td>
                </tr>
                <tr className="formal-subtotal-row">
                  <td><strong>Jumlah Aset Lancar</strong></td>
                  <td className="text-right"><strong>{formatRupiah(totalAssets)}</strong></td>
                </tr>

                <tr className="formal-cat-header">
                  <td colSpan={2}><strong>Aset Tetap:</strong></td>
                </tr>
                <tr>
                  <td className="formal-indent">Peralatan Toko & Komputer Kasir</td>
                  <td className="text-right">Rp 0</td>
                </tr>
                <tr className="formal-subtotal-row">
                  <td><strong>Jumlah Aset Tetap</strong></td>
                  <td className="text-right"><strong>Rp 0</strong></td>
                </tr>

                <tr className="formal-grand-row">
                  <td><strong>JUMLAH ASET</strong></td>
                  <td className="text-right">
                    <span className="accounting-double-line">
                      {formatRupiah(totalAssets)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SISI KANAN: LIABILITAS & EKUITAS */}
          <div className="formal-skontro-column">
            <table className="formal-accounting-table">
              <thead>
                <tr>
                  <th colSpan={2} className="text-center formal-side-title">
                    LIABILITAS & EKUITAS (PASIVA)
                  </th>
                </tr>
                <tr>
                  <th style={{ width: '65%' }}>Pos Akun Kewajiban & Modal</th>
                  <th style={{ width: '35%' }} className="text-right">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="formal-cat-header">
                  <td colSpan={2}><strong>Liabilitas (Kewajiban):</strong></td>
                </tr>
                <tr>
                  <td className="formal-indent">Kewajiban Jangka Pendek (Utang Usaha)</td>
                  <td className="text-right">{formatRupiah(totalLiabilities)}</td>
                </tr>
                <tr className="formal-subtotal-row">
                  <td><strong>Jumlah Liabilitas</strong></td>
                  <td className="text-right"><strong>{formatRupiah(totalLiabilities)}</strong></td>
                </tr>

                <tr className="formal-cat-header">
                  <td colSpan={2}><strong>Ekuitas (Modal):</strong></td>
                </tr>
                <tr>
                  <td className="formal-indent">Modal Awal Unit Usaha</td>
                  <td className="text-right">{formatRupiah(initialEquity)}</td>
                </tr>
                <tr>
                  <td className="formal-indent">Saldo Laba Berjalan (Retained Earnings)</td>
                  <td className="text-right">{formatRupiah(retainedEarnings)}</td>
                </tr>
                <tr className="formal-subtotal-row">
                  <td><strong>Jumlah Ekuitas</strong></td>
                  <td className="text-right"><strong>{formatRupiah(totalEquity)}</strong></td>
                </tr>

                <tr className="formal-grand-row">
                  <td><strong>JUMLAH LIABILITAS & EKUITAS</strong></td>
                  <td className="text-right">
                    <span className="accounting-double-line">
                      {formatRupiah(totalLiabilities + totalEquity)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="formal-balance-validation">
          <span>Keterangan Status Keseimbangan Neraca:</span>
          <strong>{balanced ? 'SEIMBANG (BALANCED) — Total Aset = Total Liabilitas + Ekuitas' : 'TIDAK SEIMBANG — periksa pembukuan sebelum dicetak'}</strong>
        </div>
      </section>

      {includesSampleData && (
        <footer className="formal-report-footer">
          <div>Catatan: laporan ini masih memuat nota dan beban contoh, bukan catatan sebenarnya.</div>
        </footer>
      )}
    </article>
  )
}
