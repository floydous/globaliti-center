import type { Product } from '../types'
import type { DayRow } from '../lib/dailySales'
import type { BusinessProfile } from '../lib/business'
import FormalKop from './FormalKop'
import { formatDayLabel, periodLabel } from '../lib/dailySales'
import '../globaliti-daily-print.css'

const formatRupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

type Props = {
  profile: BusinessProfile
  days: DayRow[]
  products: Product[]
  from: string
  to: string
}

// Dokumen cetak Penjualan Harian: ada di luar #root dan hanya tampil saat mencetak.
export default function DailySalesDocument({ profile, days, products, from, to }: Props) {
  const nameOf = (id: string) => products.find((product) => product.id === id)?.name ?? 'Produk dihapus'
  const revenue = days.reduce((sum, day) => sum + day.revenue, 0)
  const cost = days.reduce((sum, day) => sum + day.cost, 0)
  const notes = days.reduce((sum, day) => sum + day.sales.length, 0)
  const items = days.reduce((sum, day) => sum + day.items, 0)
  const hasSample = days.some((day) => day.sales.some((sale) => sale.sample))
  const printedAt = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })

  return (
    <article className="formal-report-document daily-doc" aria-label="Dokumen penjualan harian">
      <FormalKop profile={profile} />

      <section className="formal-title-block">
        <h2 className="formal-doc-main-title">LAPORAN PENJUALAN HARIAN</h2>
        <div className="formal-doc-period">Periode: {periodLabel(from, to)}</div>
      </section>

      <table className="daily-doc-summary">
        <tbody>
          <tr><th>Jumlah nota</th><td>{notes}</td><th>Pendapatan</th><td>{formatRupiah(revenue)}</td></tr>
          <tr><th>Item terjual</th><td>{items}</td><th>Laba kotor (estimasi)</th><td>{formatRupiah(revenue - cost)}</td></tr>
        </tbody>
      </table>

      {days.map((day) => (
        <section className="daily-doc-day" key={day.date ?? 'tanpa-tanggal'}>
          <h2>{day.date ? formatDayLabel(day.date) : 'Tanpa tanggal (nota lama)'}</h2>
          <p className="daily-doc-day-sum">
            {day.sales.length} nota · {day.items} item · Pendapatan {formatRupiah(day.revenue)} · Laba kotor (estimasi) {formatRupiah(day.revenue - day.cost)}
          </p>

          <table className="daily-doc-table">
            <thead>
              <tr><th>Produk</th><th className="num">Terjual</th><th className="num">Pendapatan</th><th className="num">Stok awal</th><th className="num">Stok akhir</th></tr>
            </thead>
            <tbody>
              {day.products.map((item) => (
                <tr key={item.productId}>
                  <td>{nameOf(item.productId)}</td>
                  <td className="num">{item.quantity}</td>
                  <td className="num">{formatRupiah(item.revenue)}</td>
                  <td className="num">{item.before ?? '-'}</td>
                  <td className="num">{item.remaining ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <footer className="daily-doc-foot">
        {hasSample && <p>Dokumen ini memuat data contoh.</p>}
        <p>Laba kotor dihitung dari estimasi HPP, bukan harga modal sebenarnya. Stok awal dan akhir hanya tercatat untuk nota yang dibuat setelah fitur stok harian ada.</p>
        <p>Dicetak pada {printedAt}</p>
      </footer>
    </article>
  )
}
