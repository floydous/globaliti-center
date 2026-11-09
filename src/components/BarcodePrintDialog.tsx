import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer } from '@phosphor-icons/react'
import type { Product } from '../types'
import { isValidEan13 } from '../lib/barcode'
import BarcodeImage from './BarcodeImage'
import '../globaliti-barcode.css'

// Lembar label barcode untuk ditempel di meja kasir: pelanggan membeli produk tanpa barcode
// pabrik, kasir cukup memindai label produk itu.
export default function BarcodePrintDialog({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const printable = useMemo(() => products.filter((product) => isValidEan13(product.barcode)), [products])
  const [selected, setSelected] = useState<Set<string>>(() => new Set(printable.filter((product) => product.barcodeGenerated).map((product) => product.id)))
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

  const print = () => {
    document.body.classList.add('printing-barcodes')
    const done = () => {
      document.body.classList.remove('printing-barcodes')
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.print()
  }

  return (
    <>
      <div className="modal-backdrop-globaliti" role="presentation" onClick={onClose}>
        <div className="form-modal wide-modal barcode-dialog" role="dialog" aria-modal="true" aria-label="Cetak barcode kasir" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h2>Cetak barcode kasir</h2>
              <p className="modal-sub">Tempel lembar cetak di dekat kasir. Saat pelanggan membeli produk tanpa barcode, pindai label produk itu.</p>
            </div>
          </div>

          {printable.length === 0 ? (
            <p className="barcode-empty">Belum ada produk dengan barcode yang bisa dicetak. Buat barcode lewat Tambah Produk atau Edit.</p>
          ) : (
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
          )}

          <div className="modal-footer">
            <button type="button" className="secondary-button" onClick={onClose}>Tutup</button>
            <button type="button" className="primary-action" disabled={chosen.length === 0} onClick={print}>
              <Printer size={16} /> Cetak {chosen.length > 0 ? `(${chosen.length})` : ''}
            </button>
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
