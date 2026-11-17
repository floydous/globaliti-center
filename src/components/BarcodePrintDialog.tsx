import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Eye, ImageSquare, ListChecks, X } from '@phosphor-icons/react'
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

  const downloadPng = () => {
    if (chosen.length === 0) return

    const cleanName = chosen[0].name.trim().replace(/[\\/:*?"<>|]/g, '-')
    const filename = chosen.length === 1
      ? `barcode-${cleanName}.png`
      : `barcode-${cleanName}-dkk.png`

    if (chosen.length === 1) {
      // Barcode tunggal: ukuran pas, hanya barcode murni tanpa teks sama sekali
      const product = chosen[0]
      const modules = ean13Modules(product.barcode)
      const quiet = 9
      const totalModules = modules.length + quiet * 2
      const moduleWidth = 4
      const barHeight = 160
      const padding = 20

      const canvas = document.createElement('canvas')
      canvas.width = totalModules * moduleWidth + padding * 2
      canvas.height = barHeight + padding * 2
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Latar belakang putih bersih
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Garis barcode hitam murni (tanpa teks nama produk, tanpa angka, tanpa garis putus-putus)
      ctx.fillStyle = '#000000'
      const startX = padding + quiet * moduleWidth
      const startY = padding

      for (let i = 0; i < modules.length; i++) {
        if (modules[i] === '1') {
          ctx.fillRect(startX + i * moduleWidth, startY, moduleWidth, barHeight)
        }
      }

      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
      return
    }

    // Banyak barcode: grid barcode murni tanpa teks judul, nama produk, maupun angka
    const cols = Math.min(chosen.length, 3)
    const rows = Math.ceil(chosen.length / cols)
    const cardWidth = 320
    const cardHeight = 130
    const gap = 16
    const padding = 20

    const canvas = document.createElement('canvas')
    canvas.width = padding * 2 + cols * cardWidth + (cols - 1) * gap
    canvas.height = padding * 2 + rows * cardHeight + (rows - 1) * gap
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    chosen.forEach((product, idx) => {
      const col = idx % cols
      const row = Math.floor(idx / cols)
      const x = padding + col * (cardWidth + gap)
      const y = padding + row * (cardHeight + gap)

      const modules = ean13Modules(product.barcode)
      const quiet = 9
      const totalModules = modules.length + quiet * 2
      const barAreaWidth = cardWidth - 32
      const barWidth = barAreaWidth / totalModules
      const barHeight = cardHeight - 24
      const barStartX = x + 16 + quiet * barWidth
      const barY = y + 12

      ctx.fillStyle = '#000000'
      for (let i = 0; i < modules.length; i++) {
        if (modules[i] === '1') {
          ctx.fillRect(barStartX + i * barWidth, barY, Math.ceil(barWidth), barHeight)
        }
      }
    })

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
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
              <p className="modal-sub">Pratinjau dan unduh lembar barcode kasir sebagai berkas gambar PNG.</p>
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
                  <div className="barcode-preview-grid">
                    {chosen.map((product) => (
                      <figure className="barcode-label" key={product.id}>
                        <BarcodeImage code={product.barcode} showText={false} className="barcode-label-image" />
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
                className="primary-action"
                disabled={chosen.length === 0}
                onClick={downloadPng}
                title="Unduh lembar barcode kasir sebagai berkas gambar PNG beresolusi tinggi"
              >
                <ImageSquare size={16} weight="bold" /> Unduh Gambar (PNG) {chosen.length > 0 ? `(${chosen.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      </div>

      {createPortal(
        <div id="barcode-print-root" aria-hidden="true">
          {chosen.map((product) => (
            <figure className="barcode-label" key={product.id}>
              <BarcodeImage code={product.barcode} showText={false} className="barcode-label-image" />
            </figure>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}
