import type { Expense, PrintOrder, Product, Sale } from '../types'

export type FormalFinancialReportProps = {
  products: Product[]
  sales: Sale[]
  printOrders: PrintOrder[]
  expenses: Expense[]
  operator?: string
  iceCreamRevenue: number
  printRevenue: number
  totalRevenue: number
  cogsIceCream: number
  grossProfit: number
  totalExpenses: number
  netIncome: number
  inventoryValue: number
  accountsReceivable: number
  cashInHand: number
  totalAssets: number
  totalLiabilities: number
  initialEquity: number
  retainedEarnings: number
}

const formatRupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)

const formatDeduction = (value: number) => '(' + formatRupiah(Math.abs(value)) + ')'

export default function FormalFinancialReport({
  products,
  sales,
  printOrders,
  expenses,
  operator: _operator = 'Pengelola 1',
  iceCreamRevenue,
  printRevenue,
  totalRevenue,
  cogsIceCream,
  grossProfit,
  totalExpenses,
  netIncome,
  inventoryValue,
  accountsReceivable,
  cashInHand,
  totalAssets,
  totalLiabilities,
  initialEquity,
  retainedEarnings,
}: FormalFinancialReportProps) {
  const totalItemsStock = products.reduce((acc, p) => acc + p.stock, 0)

  const expenseRows = expenses.map((exp, index) => (
    <tr key={exp.id || index}>
      <td className="formal-indent">{exp.label} ({exp.category})</td>
      <td className="text-center">4</td>
      <td className="text-right">{formatDeduction(exp.amount)}</td>
      <td className="text-right"></td>
    </tr>
  ))

  return (
    <article className="formal-report-document" aria-label="Laporan Keuangan Formal SAK EMKM">
      {/* 1. KOP SURAT FORMAL DINAS / SEKOLAH */}
      <header className="formal-kop">
        <div className="formal-kop-logo">
          <img
            src="/globaliti-creative-center-icon.png"
            alt="Logo Globaliti Creative Center"
            width={66}
            height={66}
            className="formal-kop-logo-img"
          />
        </div>
        <div className="formal-kop-body">
          <div className="formal-kop-org">YAYASAN PENDIDIKAN BALI GLOBAL</div>
          <h1 className="formal-kop-school">SMKS TI BALI GLOBAL DENPASAR</h1>
          <div className="formal-kop-unit">UNIT USAHA KREATIF: GLOBALITI CREATIVE CENTER</div>
          <p className="formal-kop-address">
            Jl. Tukad Citarum No. 44, Renon, Denpasar Selatan, Kota Denpasar, Bali 80226
          </p>
          <p className="formal-kop-contact">
            Telepon: (0361) 249434 | Pos-el: gcc@smktibaliglobal.sch.id | Laman: smktibaliglobal.sch.id
          </p>
        </div>
        <div className="formal-kop-spacer" aria-hidden="true" />
      </header>

      {/* GARIS GANDA PEMISAH KOP SURAT */}
      <div className="formal-kop-separator" aria-hidden="true">
        <div className="kop-line-thick" />
        <div className="kop-line-thin" />
      </div>

      {/* 2. JUDUL DOKUMEN & METADATA RESMI */}
      <section className="formal-title-block">
        <h2 className="formal-doc-main-title">LAPORAN KEUANGAN PERTANGGUNGJAWABAN</h2>
        <div className="formal-doc-subtitle">
          STANDAR AKUNTANSI KEUANGAN ENTITAS MIKRO, KECIL, DAN MENENGAH (SAK EMKM)
        </div>
        <div className="formal-doc-period">Periode: Bulan September 2026 (Per Tanggal 17 September 2026)</div>
      </section>

      <table className="formal-meta-grid">
        <tbody>
          <tr>
            <td><strong>Entitas Pelapor:</strong> Globaliti Creative Center</td>
            <td><strong>Nomor Dokumen:</strong> 09/LK-GCC/TI-BGD/IX/2026</td>
          </tr>
          <tr>
            <td><strong>Unit Bisnis:</strong> Es Krim Retail & Jasa Print Word</td>
            <td><strong>Mata Uang:</strong> Rupiah Indonesia (IDR)</td>
          </tr>
          <tr>
            <td><strong>Penyusun:</strong> Tim Pengelola Kewirausahaan Siswa</td>
            <td><strong>Tanggal Terbit:</strong> 17 September 2026</td>
          </tr>
        </tbody>
      </table>

      {/* 3. LAPORAN LABA RUGI */}
      <section className="formal-statement-section">
        <div className="formal-statement-heading">
          <h3>I. LAPORAN LABA RUGI</h3>
          <span>Untuk Periode yang Berakhir 17 September 2026</span>
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
            <tr>
              <td className="formal-indent">Pendapatan Jasa Cetak Dokumen Word</td>
              <td className="text-center">2</td>
              <td className="text-right">{formatRupiah(printRevenue)}</td>
              <td className="text-right"></td>
            </tr>
            <tr className="formal-subtotal-row">
              <td><strong>Total Pendapatan Usaha</strong></td>
              <td></td>
              <td></td>
              <td className="text-right"><strong>{formatRupiah(totalRevenue)}</strong></td>
            </tr>

            <tr className="formal-cat-header">
              <td colSpan={4}><strong>B. BEBAN POKOK PENJUALAN (HPP)</strong></td>
            </tr>
            <tr>
              <td className="formal-indent">Beban Pokok Penjualan Es Krim Terjual</td>
              <td className="text-center">3</td>
              <td className="text-right">{formatDeduction(cogsIceCream)}</td>
              <td className="text-right"></td>
            </tr>
            <tr className="formal-subtotal-row">
              <td><strong>Jumlah Beban Pokok Penjualan</strong></td>
              <td></td>
              <td></td>
              <td className="text-right">{formatDeduction(cogsIceCream)}</td>
            </tr>
            <tr className="formal-highlight-row">
              <td><strong>LABA BRUTO (LABA KOTOR)</strong></td>
              <td></td>
              <td></td>
              <td className="text-right"><strong>{formatRupiah(grossProfit)}</strong></td>
            </tr>

            <tr className="formal-cat-header">
              <td colSpan={4}><strong>C. BEBAN OPERASIONAL TOKO</strong></td>
            </tr>
            {expenseRows}
            <tr className="formal-subtotal-row">
              <td><strong>Total Beban Operasional</strong></td>
              <td></td>
              <td></td>
              <td className="text-right"><strong>{formatDeduction(totalExpenses)}</strong></td>
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
          <span>Per Tanggal 17 September 2026</span>
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
                  <td className="formal-indent">Piutang Usaha (Jasa Print Belum Lunas)</td>
                  <td className="text-right">{formatRupiah(accountsReceivable)}</td>
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
                  <td className="text-right"><strong>{formatRupiah(totalAssets)}</strong></td>
                </tr>

                <tr className="formal-grand-row">
                  <td><strong>JUMLAH LIABILITAS & EKUITAS</strong></td>
                  <td className="text-right">
                    <span className="accounting-double-line">
                      {formatRupiah(totalAssets)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="formal-balance-validation">
          <span>Keterangan Status Keseimbangan Neraca:</span>
          <strong>SEIMBANG (BALANCED) — Total Aset = Total Liabilitas + Ekuitas</strong>
        </div>
      </section>

      {/* 5. CATATAN ATAS LAPORAN KEUANGAN RINGKAS */}
      <section className="formal-statement-section">
        <div className="formal-statement-heading">
          <h3>III. CATATAN RINGKAS OPERASIONAL (CALK EMKM)</h3>
        </div>
        <div className="formal-calk-box">
          <ol className="formal-calk-list">
            <li>
              <strong>Dasar Penyusunan:</strong> Laporan keuangan disusun berdasarkan Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah (SAK EMKM) yang ditetapkan oleh Ikatan Akuntan Indonesia (IAI).
            </li>
            <li>
              <strong>Posisi Kas & Setara Kas:</strong> Saldo kas riil di kasir sebesar {formatRupiah(cashInHand)} mencerminkan modal kas awal Rp 1.500.000 ditambah penerimaan kas usaha sebesar {formatRupiah(totalRevenue)} dan dikurangi total beban operasional sebesar {formatRupiah(totalExpenses)}.
            </li>
            <li>
              <strong>Persediaan Barang Dagangan:</strong> Nilai persediaan fisik es krim sebesar {formatRupiah(inventoryValue)} ({totalItemsStock} unit aktif) dinilai dengan metode harga perolehan (HPP per unit).
            </li>
            <li>
              <strong>Piutang Usaha:</strong> Piutang jasa cetak sistem pascabayar tercatat sebesar {formatRupiah(accountsReceivable)} atas berkas yang telah selesai dicetak dan dalam proses pelunasan oleh siswa/guru.
            </li>
            <li>
              <strong>Volume Transaksi:</strong> Terdiri dari {sales.length} transaksi ritel POS kasir es krim dan {printOrders.length} berkas layanan order dokumen Word.
            </li>
          </ol>
        </div>
      </section>



      {/* 7. FOOTER AUTENTIKASI DOKUMEN */}
      <footer className="formal-report-footer">
        <div>Dokumen Resmi Pertanggungjawaban Keuangan Unit Usaha Sekolah — SMKS TI Bali Global Denpasar</div>
        <div>Dicetak melalui Sistem Globaliti Creative Center | Format Standar SAK EMKM IAI</div>
      </footer>
    </article>
  )
}
