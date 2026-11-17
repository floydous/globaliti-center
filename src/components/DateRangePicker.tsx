import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { localDateKey, shiftDays } from '../lib/dailySales'

type Props = {
  from: string
  to: string
  // Hari yang punya penjualan diberi titik supaya mudah dicari saat menelusuri bulan
  markedDays: Set<string>
  onChange: (from: string, to: string) => void
}

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const toKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const parseKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const shortDate = (key: string, withYear: boolean) =>
  parseKey(key).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) })

const formatRangeLabel = (from: string, to: string) => {
  if (!from && !to) return 'Pilih tanggal'
  const start = from || to
  const end = to || from
  if (start === end) return shortDate(start, true)
  const sameYear = start.slice(0, 4) === end.slice(0, 4)
  return `${shortDate(start, !sameYear)} – ${shortDate(end, true)}`
}

export default function DateRangePicker({ from, to, markedDays, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }))
  // Selama menyeret: hari awal dan hari yang sedang ditunjuk pointer
  const [anchor, setAnchor] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)

  const openPicker = () => {
    // Buka di bulan pilihan yang ada catatannya; jika tidak ada, di bulan penjualan terbaru agar langsung ada isinya
    const latest = [...markedDays].sort().at(-1)
    const focusKey = (from && markedDays.has(from) ? from : '') || (to && markedDays.has(to) ? to : '') || latest || from || to || localDateKey()
    const date = parseKey(focusKey)
    setView({ year: date.getFullYear(), month: date.getMonth() })
    setOpen(true)
  }

  const close = (returnFocus = false) => {
    setOpen(false)
    setAnchor(null)
    setHover(null)
    if (returnFocus) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const cells = useMemo(() => {
    const first = new Date(view.year, view.month, 1)
    const offset = (first.getDay() + 6) % 7 // pekan dimulai Senin
    const count = new Date(view.year, view.month + 1, 0).getDate()
    return [...Array<null>(offset).fill(null), ...Array.from({ length: count }, (_, index) => toKey(view.year, view.month, index + 1))]
  }, [view])

  const moveMonth = (delta: number) => {
    const date = new Date(view.year, view.month + delta, 1)
    setView({ year: date.getFullYear(), month: date.getMonth() })
  }

  const commit = (start: string, end: string) => {
    const [low, high] = start <= end ? [start, end] : [end, start]
    onChange(low, high)
    close(true)
  }

  const dayFromPoint = (x: number, y: number) =>
    (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-date]')?.dataset.date ?? null

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const date = dayFromPoint(event.clientX, event.clientY)
    if (!date) return
    // Shift + klik memperpanjang pilihan yang sudah ada, termasuk lintas bulan
    const start = event.shiftKey && from ? from : date
    gridRef.current?.setPointerCapture(event.pointerId)
    setAnchor(start)
    setHover(date)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (anchor === null) return
    const date = dayFromPoint(event.clientX, event.clientY)
    if (date) setHover(date)
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (anchor === null) return
    const date = dayFromPoint(event.clientX, event.clientY) ?? hover ?? anchor
    commit(anchor, date)
  }

  const [low, high] = anchor !== null && hover !== null
    ? (anchor <= hover ? [anchor, hover] : [hover, anchor])
    : [from || to, to || from]
  const today = localDateKey()
  // Hari tanpa catatan hanya berarti sejak penjualan pertama sampai hari ini;
  // sebelum itu aplikasi belum dipakai, dan hari depan belum terjadi.
  const firstRecorded = useMemo(() => [...markedDays].sort()[0] ?? null, [markedDays])

  const moveFocus = (date: string, delta: number) => {
    const next = shiftDays(date, delta)
    const target = gridRef.current?.querySelector<HTMLElement>(`[data-date="${next}"]`)
    if (target) target.focus()
    else {
      // Pindah bulan, lalu fokus setelah kisi baru dirender
      const nextDate = parseKey(next)
      setView({ year: nextDate.getFullYear(), month: nextDate.getMonth() })
      requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`[data-date="${next}"]`)?.focus())
    }
  }

  const monthTitle = new Date(view.year, view.month, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  return (
    <div
      className="date-range"
      ref={rootRef}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation()
          close(true)
        }
      }}
    >
      <button
        type="button"
        ref={triggerRef}
        className={from || to ? 'date-range-trigger has-value' : 'date-range-trigger'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Pilih tanggal"
        title={from || to ? `Rentang tanggal: ${formatRangeLabel(from, to)}` : 'Pilih tanggal'}
        onClick={() => (open ? close() : openPicker())}
      >
        <CalendarBlank size={16} />
        <span>{formatRangeLabel(from, to)}</span>
      </button>

      {open && (
        <div className="date-range-panel" role="dialog" aria-label="Pilih rentang tanggal">
          <div className="date-range-head">
            <button type="button" className="date-range-nav" onClick={() => moveMonth(-1)} aria-label="Bulan sebelumnya"><CaretLeft size={16} /></button>
            <strong aria-live="polite">{monthTitle}</strong>
            <button type="button" className="date-range-nav" onClick={() => moveMonth(1)} aria-label="Bulan berikutnya"><CaretRight size={16} /></button>
          </div>
          <div className="date-range-weekdays" aria-hidden="true">
            {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div
            className="date-range-grid"
            ref={gridRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => { setAnchor(null); setHover(null) }}
          >
            {cells.map((key, index) => {
              if (!key) return <span key={`blank-${index}`} className="date-range-blank" />
              const inRange = Boolean(low && high && key >= low && key <= high)
              const classes = ['date-range-day']
              if (inRange) classes.push('in-range')
              if (key === low) classes.push('range-start')
              if (key === high) classes.push('range-end')
              if (key === today) classes.push('today')
              const hasRecord = markedDays.has(key)
              const noRecord = !hasRecord && firstRecorded !== null && key >= firstRecorded && key <= today
              if (hasRecord) classes.push('marked')
              if (noRecord) classes.push('empty')
              return (
                <button
                  key={key}
                  type="button"
                  data-date={key}
                  className={classes.join(' ')}
                  aria-pressed={inRange}
                  aria-label={parseKey(key).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + (hasRecord ? ', ada penjualan' : noRecord ? ', tidak ada catatan penjualan' : '')}
                  // Pointer ditangani lewat seret; klik tanpa pointer (keyboard, pembaca layar) memilih satu hari
                  onClick={(event) => { if (event.detail === 0) commit(event.shiftKey && from ? from : key, key) }}
                  onKeyDown={(event) => {
                    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key]
                    if (step !== undefined) {
                      event.preventDefault()
                      moveFocus(key, step)
                    }
                  }}
                >
                  {Number(key.slice(8))}
                </button>
              )
            })}
          </div>
          <div className="date-range-legend">
            <span><i className="legend-dot has" /> Ada penjualan</span>
            <span><i className="legend-dot none" /> Tidak ada catatan</span>
          </div>
          <p className="date-range-hint">Seret dari satu tanggal ke tanggal lain untuk memilih rentang. Klik satu tanggal untuk laporan satu hari.</p>
        </div>
      )}
    </div>
  )
}
