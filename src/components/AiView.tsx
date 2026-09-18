import { useEffect, useRef, useState } from 'react'
import {
  Broom,
  Check,
  PaperPlaneTilt,
  Robot,
  User,
  X,
} from '@phosphor-icons/react'
import MarkdownContent from './MarkdownContent'
import { SYSTEM_MANUAL_MD } from '../docs/systemManual'
import type { AiAction, AiMessage, Expense, PrintOrder, Product, Sale } from '../types'

type AiViewProps = {
  products: Product[]
  sales: Sale[]
  printOrders: PrintOrder[]
  expenses: Expense[]
  groqKey?: string
  messages: AiMessage[]
  onUpdateMessages: React.Dispatch<React.SetStateAction<AiMessage[]>>
  onAdjustStock: (productId: string, delta: number, reason: string) => void
  onRecordSale?: (items: Array<{ productId: string; quantity: number; price: number }>, payment: 'Tunai' | 'QRIS') => void
  onRecordExpense?: (category: 'Operasional' | 'Bahan' | 'Lainnya', description: string, amount: number) => void
  onCreatePrintOrder?: (fileName: string, mode: 'Hitam putih' | 'Berwarna', quantity: number, payment: 'Lunas di muka' | 'Bayar di akhir') => void
  onUpdatePrintOrder?: (orderId: string, status?: 'Menunggu cetak' | 'Dicetak' | 'Selesai', payment?: 'Lunas di muka' | 'Bayar di akhir' | 'Lunas setelah cetak') => void
  onUpdatePrice?: (productId: string, newPrice: number) => void
  onAddProduct?: (product: Omit<Product, 'id' | 'active'>) => void
  onClearChat?: () => void
  variant?: 'page' | 'floating'
}

const formatRupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)

export default function AiView({
  products,
  sales,
  printOrders,
  expenses,
  groqKey,
  messages,
  onUpdateMessages,
  onAdjustStock,
  onRecordSale,
  onRecordExpense,
  onCreatePrintOrder,
  onUpdatePrintOrder,
  onUpdatePrice,
  onAddProduct,
  onClearChat,
  variant = 'page',
}: AiViewProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, loading])

  // Helper untuk mencari produk yang disebut dalam teks (lengkap atau kata kunci spesifik)
  const findProductInText = (text: string): Product | undefined => {
    const t = text.toLowerCase()
    // 1. Coba match nama lengkap (misal: "vanilla cone", "matcha cup")
    const exact = products.find((p) => t.includes(p.name.toLowerCase()))
    if (exact) return exact

    // 2. Coba match kata unik nama produk atau kata rasa
    return products.find((p) => {
      const words = p.name.toLowerCase().split(' ')
      return words.some((w) => w.length >= 4 && t.includes(w))
    })
  }

  // Engine Local Tool Handler / Intelligent Assistant
  const processQuery = (query: string, history: AiMessage[] = []): { text: string; action?: AiAction } => {
    const q = query.toLowerCase().trim()

    // 1. Salam / Sapaan Ramah (Halo, Hai, Pagi, Siang, Malam, Tes, Assalamualaikum, dsb)
    const isGreeting = /^(halo|hai|hi|hey|hei|pagi|siang|sore|malam|selamat pagi|selamat siang|selamat sore|selamat malam|tes|test|halo\?|assalamualaikum)[\s?!.]*$/i.test(q)
    if (isGreeting) {
      return {
        text: 'Halo! Ada yang bisa saya bantu untuk operasional kasir, cek stok es krim, atau jasa print hari ini? Anda bisa tanya stok, minta bantu catat barang keluar/masuk, atau cek penjualan.',
      }
    }

    // 2. Ucapan Terima Kasih / Closing
    if (/^(terima kasih|makasih|thanks|thank you|matur suksma|mantap|siap|sip)[\s?!.]*$/i.test(q)) {
      return {
        text: 'Sama-sama! Senang bisa membantu kelancaran operasional toko. Semangat melayani pelanggan!',
      }
    }

    // Cari produk di pesan saat ini, atau dari konteks percakapan terakhir
    let matchedProduct = findProductInText(q)
    if (!matchedProduct && history.length > 0) {
      for (let i = history.length - 1; i >= 0; i--) {
        const p = findProductInText(history[i].text)
        if (p) {
          matchedProduct = p
          break
        }
      }
    }

    // Ekstrak angka kuantitas (misal: "2 cup", "beli 1", "ada 12 cone", dsb)
    const matchNum = q.match(/\d+/)
    const extractedQty = matchNum ? parseInt(matchNum[0], 10) : null

    // 2b. Pertanyaan Skeptis / Konfirmasi ("Yakin?", "Beneran?", "Serius?", "Masa sih?")
    const isSkeptic = /^(yakin\??|beneran\??|serius\??|masa\??|masa sih\??|kamu yakin\??|bener\??)[\s?!.]*$/i.test(q)
    if (isSkeptic) {
      if (matchedProduct) {
        return {
          text: `Berdasarkan catatan sistem kasir saat ini, stok tercatat **${matchedProduct.name}** adalah **${matchedProduct.stock} ${matchedProduct.unit}**.\n\nNamun jika jumlah fisik di freezer berbeda (misalnya ada barang rusak atau penjualan belum sempat diinput), beri tahu saya jumlah aslinya (contoh: *"Di freezer hanya ada 12"*). Saya akan langsung siapkan kartu penyesuaian stok opname agar sistem sinkron dengan fisik.`,
        }
      }
      return {
        text: `Data yang saya tampilkan berdasarkan catatan transaksi kasir dan mutasi stok saat ini. Jika Anda menemukan selisih dengan fisik di freezer atau toko, beri tahu saya agar bisa disesuaikan.`,
      }
    }

    // 2c. Intent Selisih Stok Fisik / Stok Opname / Freezer
    // Contoh: "Tapi di freezer hanya ada 12 cone", "di kulkas cuma ada 10", "fisik cuma 12", "aslinya cuma 12", "ternyata tinggal 12"
    const isPhysicalDiscrepancy = (
      ['freezer', 'kulkas', 'showcase', 'etalase', 'lemari es', 'gudang', 'rak', 'fisik', 'nyata', 'aslinya', 'sebenarnya', 'riil', 'opname', 'hitung'].some((k) => q.includes(k)) ||
      (['tapi', 'cuma', 'hanya', 'tinggal', 'ternyata', 'kok'].some((k) => q.includes(k)) && ['ada', 'tersisa', 'sisa', 'hitung'].some((k) => q.includes(k)))
    ) && extractedQty !== null && matchedProduct

    if (isPhysicalDiscrepancy && matchedProduct && extractedQty !== null) {
      const physicalStock = extractedQty
      const systemStock = matchedProduct.stock
      const delta = physicalStock - systemStock

      if (delta < 0) {
        const diff = Math.abs(delta)
        return {
          text: `Baik, saya catat ada selisih fisik untuk **${matchedProduct.name}**:\n\n- **Catatan Sistem:** ${systemStock} ${matchedProduct.unit}\n- **Fisik di Freezer:** **${physicalStock} ${matchedProduct.unit}**\n- **Selisih:** **-${diff} ${matchedProduct.unit}**\n\nHal ini bisa disebabkan oleh barang rusak, mencair, atau penjualan yang belum sempat tercatat di kasir. Saya telah menyiapkan kartu penyesuaian stok opname untuk menyinkronkan stok sistem menjadi **${physicalStock} ${matchedProduct.unit}**.\n\nSilakan klik **Terapkan Perubahan** di bawah ini:`,
          action: {
            id: `act-${Date.now()}`,
            action: 'adjust_stock',
            description: `Sesuaikan stok opname ${matchedProduct.name} menjadi ${physicalStock} ${matchedProduct.unit} (-${diff} ${matchedProduct.unit} selisih fisik)`,
            params: {
              productId: matchedProduct.id,
              delta: delta,
              reason: 'Penyesuaian stok opname fisik di freezer',
            },
            status: 'pending',
          },
        }
      } else if (delta > 0) {
        return {
          text: `Baik, fisik di freezer ternyata lebih banyak dari catatan sistem untuk **${matchedProduct.name}**:\n\n- **Catatan Sistem:** ${systemStock} ${matchedProduct.unit}\n- **Fisik di Freezer:** **${physicalStock} ${matchedProduct.unit}**\n- **Selisih:** **+${delta} ${matchedProduct.unit}**\n\nSaya telah menyiapkan kartu penyesuaian stok opname untuk menyinkronkan stok sistem menjadi **${physicalStock} ${matchedProduct.unit}**.\n\nSilakan periksa dan klik **Terapkan Perubahan** di bawah ini:`,
          action: {
            id: `act-${Date.now()}`,
            action: 'adjust_stock',
            description: `Sesuaikan stok opname ${matchedProduct.name} menjadi ${physicalStock} ${matchedProduct.unit} (+${delta} ${matchedProduct.unit} selisih fisik)`,
            params: {
              productId: matchedProduct.id,
              delta: delta,
              reason: 'Penyesuaian stok opname fisik di freezer',
            },
            status: 'pending',
          },
        }
      } else {
        return {
          text: `Jumlah fisik di freezer (**${physicalStock} ${matchedProduct.unit}**) sudah sama persis dengan catatan sistem saat ini (**${systemStock} ${matchedProduct.unit}**). Data stok sudah sinkron.`,
        }
      }
    }

    const isDamagedOrLost = ['rusak', 'pecah', 'mencair', 'cair', 'basi', 'hilang', 'kedaluwarsa', 'expired'].some((k) => q.includes(k))
    const isRestock = (q.includes('tambah stok') || q.includes('tambah') || q.includes('masuk') || q.includes('kiriman') || q.includes('restock') || q.includes('kulakan')) && !isDamagedOrLost

    // 3. Intent Pencatatan Penjualan / Barang Laku / Lupa Diinput ke Kasir
    // Contoh: "seseorang membeli matcha cup tapi saya lupa memasukan datanya ke sini, bisakah kamu melakukannya untuk k"
    // Contoh: "catat penjualan matcha cup 2 tunai", "ada yang beli cokelat stick 3"
    const isExplicitSale = ['jual', 'penjualan', 'catat penjualan', 'transaksi', 'laku', 'terjual'].some((k) => q.includes(k))
    const isUnrecordedSale = ['lupa input', 'lupa masukin', 'lupa catat', 'lupa memasukan', 'belum diinput', 'belum masuk'].some((k) => q.includes(k)) ||
      (['beli', 'membeli', 'ada yang beli', 'seseorang membeli'].some((k) => q.includes(k)) && !q.includes('beli bahan') && !q.includes('beli kertas'))

    if ((isExplicitSale || isUnrecordedSale) && matchedProduct) {
      const qty = extractedQty && extractedQty > 0 ? extractedQty : 1
      const isQris = q.includes('qris')
      const paymentMethod: 'Tunai' | 'QRIS' = isQris ? 'QRIS' : 'Tunai'
      const totalPrice = matchedProduct.price * qty

      return {
        text: `Baik, saya langsung siapkan pencatatan transaksi penjualan untuk Anda:\n\n- **Produk:** ${matchedProduct.name} (${qty} ${matchedProduct.unit})\n- **Total Pendapatan:** **${formatRupiah(totalPrice)}**\n- **Metode Pembayaran:** ${paymentMethod}\n\nSetelah Anda menekan **Terapkan Transaksi**, sistem akan otomatis memotong stok fisik (-${qty} ${matchedProduct.unit}) dan memasukkan uang penjualan ke buku kas laporan keuangan hari ini.`,
        action: {
          id: `act-${Date.now()}`,
          action: 'record_sale',
          description: `Catat transaksi penjualan: ${matchedProduct.name} (${qty} ${matchedProduct.unit}) senilai ${formatRupiah(totalPrice)} via ${paymentMethod}`,
          params: {
            items: [{ productId: matchedProduct.id, quantity: qty, price: matchedProduct.price }],
            payment: paymentMethod,
          },
          status: 'pending',
        },
      }
    }

    // Tangani barang rusak / mencair / hilang / koreksi stok keluar non-penjualan
    if (isDamagedOrLost && matchedProduct) {
      const qty = extractedQty && extractedQty > 0 ? extractedQty : 1
      const nextStock = Math.max(0, matchedProduct.stock - qty)
      return {
        text: `Saya mengerti. Untuk produk **${matchedProduct.name}** yang rusak/mencair sebanyak **${qty} ${matchedProduct.unit}**, saya sudah siapkan kartu penyesuaian untuk mengeluarkan item tersebut dari stok fisik (dari ${matchedProduct.stock} menjadi ${nextStock} ${matchedProduct.unit}).\n\nSilakan periksa dan klik **Terapkan Perubahan** di bawah:`,
        action: {
          id: `act-${Date.now()}`,
          action: 'adjust_stock',
          description: `Koreksi stok ${matchedProduct.name} (-${qty} ${matchedProduct.unit}) karena rusak/mencair`,
          params: {
            productId: matchedProduct.id,
            delta: -qty,
            reason: 'Koreksi stok barang rusak/hilang',
          },
          status: 'pending',
        },
      }
    }

    // 4. Intent Catat Beban Operasional Toko
    // Contoh: "catat beban beli kertas 50000", "pengeluaran listrik 100000", "beban operasional beli sabun 15000"
    const isExpense = ['beban', 'biaya', 'pengeluaran', 'ongkos', 'bayar listrik', 'beli kertas', 'beli tinta', 'beli sabun', 'beli kantong'].some((k) => q.includes(k))
    if (isExpense && matchNum) {
      const amount = parseInt(matchNum[0], 10)
      const isBahan = ['bahan', 'kertas', 'tinta', 'cup', 'stick', 'plastik'].some((k) => q.includes(k))
      const category: 'Operasional' | 'Bahan' | 'Lainnya' = isBahan ? 'Bahan' : 'Operasional'
      const cleanDesc = q
        .replace(/catat|beban|biaya|pengeluaran|sebesar|rp|\d+/gi, '')
        .trim() || (isBahan ? 'Pembelian Bahan/Perlengkapan' : 'Beban Operasional Toko')
      const formattedDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1)

      return {
        text: `Saya telah menyiapkan pencatatan beban pengeluaran toko untuk Anda:\n\n- **Kategori Beban:** ${category}\n- **Keterangan:** ${formattedDesc}\n- **Jumlah Nominal:** **${formatRupiah(amount)}**\n\nSetelah Anda klik **Terapkan Perubahan**, pengeluaran ini langsung dibukukan ke Laporan Keuangan Laba Rugi dan kas toko.`,
        action: {
          id: `act-${Date.now()}`,
          action: 'record_expense',
          description: `Catat beban ${formattedDesc} (${category}) senilai ${formatRupiah(amount)}`,
          params: {
            category,
            description: formattedDesc,
            amount,
          },
          status: 'pending',
        },
      }
    }

    // 5. Intent Order Print Dokumen Word
    // Contoh: "buat order print tugas_sejarah.docx 5 halaman hitam putih lunas", "order cetak laporan.docx 10 halaman warna bayar akhir"
    const isPrintOrder = ['order print', 'cetak dokumen', 'print word', 'print tugas', 'order cetak', 'buat order print'].some((k) => q.includes(k))
    if (isPrintOrder) {
      const isColor = ['warna', 'berwarna', 'color'].some((k) => q.includes(k))
      const mode: 'Hitam putih' | 'Berwarna' = isColor ? 'Berwarna' : 'Hitam putih'
      const isPostpaid = ['bayar di akhir', 'bayar akhir', 'pascabayar', 'nanti'].some((k) => q.includes(k))
      const payment: 'Lunas di muka' | 'Bayar di akhir' = isPostpaid ? 'Bayar di akhir' : 'Lunas di muka'
      const pages = extractedQty && extractedQty > 0 ? extractedQty : 1

      // Ekstrak nama file (misal xxx.docx atau nama setelah kata print/cetak)
      const fileMatch = q.match(/[\w-]+\.(?:docx|doc|pdf)/i) || q.match(/(?:print|cetak)\s+([\w\s_-]+?)(?:\s+\d+|\s+halaman|\s+hitam|\s+warna|$)/i)
      const rawFileName = fileMatch ? (fileMatch[1] ? fileMatch[1].trim() : fileMatch[0].trim()) : 'Dokumen_Siswa.docx'
      const fileName = rawFileName.includes('.') ? rawFileName : `${rawFileName}.docx`

      return {
        text: `Saya telah menyiapkan order jasa cetak dokumen Word untuk Anda:\n\n- **Nama File:** \`${fileName}\`\n- **Mode Cetak:** ${mode}\n- **Jumlah:** ${pages} halaman\n- **Status Pembayaran:** **${payment}**\n\nSilakan periksa kartu aksi di bawah dan klik **Terapkan Perubahan** untuk memasukkan order ke antrean cetak.`,
        action: {
          id: `act-${Date.now()}`,
          action: 'create_print_order',
          description: `Buat order cetak ${fileName} (${pages} hal, ${mode}, ${payment})`,
          params: {
            fileName,
            mode,
            quantity: pages,
            payment,
          },
          status: 'pending',
        },
      }
    }

    // 6. Intent Pelunasan / Selesai Order Print
    // Contoh: "tandai lunas print PRINT-0001", "selesaikan order print PRINT-0002"
    if (q.includes('print-') || (q.includes('order print') && (q.includes('lunas') || q.includes('selesai')))) {
      const orderIdMatch = q.match(/print-\d+/i)
      const targetOrderId = orderIdMatch ? orderIdMatch[0].toUpperCase() : printOrders[0]?.id
      const targetOrder = printOrders.find((o) => o.id.toUpperCase() === targetOrderId?.toUpperCase())

      if (targetOrder) {
        const wantsLunas = q.includes('lunas') || q.includes('bayar')
        const newStatus = q.includes('selesai') ? 'Selesai' : undefined
        const newPayment = wantsLunas ? 'Lunas setelah cetak' : undefined

        return {
          text: `Saya telah menyiapkan pembaruan data untuk antrean print **${targetOrder.id}** (${targetOrder.fileName}):\n\n${newStatus ? `- **Status Pengerjaan:** Selesai\n` : ''}${newPayment ? `- **Status Pembayaran:** Lunas\n` : ''}\nSetelah diterapkan, sistem akan memperbarui antrean cetak dan mencatat penerimaan kas jika ada pelunasan.`,
          action: {
            id: `act-${Date.now()}`,
            action: 'update_print_order',
            description: `Perbarui order ${targetOrder.id}: ${newStatus || ''} ${newPayment || ''}`.trim(),
            params: {
              orderId: targetOrder.id,
              status: newStatus,
              payment: newPayment,
            },
            status: 'pending',
          },
        }
      }
    }

    // 7. Intent Ubah Harga Jual Produk
    // Contoh: "ubah harga matcha cup jadi 9000", "ganti harga vanilla cone 7000"
    const isPriceChange = (q.includes('ubah harga') || q.includes('ganti harga') || q.includes('set harga')) && matchedProduct && matchNum
    if (isPriceChange && matchedProduct && matchNum) {
      const newPrice = parseInt(matchNum[0], 10)
      return {
        text: `Saya telah menyiapkan kartu konfirmasi perubahan harga jual produk **${matchedProduct.name}** dari ${formatRupiah(matchedProduct.price)} menjadi **${formatRupiah(newPrice)}**.\n\nSilakan klik **Terapkan Perubahan** di bawah ini:`,
        action: {
          id: `act-${Date.now()}`,
          action: 'update_price',
          description: `Ubah harga jual ${matchedProduct.name} dari ${formatRupiah(matchedProduct.price)} menjadi ${formatRupiah(newPrice)}`,
          params: {
            productId: matchedProduct.id,
            newPrice,
          },
          status: 'pending',
        },
      }
    }

    // Tangani tambah stok / restock
    if (isRestock) {
      if (matchedProduct) {
        const qty = extractedQty && extractedQty > 0 ? extractedQty : 10
        const nextStock = matchedProduct.stock + qty
        return {
          text: `Saya telah menyiapkan kartu konfirmasi penambahan stok untuk **${matchedProduct.name}** sebanyak **+${qty} ${matchedProduct.unit}** (stok akan bertambah dari ${matchedProduct.stock} menjadi ${nextStock} ${matchedProduct.unit}).\n\nSilakan klik **Terapkan Perubahan** di bawah jika sudah sesuai fisik barang.`,
          action: {
            id: `act-${Date.now()}`,
            action: 'adjust_stock',
            description: `Tambah stok ${matchedProduct.name} sebanyak ${qty} ${matchedProduct.unit}`,
            params: {
              productId: matchedProduct.id,
              delta: qty,
              reason: 'Penambahan stok via asisten AI',
            },
            status: 'pending',
          },
        }
      } else {
        return {
          text: `Produk mana yang ingin ditambah stoknya? Produk yang tersedia saat ini:\n${products.map((p) => `- ${p.name} (sisa ${p.stock} ${p.unit})`).join('\n')}\n\nSebutkan nama produk dan jumlahnya, contoh: *"Tambah stok Vanilla Cone 10"*`,
        }
      }
    }

    // 4. Cek Stok Produk Spesifik (Jawaban Ramah & Tidak Teknikal)
    // Contoh: "berapa stok matcha cup sekarang?", "sisa matcha cup?", "ada matcha cup?"
    if (matchedProduct) {
      const wantsTechnical = ['barcode', 'modal', 'hpp', 'detail', 'lengkap', 'spesifikasi', 'kode'].some((k) => q.includes(k))

      if (wantsTechnical) {
        return {
          text: `Data detail produk **${matchedProduct.name}**:\n- **Barcode:** \`${matchedProduct.barcode}\`\n- **Stok Fisik:** ${matchedProduct.stock} ${matchedProduct.unit}\n- **Harga Jual:** ${formatRupiah(matchedProduct.price)}\n- **Harga Modal (HPP):** ${formatRupiah(matchedProduct.cost)}\n- **Batas Minimum:** ${matchedProduct.reorderPoint} ${matchedProduct.unit}\n- **Status:** ${matchedProduct.active ? 'Aktif' : 'Nonaktif'}`,
        }
      }

      const isLow = matchedProduct.stock <= matchedProduct.reorderPoint
      const stockNote = isLow
        ? `⚠️ **Perhatian:** Stok sudah menipis (di bawah batas aman ${matchedProduct.reorderPoint} ${matchedProduct.unit}). Sebaiknya segera pesan kembali.`
        : `Stok saat ini masih aman di atas batas minimum (${matchedProduct.reorderPoint} ${matchedProduct.unit}).`

      return {
        text: `Sisa stok **${matchedProduct.name}** saat ini ada **${matchedProduct.stock} ${matchedProduct.unit}** di toko dengan harga jual **${formatRupiah(matchedProduct.price)}**.\n\n${stockNote}`,
      }
    }

    // 5. Cek Stok Menipis / Perlu Reorder
    if (q.includes('menipis') || q.includes('sedikit') || q.includes('rendah') || q.includes('habis') || q.includes('reorder') || q.includes('mau habis')) {
      const lowStock = products.filter((p) => p.stock <= p.reorderPoint)
      if (lowStock.length === 0) {
        return {
          text: 'Semua produk saat ini dalam jumlah aman di atas batas minimum. Tidak ada stok yang menipis.',
        }
      }
      const list = lowStock
        .map((p) => `- **${p.name}:** tersisa **${p.stock} ${p.unit}** (batas aman: ${p.reorderPoint} ${p.unit})`)
        .join('\n')
      return {
        text: `Ada ${lowStock.length} produk yang stoknya mulai menipis:\n\n${list}\n\nDisarankan untuk segera menghubungi penyedia es krim untuk menambah persediaan.`,
      }
    }

    // 6. Cek Penjualan / Omzet / Laba Hari Ini
    if (q.includes('penjualan') || q.includes('omzet') || q.includes('pendapatan') || q.includes('laba') || q.includes('untung') || q.includes('keuangan')) {
      const iceCreamRev = sales.reduce((sum, s) => sum + s.total, 0)
      const printRev = printOrders
        .filter((o) => o.status === 'Selesai' || o.payment === 'Lunas di muka' || o.payment === 'Lunas setelah cetak')
        .reduce((sum, o) => sum + o.total, 0)
      const totalRev = iceCreamRev + printRev

      let cogs = 0
      sales.forEach((s) => {
        s.items.forEach((it) => {
          const p = products.find((prod) => prod.id === it.productId)
          cogs += (p ? p.cost : it.price * 0.5) * it.quantity
        })
      })
      const grossProfit = totalRev - cogs
      const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0)
      const netProfit = grossProfit - totalExp

      return {
        text: `Ringkasan penjualan dan keuntungan hari ini:\n\n- **Penjualan Es Krim:** ${formatRupiah(iceCreamRev)} (${sales.length} nota transaksi)\n- **Pendapatan Jasa Print Word:** ${formatRupiah(printRev)}\n- **Total Pemasukan:** **${formatRupiah(totalRev)}**\n- **Beban Pokok (HPP Es Krim):** ${formatRupiah(cogs)}\n- **Beban Operasional Toko:** ${formatRupiah(totalExp)}\n- **Estimasi Laba Bersih:** **${formatRupiah(netProfit)}**\n\nData ini otomatis sinkron dengan Laporan Keuangan SAK EMKM toko.`,
      }
    }

    // 7. Panduan Penggunaan Fitur Web
    if (q.includes('cara') || q.includes('panduan') || q.includes('bagaimana') || q.includes('tutorial') || q.includes('ajarin')) {
      if (q.includes('kasir') || q.includes('pos') || q.includes('jual') || q.includes('bayar') || q.includes('transaksi')) {
        return {
          text: 'Cara Melayani Pembeli di Kasir POS:\n1. Klik kartu produk es krim yang dipilih pembeli (atau scan barcodenya jika ada scanner).\n2. Sesuaikan jumlah pesanan di panel keranjang belanja sebelah kanan.\n3. Pilih metode pembayaran: **Tunai** atau **QRIS**.\n4. Klik tombol hijau **Bayar** untuk menyelesaikan transaksi dan mencetak struk.',
        }
      }
      if (q.includes('print') || q.includes('cetak') || q.includes('word') || q.includes('dokumen')) {
        return {
          text: 'Cara Mengelola Jasa Print Word:\n1. Buka tab **Jasa Print Word**, lalu klik **Buat order print**.\n2. Masukkan nama file dokumen Word, pilih hitam putih atau warna, dan isi jumlah halaman.\n3. Tentukan pembayaran: **Lunas di muka** (bayar sekarang) atau **Bayar di akhir** (ambil dulu, bayar nanti).\n4. Setelah selesai dicetak, klik tombol **Selesai**. Jika berstatus bayar di akhir, klik **Tandai lunas** setelah menerima pembayaran.',
        }
      }
      if (q.includes('stok') || q.includes('produk') || q.includes('barang')) {
        return {
          text: 'Cara Menambah atau Mengubah Stok:\n1. Buka tab **Katalog & Stok**.\n2. Untuk barang baru: klik **Tambah Produk** dan isi barcode, nama, serta harga.\n3. Untuk penyesuaian barang datang: klik tombol pensil/panah pada baris produk untuk menambah jumlah stok fisik.\n4. Anda juga bisa langsung meminta saya di sini, contoh: *"Tambah stok Matcha Cup 10"*.',
        }
      }
      if (q.includes('laporan') || q.includes('neraca') || q.includes('beban') || q.includes('keuangan')) {
        return {
          text: 'Cara Menggunakan Pembukuan & Laporan Keuangan:\n1. Buka tab **Laporan Keuangan**.\n2. Tab **Laba Rugi** otomatis menghitung omzet penjualan dikurangi HPP dan beban toko.\n3. Tab **Posisi Keuangan (Neraca)** memantau kas di tangan, piutang print yang belum dibayar, dan persediaan barang.\n4. Jika ada belanja operasional toko (seperti beli kertas atau tinta), klik tombol **Catat Beban**.',
        }
      }
      return {
        text: 'Panduan Sistem Globaliti Creative Center:\n- **Kasir POS:** Pindai barcode dan proses pembayaran belanja es krim.\n- **Katalog & Stok:** Pendaftaran produk baru dan penyesuaian unit fisik.\n- **Jasa Print Word:** Pengelolaan order cetak .docx (prabayar/pascabayar) dan tarif.\n- **Laporan Keuangan:** Neraca dan Laba Rugi otomatis standar SAK EMKM.\n- **Asisten AI:** Bantuan tanya jawab stok dan usulan perubahan data aman.\n\nSilakan tanyakan fitur yang ingin Anda ketahui!',
      }
    }

    // 8. Bantuan Umum yang Ramah & Tidak Kaku
    return {
      text: `Halo! Saya Asisten Toko Globaliti. Saya siap membantu Anda mengelola kasir dan stok.\n\nBeberapa hal yang bisa Anda tanyakan dengan bahasa sehari-hari:\n- *"Berapa sisa stok Matcha Cup?"*\n- *"Ada yang beli 2 Vanilla Cone tapi lupa diinput"*\n- *"Ada kiriman es krim Cokelat Stick 15"*\n- *"Produk apa saja yang stoknya menipis?"*\n- *"Berapa pendapatan kasir hari ini?"*\n- *"Bagaimana cara mencatat order print?"*`,
    }
  }

  const GROQ_FALLBACK_CHAIN = [
    'qwen/qwen3.8-27b',
    'groq/compound-mini',
    'groq/compound',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
  ]

  const callGroqChat = async (
    userText: string,
    history: AiMessage[]
  ): Promise<{ text: string; action?: AiAction }> => {
    if (!groqKey || !groqKey.startsWith('gsk_')) {
      return processQuery(userText, history)
    }

    const systemPrompt = `Kamu adalah Asisten Globaliti, asisten operasional yang ramah, cerdas, dan memiliki otoritas penuh untuk membantu kasir atau siswa sekolah di unit usaha Globaliti Creative Center.
Data toko saat ini:
- Produk terdaftar: ${JSON.stringify(products.map((p) => ({ id: p.id, name: p.name, stock: p.stock, unit: p.unit, price: p.price, reorder: p.reorderPoint })))}
- Transaksi hari ini: ${sales.length} nota, total penjualan es krim: ${formatRupiah(sales.reduce((s, x) => s + x.total, 0))}
- Order print: ${printOrders.length} order, pendapatan print: ${formatRupiah(printOrders.filter((o) => o.status === 'Selesai' || o.payment === 'Lunas di muka').reduce((s, x) => s + x.total, 0))}
- Total pengeluaran beban: ${formatRupiah(expenses.reduce((s, x) => s + x.amount, 0))}

Panduan Penggunaan Fitur Web:
${SYSTEM_MANUAL_MD}

Kemampuan dan Tools yang Kamu Miliki:
Kamu memiliki kemampuan langsung untuk mengubah dan mencatat seluruh data toko melalui sistem kartu konfirmasi (Action Card), mencakup:
1. Pencatatan Penjualan: Mencatat transaksi penjualan es krim (mengurangi stok fisik dan menambah kas penjualan).
2. Penyesuaian Stok / Stok Opname: Menambah (restock), mengurangi (rusak/hilang), atau menyinkronkan selisih stok fisik vs sistem (misalnya jika kasir menyampaikan "di freezer hanya ada 12 cone" padahal catatan sistem 17, hitung selisihnya yaitu -5 dan siapkan kartu penyesuaian stok opname menjadi 12 cone).
3. Pencatatan Beban: Mencatat pengeluaran operasional atau pembelian bahan toko ke pembukuan keuangan.
4. Jasa Print Word: Menambahkan order cetak baru dan memperbarui status antrean atau pelunasan cetak.
5. Katalog Produk: Mengubah harga jual produk atau mendaftarkan produk baru.

Pedoman Komunikasi:
1. Gunakan Bahasa Indonesia yang santun, ramah, dan mudah dipahami orang awam. HINDARI bahasa kaku spesifikasi database teknis.
2. DILARANG menggunakan tanda pisah em-dash (—). Gunakan tanda minus (-) atau koma/titik biasa.
3. JAWAB DENGAN SOLUTIF DAN BERDAYA:
   - Jika kasir menyampaikan perbedaan antara fisik dan sistem ("di freezer hanya ada 12", "fisiknya cuma ada X"), JANGAN mengulang stok sistem lama! Akui selisih fisik tersebut dan siapkan kartu penyesuaian stok opname untuk menyamakan stok sistem dengan kondisi fisik di freezer.
   - Jika pengguna menyampaikan ada barang yang terjual di luar kasir ("seseorang membeli X tapi lupa input", "ada yang beli X"), JANGAN menyuruh pengguna mengetik manual di kasir! Langsung siapkan pencatatan transaksi penjualan untuk produk tersebut agar kasir tinggal klik setuju.
   - Jika pengguna bertanya "Yakin?" atau skeptis mengenai stok, jelaskan bahwa angka tersebut berasal dari catatan sistem dan tanyakan apakah ada perbedaan fisik di freezer untuk disesuaikan.
   - Jika pengguna menyampaikan ada pengeluaran atau beban ("beli kertas 50rb", "bayar listrik 100rb"), langsung siapkan pencatatan beban.
   - Jika pengguna meminta order print ("print tugas_sejarah.docx 5 hal"), langsung siapkan order print.
   - Jika pengguna menanyakan stok ("berapa sisa X?"), jawab langsung dan ramah jumlah stok dan harga jualnya.
4. Format nama aksi dan perubahan secara jelas agar sistem mengenali dan menyiapkan kartu aksi konfirmasi.`

    // Ambil maksimal 8 riwayat pesan terakhir untuk efisiensi token dan konteks dialog multi-turn.
    // Pesan terakhir (userMsg yang baru dikirim) dikecualikan agar tidak terkirim dobel,
    // karena userText sudah ditambahkan terpisah di akhir array messages.
    const conversationMessages = history.slice(0, -1).slice(-8).map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }))

    // Loop fallback chain secara berurutan
    for (const modelName of GROQ_FALLBACK_CHAIN) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversationMessages,
              { role: 'user', content: userText },
            ],
            max_tokens: 500,
            temperature: 0.2,
          }),
        })

        // Jika kena rate limit (429) atau model error (400/500), coba model berikutnya
        if (!response.ok) {
          console.warn(`Model ${modelName} gagal (status ${response.status}), beralih ke model cadangan...`)
          continue
        }

        const data = await response.json()
        const choice = data.choices?.[0]?.message
        const answer = choice?.content || (choice?.reasoning ? 'Permintaan Anda telah diproses.' : '')

        if (!answer.trim()) {
          continue
        }

        // Deteksi usulan perubahan stok dari konteks jawaban atau teks pengguna
        const q = userText.toLowerCase()

        // Kasus 1: Pengguna konfirmasi "ya" terhadap penyesuaian stok sebelumnya
        const isAffirmative = ['ya', 'setuju', 'oke', 'ok', 'boleh', 'konfirmasi', 'lanjutkan', 'buat kartu'].some(
          (k) => q.trim() === k || q.startsWith(k + ' ')
        )

        let targetProduct: Product | undefined
        let deltaQty: number | null = null

        if (isAffirmative) {
          // Cari produk yang dibahas di pesan terakhir asisten
          const lastAssistantMsg = [...history].reverse().find((m) => m.role === 'assistant')
          if (lastAssistantMsg) {
            for (const p of products) {
              if (lastAssistantMsg.text.toLowerCase().includes(p.name.toLowerCase())) {
                targetProduct = p
                // Cek apakah koreksi habis (stok menjadi 0)
                if (
                  lastAssistantMsg.text.toLowerCase().includes('habis') ||
                  lastAssistantMsg.text.includes(`-${p.stock}`) ||
                  lastAssistantMsg.text.toLowerCase().includes('mengurangi stok dari')
                ) {
                  deltaQty = -p.stock
                } else {
                  const matchDelta = lastAssistantMsg.text.match(/([+-]?\d+)\s*(?:stick|cup|cone|pcs|unit)/i)
                  if (matchDelta) {
                    deltaQty = parseInt(matchDelta[1], 10)
                  }
                }
                break
              }
            }
          }
        }

        // Kasus 2: Perintah langsung tambah/kurang/koreksi stok di pesan saat ini
        if (!targetProduct) {
          targetProduct = findProductInText(q) || (answer ? findProductInText(answer) : undefined)
          if (!targetProduct && history.length > 0) {
            for (let i = history.length - 1; i >= 0; i--) {
              const p = findProductInText(history[i].text)
              if (p) {
                targetProduct = p
                break
              }
            }
          }
        }

        // Cek apakah ada intent selisih fisik / stok opname di freezer / kulkas
        const isPhysicalOpname = (
          ['freezer', 'kulkas', 'showcase', 'etalase', 'lemari es', 'gudang', 'rak', 'fisik', 'nyata', 'aslinya', 'sebenarnya', 'riil', 'opname', 'hitung'].some((k) => q.includes(k) || answer.toLowerCase().includes(k)) ||
          (['tapi', 'cuma', 'hanya', 'tinggal', 'ternyata', 'kok'].some((k) => q.includes(k)) && ['ada', 'tersisa', 'sisa', 'hitung'].some((k) => q.includes(k)))
        )

        if (targetProduct && isPhysicalOpname) {
          const numMatch = q.match(/(\d+)/) || answer.match(/(?:menjadi|tersisa|sebanyak|ada)\s*(\d+)/i)
          if (numMatch) {
            const physicalQty = parseInt(numMatch[1], 10)
            const opnameDelta = physicalQty - targetProduct.stock
            if (opnameDelta !== 0) {
              return {
                text: answer,
                action: {
                  id: `act-${Date.now()}`,
                  action: 'adjust_stock',
                  description: `Sesuaikan stok opname ${targetProduct.name} menjadi ${physicalQty} ${targetProduct.unit} (${opnameDelta > 0 ? '+' : ''}${opnameDelta} ${targetProduct.unit} selisih fisik)`,
                  params: {
                    productId: targetProduct.id,
                    delta: opnameDelta,
                    reason: 'Penyesuaian stok opname fisik di freezer',
                  },
                  status: 'pending',
                },
              }
            }
          }
        }

        if (!targetProduct) {
          const isSaleOrOut = ['beli', 'membeli', 'terjual', 'laku', 'keluar', 'lupa input', 'lupa masukin', 'lupa catat', 'lupa memasukan', 'kurangi', 'kurang', 'ambil', 'rusak', 'pecah', 'mencair', 'basi', 'hilang'].some((k) => q.includes(k))
          const isRestock = ['tambah', 'masuk', 'kiriman', 'restock', 'kulakan'].some((k) => q.includes(k))

          for (const p of products) {
            if (q.includes(p.name.toLowerCase()) || answer.toLowerCase().includes(p.name.toLowerCase())) {
              targetProduct = p
              if (q.includes('habis') || answer.toLowerCase().includes('habis')) {
                deltaQty = -p.stock
              } else {
                const matchDelta = q.match(/(\d+)/) || answer.match(/([+-]?\d+)\s*(?:stick|cup|cone|pcs|unit)/i)
                if (matchDelta) {
                  const num = Math.abs(parseInt(matchDelta[1], 10))
                  deltaQty = (isSaleOrOut || q.includes('kurang') || answer.includes(`-${num}`)) ? -num : num
                } else if (isSaleOrOut) {
                  deltaQty = -1
                } else if (isRestock) {
                  deltaQty = 10
                }
              }
              break
            }
          }
        }

        // Deteksi apakah ada intent penjualan dari jawaban Groq atau query pengguna
        const isSaleIntent = ['beli', 'membeli', 'terjual', 'laku', 'lupa input', 'lupa masukin', 'lupa catat', 'lupa memasukan', 'penjualan belum tercatat'].some(
          (k) => q.includes(k) || answer.toLowerCase().includes(k)
        )

        if (targetProduct && isSaleIntent && deltaQty !== null && deltaQty < 0) {
          const qty = Math.abs(deltaQty)
          const isQris = q.includes('qris') || answer.toLowerCase().includes('qris')
          const paymentMethod: 'Tunai' | 'QRIS' = isQris ? 'QRIS' : 'Tunai'
          const totalPrice = targetProduct.price * qty
          return {
            text: answer,
            action: {
              id: `act-${Date.now()}`,
              action: 'record_sale',
              description: `Catat transaksi penjualan: ${targetProduct.name} (${qty} ${targetProduct.unit}) senilai ${formatRupiah(totalPrice)} via ${paymentMethod}`,
              params: {
                items: [{ productId: targetProduct.id, quantity: qty, price: targetProduct.price }],
                payment: paymentMethod,
              },
              status: 'pending',
            },
          }
        }

        // Deteksi pencatatan beban dari jawaban Groq atau query pengguna
        const isExpenseIntent = ['beban', 'biaya', 'pengeluaran', 'beli kertas', 'beli tinta', 'beli sabun'].some(
          (k) => q.includes(k) || answer.toLowerCase().includes(k)
        )
        const expenseNumMatch = q.match(/\d+/) || answer.match(/(?:Rp\s*|sebesar\s*|sebanyak\s*)(\d[\d.]*)/i)
        if (isExpenseIntent && expenseNumMatch) {
          const cleanNum = parseInt(expenseNumMatch[1] ? expenseNumMatch[1].replace(/\./g, '') : expenseNumMatch[0], 10)
          if (cleanNum > 0 && !targetProduct) {
            const isBahan = ['bahan', 'kertas', 'tinta', 'cup', 'stick'].some((k) => q.includes(k) || answer.toLowerCase().includes(k))
            const category: 'Operasional' | 'Bahan' | 'Lainnya' = isBahan ? 'Bahan' : 'Operasional'
            const desc = isBahan ? 'Pembelian Bahan/Perlengkapan' : 'Beban Operasional Toko'
            return {
              text: answer,
              action: {
                id: `act-${Date.now()}`,
                action: 'record_expense',
                description: `Catat beban ${desc} (${category}) senilai ${formatRupiah(cleanNum)}`,
                params: {
                  category,
                  description: desc,
                  amount: cleanNum,
                },
                status: 'pending',
              },
            }
          }
        }

        if (targetProduct && deltaQty !== null && deltaQty !== 0) {
          const reasonText = deltaQty < 0
            ? 'Koreksi stok keluar/rusak via Asisten AI'
            : 'Penambahan stok via Asisten AI'
          return {
            text: answer,
            action: {
              id: `act-${Date.now()}`,
              action: 'adjust_stock',
              description: `Sesuaikan stok "${targetProduct.name}" sebesar ${deltaQty > 0 ? '+' : ''}${deltaQty} ${targetProduct.unit} (dari ${targetProduct.stock} menjadi ${Math.max(0, targetProduct.stock + deltaQty)})`,
              params: {
                productId: targetProduct.id,
                delta: deltaQty,
                reason: reasonText,
              },
              status: 'pending',
            },
          }
        }

        return { text: answer }
      } catch (err) {
        console.warn(`Kesalahan jaringan pada model ${modelName}:`, err)
        continue
      }
    }

    // Jika seluruh model pada fallback chain gagal, fallback ke engine lokal
    return processQuery(userText, history)
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userText = input.trim()
    const userMsg: AiMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: userText,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    }

    onUpdateMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Teruskan riwayat pesan (termasuk userMsg yang baru dikirim) ke Groq
    const currentHistory = [...messages, userMsg]
    const response = await callGroqChat(userText, currentHistory)
    const assistantMsg: AiMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      text: response.text,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      action: response.action,
    }
    onUpdateMessages((prev) => [...prev, assistantMsg])
    setLoading(false)
  }

  const handleApplyAction = (msgId: string, action: AiAction) => {
    if (action.action === 'adjust_stock') {
      onAdjustStock(action.params.productId, action.params.delta, action.params.reason)
    } else if (action.action === 'record_sale' && onRecordSale && action.params.items) {
      onRecordSale(action.params.items, action.params.payment || 'Tunai')
    } else if (action.action === 'record_expense' && onRecordExpense) {
      onRecordExpense(action.params.category || 'Operasional', action.params.description, action.params.amount)
    } else if (action.action === 'create_print_order' && onCreatePrintOrder) {
      onCreatePrintOrder(
        action.params.fileName,
        action.params.mode || 'Hitam putih',
        action.params.quantity || 1,
        action.params.payment || 'Lunas di muka'
      )
    } else if (action.action === 'update_print_order' && onUpdatePrintOrder) {
      onUpdatePrintOrder(action.params.orderId, action.params.status, action.params.payment)
    } else if (action.action === 'update_price' && onUpdatePrice) {
      onUpdatePrice(action.params.productId, action.params.newPrice)
    } else if (action.action === 'add_product' && onAddProduct && action.params.product) {
      onAddProduct(action.params.product)
    }

    onUpdateMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId && msg.action) {
          return {
            ...msg,
            action: { ...msg.action, status: 'applied' },
          }
        }
        return msg
      })
    )
  }

  const handleRejectAction = (msgId: string) => {
    onUpdateMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId && msg.action) {
          return {
            ...msg,
            action: { ...msg.action, status: 'rejected' },
          }
        }
        return msg
      })
    )
  }

  return (
    <section className={`ai-page ${variant === 'floating' ? 'ai-floating' : ''}`}>
      {variant === 'page' && <div className="ai-header">
        <div>
          <h2>Asisten Operasional Toko</h2>
          <p className="ai-sub">
            Pemeriksaan data inventori, keuangan harian, dan modifikasi data terkontrol
          </p>
        </div>
        <div className="ai-header-controls">
          <div className="ai-engine-status">
            <span className="status-pill live">
              {groqKey && groqKey.startsWith('gsk_') ? 'Groq LPU (Auto Fallback 5 Model)' : 'Engine Lokal Aktif'}
            </span>
          </div>
          {onClearChat && (
            <button
              type="button"
              className="secondary-button ai-clear-button"
              onClick={onClearChat}
              title="Bersihkan riwayat percakapan"
            >
              <Broom size={16} /> Bersihkan Chat
            </button>
          )}
        </div>
      </div>}

      <div className="ai-chat-card">
        <div className="ai-messages-list" ref={listRef} role="log" aria-label="Percakapan asisten" aria-live="polite">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`ai-message-bubble ${
                msg.role === 'user' ? 'user-side' : 'assistant-side'
              }`}
            >
              <div className="ai-avatar">
                {msg.role === 'user' ? <User size={16} /> : <Robot size={16} />}
              </div>
              <div className="ai-bubble-content">
                <div className="ai-bubble-header">
                  <strong>{msg.role === 'user' ? 'Pengelola' : 'Asisten Globaliti'}</strong>
                  <small>{msg.time}</small>
                </div>
                <div className="ai-bubble-text">
                  {msg.role === 'assistant' ? (
                    <MarkdownContent content={msg.text} />
                  ) : (
                    msg.text
                  )}
                </div>

                {/* Kartu Konfirmasi Tindakan Modifikasi Data */}
                {msg.action && (
                  <div
                    className={`ai-action-card ${
                      msg.action.status === 'applied'
                        ? 'applied'
                        : msg.action.status === 'rejected'
                        ? 'rejected'
                        : 'pending'
                    }`}
                  >
                    <div className="ai-action-head">
                      <strong>Usulan Tindakan Perubahan Data</strong>
                      <span className="badge-payment">
                        {msg.action.status === 'pending'
                          ? 'Perlu Konfirmasi'
                          : msg.action.status === 'applied'
                          ? 'Telah Diterapkan'
                          : 'Dibatalkan'}
                      </span>
                    </div>
                    <p>{msg.action.description}</p>

                    {msg.action.status === 'pending' && (
                      <div className="ai-action-buttons">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleRejectAction(msg.id)}
                        >
                          <X size={14} /> Batalkan
                        </button>
                        <button
                          type="button"
                          className="primary-action"
                          onClick={() => handleApplyAction(msg.id, msg.action!)}
                        >
                          <Check size={14} weight="bold" /> Terapkan Perubahan
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="ai-message-bubble assistant-side">
              <div className="ai-avatar"><Robot size={16} /></div>
              <div className="ai-bubble-content">
                <span className="ai-thinking">Memproses pertanyaan...</span>
              </div>
            </div>
          )}
        </div>

        <div className="ai-input-bar">
          <input
            type="text"
            aria-label="Pesan untuk asisten"
            placeholder="Tanya tentang toko..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSend()
            }}
          />
          <button
            type="button"
            className="primary-action"
            disabled={!input.trim() || loading}
            onClick={handleSend}
          >
            <PaperPlaneTilt size={16} weight="bold" /> Kirim
          </button>
        </div>
      </div>
    </section>
  )
}
