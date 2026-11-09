import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CaretRight, Printer } from '@phosphor-icons/react'
import type { Product, Sale } from '../types'
import type { BusinessProfile } from '../lib/business'
import { estimateCost } from '../lib/hpp'
import { formatDayLabel, groupSalesByDay, localDateKey, periodLabel, shiftDays } from '../lib/dailySales'
import DateRangePicker from './DateRangePicker'
import DailySalesDocument from './DailySalesDocument'
import PrintFrame from './PrintFrame'
import { safeProductImage } from '../lib/productImage'

type Preset = 'today' | '7' | '30' | 'all' | 'custom'

const PRESETS: { id: Exclude<Preset, 'custom'>; label: string }[] = [
  { id: 'today', label: 'Hari ini' },
  { id: '7', label: '7 hari' },
  { id: '30', label: '30 hari' },
  { id: 'all', label: 'Semua' },
]

const formatRupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

export default function DailySales({ sales, products, costRatio, profile }: { sales: Sale[]; products: Product[]; costRatio: number; profile: BusinessProfile }) {
  const [preset, setPreset] = useState<Preset>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [closedDays, setClosedDays] = useState<Set<string>>(new Set())
  const [openedDays, setOpenedDays] = useState<Set<string>>(new Set())
  const [printing, setPrinting] = useState(false)

  const choosePreset = (next: Exclude<Preset, 'custom'>) => {
    const today = localDateKey()
    setPreset(next)
    setTo(next === 'all' ? '' : today)
    setFrom(next === 'today' ? today : next === '7' ? shiftDays(today, -6) : next === '30' ? shiftDays(today, -29) : '')
  }

  const allDays = useMemo(() => groupSalesByDay(sales, (price) => estimateCost(price, costRatio)), [sales, costRatio])
  const markedDays = useMemo(() => new Set(allDays.flatMap((day) => (day.date ? [day.date] : []))), [allDays])
  const days = useMemo(() => allDays.filter((day) => {
    // Nota lama tanpa tanggal hanya tampil bila tidak ada batas tanggal
    if (day.date === null) return !from && !to
    return (!from || day.date >= from) && (!to || day.date <= to)
  }), [allDays, from, to])

  const totals = useMemo(() => days.reduce(
    (sum, day) => ({ revenue: sum.revenue + day.revenue, cost: sum.cost + day.cost, notes: sum.notes + day.sales.length, items: sum.items + day.items }),
    { revenue: 0, cost: 0, notes: 0, items: 0 },
  ), [days])

  // Dokumen cetak hanya dipasang selama mencetak (riwayat berbulan-bulan bisa besar). window.print()
  // menahan sampai dialog cetak ditutup, jadi dokumen dilepas lagi sesudahnya.
  useEffect(() => {
    if (!printing) return
    document.body.classList.add('printing-daily')
    window.print()
    document.body.classList.remove('printing-daily')
    setPrinting(false)
  }, [printing])

  const productName = (id: string) => products.find((product) => product.id === id)?.name ?? 'Produk dihapus'

  // Hari terbaru terbuka lebih dulu; pilihan pengguna menimpa bawaan itu.
  const isOpen = (key: string, index: number) => openedDays.has(key) || (index === 0 && !closedDays.has(key))
  const toggleDay = (key: string, index: number) => {
    const open = isOpen(key, index)
    const flip = (set: Set<string>, on: boolean) => {
      const next = new Set(set)
      if (on) next.add(key)
      else next.delete(key)
      return next
    }
    setOpenedDays((current) => flip(current, !open))
    setClosedDays((current) => flip(current, open))
  }

  return (
    <div className="daily-sales">
      <div className="daily-top">
        <h3>Penjualan per hari</h3>
        <span>{days.filter((day) => day.date).length} hari tercatat</span>
        <button type="button" className="secondary-button" disabled={days.length === 0} title={`Cetak rincian penjualan: ${periodLabel(from, to)}`} onClick={() => setPrinting(true)}>
          <Printer size={16} /> Cetak Laporan
        </button>
      </div>

      <div className="daily-filter">
        <div className="segmented" role="group" aria-label="Rentang tanggal">
          {PRESETS.map((item) => (
            <button key={item.id} type="button" className={preset === item.id ? 'active' : ''} aria-pressed={preset === item.id} onClick={() => choosePreset(item.id)}>{item.label}</button>
          ))}
        </div>
        <DateRangePicker from={from} to={to} markedDays={markedDays} onChange={(start, end) => { setPreset('custom'); setFrom(start); setTo(end) }} />
      </div>

      <div className="daily-summary">
        <div><span>Pendapatan</span><strong>{formatRupiah(totals.revenue)}</strong></div>
        <div><span>Laba kotor (estimasi)</span><strong>{formatRupiah(totals.revenue - totals.cost)}</strong></div>
        <div><span>Jumlah nota</span><strong>{totals.notes}</strong></div>
        <div><span>Item terjual</span><strong>{totals.items}</strong></div>
      </div>

      {days.length === 0 ? (
        <div className="table-empty">Tidak ada penjualan pada rentang tanggal ini.</div>
      ) : (
        <div className="daily-days">
          {days.map((day, index) => {
            const key = day.date ?? 'tanpa-tanggal'
            const open = isOpen(key, index)
            return (
              <section key={key} className={open ? 'daily-day open' : 'daily-day'}>
                <button type="button" className="daily-day-head" aria-expanded={open} onClick={() => toggleDay(key, index)}>
                  <span className="daily-day-title">
                    <CaretRight size={14} weight="bold" className="daily-caret" />
                    {day.date ? formatDayLabel(day.date) : 'Tanpa tanggal (nota lama)'}
                  </span>
                  <span className="daily-stat daily-stat-minor"><small>Nota</small><b>{day.sales.length}</b></span>
                  <span className="daily-stat daily-stat-minor"><small>Item terjual</small><b>{day.items}</b></span>
                  <span className="daily-stat"><small>Pendapatan</small><b className="daily-revenue">{formatRupiah(day.revenue)}</b></span>
                  <span className="daily-stat" title="Pendapatan dikurangi HPP estimasi"><small>Laba kotor</small><b className="daily-profit">{formatRupiah(day.revenue - day.cost)}</b></span>
                </button>

                {open && (
                  <div className="daily-day-body">
                    <div className="daily-col">
                      <p className="daily-col-title">Produk terjual<span>{day.products.some((item) => item.before !== null) ? 'stok awal → akhir hari' : 'Stok tidak tercatat pada nota lama'}</span></p>
                      <ul className="daily-products">
                        {day.products.map((item) => {
                          const product = products.find((candidate) => candidate.id === item.productId)
                          const low = item.remaining !== null && product !== undefined && item.remaining <= product.reorderPoint
                          return (
                            <li key={item.productId} className="daily-product">
                              <div className="daily-product-image" style={{ backgroundImage: `url(${safeProductImage(product?.image) ?? '/products/default-icecream.svg'})` }} role="img" aria-label={product?.name ?? item.productId} />
                              <div className="daily-product-info">
                                <strong>{productName(item.productId)}</strong>
                                <span>Terjual {item.quantity} · {formatRupiah(item.revenue)}</span>
                              </div>
                              {/* Nota lama tidak mencatat stok. Bila seluruh hari tanpa data, judul kolom yang menjelaskannya. */}
                              {item.before !== null && item.remaining !== null ? (
                                <div className={low ? 'daily-stock low' : 'daily-stock'} title="Stok sebelum penjualan pertama → setelah penjualan terakhir hari itu">
                                  <span>{item.before}</span> → <strong>{item.remaining}</strong>
                                </div>
                              ) : day.products.some((other) => other.before !== null) && (
                                <div className="daily-stock-missing">stok tidak tercatat</div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                    <div className="daily-col">
                      <p className="daily-col-title">Nota <span>{day.sales.length} transaksi</span></p>
                      <ul className="daily-notes" aria-label="Nota hari ini">
                        {day.sales.map((sale) => (
                          <li key={sale.id}>
                            <span><code>{sale.id}</code> · {sale.time} · {sale.payment}</span>
                            <strong>{formatRupiah(sale.total)}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {printing && createPortal(
        <div id="daily-print-root" aria-hidden="true">
          <PrintFrame><DailySalesDocument profile={profile} days={days} products={products} from={from} to={to} /></PrintFrame>
        </div>,
        document.body,
      )}
    </div>
  )
}
