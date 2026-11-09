import type { ReactNode } from 'react'
import '../globaliti-print.css'

// Bingkai dokumen cetak. Halaman cetak diberi margin 0 supaya peramban tidak menambahkan
// tanggal, judul halaman, dan alamat; jarak tepi dibuat sendiri. Baris kepala dan kaki tabel
// diulang di setiap halaman, jadi margin atas dan bawah tetap ada di halaman kedua dan seterusnya.
export default function PrintFrame({ children }: { children: ReactNode }) {
  return (
    <table className="print-frame">
      <thead><tr><td><div className="print-frame-gap" /></td></tr></thead>
      <tbody><tr><td className="print-frame-body">{children}</td></tr></tbody>
      <tfoot><tr><td><div className="print-frame-gap" /></td></tr></tfoot>
    </table>
  )
}
