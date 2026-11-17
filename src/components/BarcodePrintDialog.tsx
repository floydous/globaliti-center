import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { DownloadSimple, Eye, ImageSquare, ListChecks, X } from '@phosphor-icons/react'
import type { Product } from '../types'
import { ean13Modules, isValidEan13 } from '../lib/barcode'
import BarcodeImage from './BarcodeImage'
import '../globaliti-barcode.css'

export default function BarcodePrintDialog({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const printable = useMemo(() => products.filter((product) => isValidEan13(product.barcode)), [products])
  const [selected, setSelected] = useState<Set<string>>(() => {
    const generated = printable.filter((product) => product.barcodeGenerated)
    if (generated.length > 0) return new Set(generated.map((p) => p.id))
    return new Set(printable.map((p) => p.id))
  })
  const [mode, setMode] = useState<'list' | 'preview'>('list')
  const chosen = printable.filter((product) => selected.has(product.id))

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const downloadPdf = () => {
    document.body.classList.add('printing-barcodes')
    const done = () => {
      document.body.classList.remove('printing-barcodes')
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.print()
  }

  const downloadPng = () => {
    if (chosen.length === 0) return

    const cols = 3
    const rows = Math.ceil(chosen.length / cols)
    const cardWidth = 320
    const cardHeight = 150
    const gap = 16
    const padding = 24
    const titleHeight = 50

    const canvas = document.createElement('canvas')
    canvas.width = padding * 2 + cols * cardWidth + (cols - 1) * gap
    canvas.height = padding * 2 + titleHeight + rows * cardHeight + (rows - 1) * gap
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Header Title
    ctx.fillStyle = '#0f5f96'
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('LEMBAR BARCODE KASIR — GLOBALITI CREATIVE CENTER', padding, padding + 22)
    ctx.fillStyle = '#64748b'
    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillText(`${chosen.length} label barcode siap pakai untuk meja kasir`, padding, padding + 40)

    // Render each label card
    chosen.forEach((product, idx) => {
      const col = idx % cols
      const row = Math.floor(idx / cols)
      const x = padding + col * (cardWidth + gap)
      const y = padding + titleHeight + row * (cardHeight + gap)

      // Card border (dashed cutting line)
      ctx.save()
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.strokeRect(x, y, cardWidth, cardHeight)
      ctx.restore()

      // Product Name
      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(product.name, x + cardWidth / 2, y + 26, cardWidth - 20)

      // Barcode bars (EAN-13)
      const modules = ean13Modules(product.barcode)
      const quiet = 9
      const totalModules = modules.length + quiet * 2
      const barAreaWidth = cardWidth - 40
      const barWidth = barAreaWidth / totalModules
      const barHeight = 60
      const barStartX = x + 20 + quiet * barWidth
      const barY = y + 38

      ctx.fillStyle = '#000000'
      for (let i = 0; i < modules.length; i++) {
        if (modules[i] === '1') {
          ctx.fillRect(barStartX + i * barWidth, barY, Math.ceil(barWidth), barHeight)
        }
      }

      // Barcode digits
      ctx.font = '12px "IBM Plex Mono", ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(product.barcode, x + cardWidth / 2, barY + barHeight + 18)
    })

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `barcode-kasir-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  return (
    <>
      <div className="modal-backdrop-globaliti" role="presentation" onClick={onClose}>
        <div className="form-modal wide-modal barcode-dialog" role="dialog" aria-modal="true" aria-label="Cetak barcode kasir" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h2>Cetak barcode kasir</h2>
              <p className="modal-sub">Pratinjau dan unduh lembar barcode kasir sebagai dokumen PDF atau gambar PNG.</p>
            </div>
            <div className="barcode-mode-switch" role="tablist" aria-label="Mode tampilan barcode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'list'}
                className={`secondary-button ${mode === 'list' ? 'active' : ''}`}
                onClick={() => setMode('list')}
              >
                <ListChecks size={16} /> Daftar Produk ({chosen.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'preview'}
                className={`secondary-button ${mode === 'preview' ? 'active' : ''}`}
                onClick={() => setMode('preview')}
              >
                <Eye size={16} /> Pratinjau Lembar ({chosen.length})
              </button>
            </div>
          </div>

          {printable.length === 0 ? (
            <p className="barcode-empty">Belum ada produk dengan barcode yang bisa dicetak. Buat barcode lewat Tambah Produk atau Edit.</p>
          ) : mode === 'list' ? (
            <>
              <div className="barcode-bulk">
                <button type="button" className="secondary-button" onClick={() => setSelected(new Set(printable.map((product) => product.id)))}>Pilih semua</button>
                <button type="button" className="secondary-button" onClick={() => setSelected(new Set())}>Kosongkan</button>
                <span>{chosen.length} dari {printable.length} dipilih</span>
              </div>
              <ul className="barcode-list">
                {printable.map((product) => (
                  <li key={product.id}>
                    <label>
                      <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggle(product.id)} />
                      <span className="barcode-list-name">{product.name}</span>
                      <code>{product.barcode}</code>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="barcode-preview-container">
              {chosen.length === 0 ? (
                <div className="barcode-preview-empty">
                  <p>Belum ada produk yang dipilih. Beralih ke tab <strong>Daftar Produk</strong> untuk memilih barcode yang ingin dilihat atau diunduh.</p>
                </div>
              ) : (
                <div className="barcode-preview-sheet">
                  <div className="barcode-preview-sheet-header">
                    <strong>LEMBAR BARCODE KASIR</strong>
                    <span>SMKS TI Bali Global Denpasar — Globaliti Creative Center</span>
                  </div>
                  <div className="barcode-preview-grid">
                    {chosen.map((product) => (
                      <figure className="barcode-label" key={product.id}>
                        <figcaption>{product.name}</figcaption>
                        <BarcodeImage code={product.barcode} className="barcode-label-image" />
                      </figure>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="modal-footer">
            <div className="modal-footer-left">
              {mode === 'list' ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setMode('preview')}
                >
                  <Eye size={16} /> Lihat Pratinjau
                </button>
              ) : (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setMode('list')}
                >
                  <ListChecks size={16} /> Ubah Pilihan Produk
                </button>
              )}
            </div>
            <div className="modal-footer-right">
              <button type="button" className="secondary-button" onClick={onClose}>
                <X size={16} /> Tutup
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={chosen.length === 0}
                onClick={downloadPng}
                title="Unduh lembar barcode kasir sebagai berkas gambar PNG beresolusi tinggi"
              >
                <ImageSquare size={16} /> Unduh (PNG)
              </button>
              <button
                type="button"
                className="primary-action"
                disabled={chosen.length === 0}
                onClick={downloadPdf}
                title="Simpan atau unduh lembar barcode kasir sebagai dokumen PDF melalui dialog cetak sistem"
              >
                <DownloadSimple size={16} weight="bold" /> Unduh (PDF) {chosen.length > 0 ? `(${chosen.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      </div>

      {createPortal(
        <div id="barcode-print-root" aria-hidden="true">
          {chosen.map((product) => (
            <figure className="barcode-label" key={product.id}>
              <figcaption>{product.name}</figcaption>
              <BarcodeImage code={product.barcode} className="barcode-label-image" />
            </figure>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}
