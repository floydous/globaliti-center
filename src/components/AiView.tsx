import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Broom,
  Check,
  Desktop,
  Keyboard,
  Lightning,
  Package,
  PaperPlaneTilt,
  PlusCircle,
  Printer,
  Receipt,
  ShoppingCart,
  Sparkle,
  Tag,
  User,
  Warning,
} from '@phosphor-icons/react'
import MarkdownContent from './MarkdownContent'
import { SYSTEM_MANUAL_MD } from '../docs/systemManual'
import type { AiAction, AiMessage, Expense, PaymentHotkeys, PrintOrder, Product, Sale } from '../types'

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
  paymentHotkeys?: PaymentHotkeys
  onUpdatePaymentHotkeys?: (hotkeys: PaymentHotkeys) => void
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
  paymentHotkeys,
  onUpdatePaymentHotkeys,
}: AiViewProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [engineStatus, setEngineStatus] = useState<string>(
    groqKey && groqKey.startsWith('gsk_') ? 'Groq LPU Siap' : 'Engine Lokal'
  )
  const [engineError, setEngineError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (groqKey && groqKey.startsWith('gsk_')) {
      setEngineStatus('Groq LPU Siap')
      setEngineError(null)
    } else {
      setEngineStatus('Engine Lokal')
      setEngineError(null)
    }
  }, [groqKey])
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, loading])

  // Helper untuk mencocokkan kata utuh dengan batasan kata (menghindari false-positive seperti 'rak' dalam 'bicarakan')
  // Helper untuk melabeli kategori tindakan secara manusiawi dan elegan
  const getActionCategory = (type: string): { label: string; icon: ReactNode } => {
    switch (type) {
      case 'record_sale':
        return { label: 'Pencatatan Penjualan', icon: <ShoppingCart size={15} /> }
      case 'adjust_stock':
        return { label: 'Penyesuaian Stok', icon: <Package size={15} /> }
      case 'record_expense':
        return { label: 'Pengeluaran Toko', icon: <Receipt size={15} /> }
      case 'create_print_order':
        return { label: 'Order Cetak Word', icon: <Printer size={15} /> }
      case 'update_print_order':
        return { label: 'Status Order Print', icon: <Printer size={15} /> }
      case 'update_price':
        return { label: 'Perubahan Harga', icon: <Tag size={15} /> }
      case 'update_payment_hotkeys':
        return { label: 'Pintasan Hotkey Kasir', icon: <Keyboard size={15} /> }
      case 'add_product':
        return { label: 'Pendaftaran Produk', icon: <PlusCircle size={15} /> }
      default:
        return { label: 'Tindakan Sistem', icon: <Lightning size={15} /> }
    }
  }

  const hasWord = (text: string, words: string[]): boolean => {
    return words.some((word) => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(?:^|[^a-zA-Z0-9_-])${escaped}(?:$|[^a-zA-Z0-9_-])`, 'i')
      return regex.test(text)
    })
  }

  // Helper untuk mengekstrak kuantitas angka tanpa tertipu reduplikasi kata bahasa Indonesia (hal2, kata2, dsb)
  const extractQuantity = (text: string): number | null => {
    const cleaned = text.replace(/[a-zA-Z]+2\b/g, '')
    const patternMatch = cleaned.match(/(?:[+]|nambah\w*|tambah\w*|restok\w*|restock\w*|re-stok|masuk\w*|kirim\w*|pasok\w*|ada|sebanyak|isi\w*|stok|beli\w*|laku|terjual|rusak|pecah|mencair)?\s*(\b\d+\b)\s*(?:cup|cone|stick|pcs|buah|unit|biji|porsi|halaman|hal)?/i)
    const standaloneMatch = cleaned.match(/\b\d+\b/)
    const numStr = patternMatch && patternMatch[1] ? patternMatch[1] : (standaloneMatch ? standaloneMatch[0] : null)
    if (!numStr) return null
    const val = parseInt(numStr, 10)
    return isNaN(val) ? null : val
  }

  // Helper untuk mencari produk yang disebut dalam teks (lengkap atau kata kunci spesifik)
  const findProductInText = (text: string): Product | undefined => {
    const t = text.toLowerCase()
    // 1. Coba match nama lengkap (misal: "vanilla cone", "matcha cup", "strawberry cup")
    const exact = products.find((p) => t.includes(p.name.toLowerCase()))
    if (exact) return exact

    // 2. Coba match kata unik nama produk atau kata rasa
    return products.find((p) => {
      const words = p.name.toLowerCase().split(' ')
      return words.some((w) => w.length >= 4 && t.includes(w))
    })
  }

  // Engine Local Tool Handler / Intelligent Assistant
  const processQuery = (query: string, history: AiMessage[] = []): { text: string; action?: AiAction; actions?: AiAction[] } => {
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

    // 2a. Intent Mengingat Percakapan Sebelumnya / Memory Recall
    // Contoh: "apakah kamu ingat hal2 yang aku bicarakan sebelumnya", "kamu ingat apa yang kita bicarakan tadi?", "tadi aku bilang apa?"
    const isRecallIntent =
      /(?:ingat|mengingat|percakapan|obrolan|bicara|bahas|ngomong|tadi)\b/i.test(q) &&
      /(?:kamu|ingat|apa\s+saja|hal|tadi|sebelumnya|riwayat|rekap|sebelum)/i.test(q) &&
      !hasWord(q, ['stok', 'beli', 'jual', 'print', 'beban', 'harga'])

    if (isRecallIntent) {
      const userTurns = history.filter((m) => m.role === 'user')
      if (userTurns.length === 0) {
        return {
          text: 'Tentu, saya siap mengingat percakapan kita! Sesi ini baru dimulai dan belum ada pesan sebelumnya. Ada yang ingin Anda diskusikan atau tanyakan seputar kasir dan stok toko?',
        }
      }

      const recapLines: string[] = []
      history.forEach((m) => {
        if (m.role === 'user') {
          recapLines.push(`- **Anda:** "${m.text}"`)
        } else if (m.action) {
          recapLines.push(`  ↳ *Tindakan sistem disiapkan:* ${m.action.description} (${m.action.status === 'applied' ? 'Telah Diterapkan' : 'Siap Diterapkan'})`)
        }
      })

      return {
        text: `Tentu, saya mengingat seluruh percakapan kita dalam sesi ini:\n\n${recapLines.slice(-6).join('\n')}\n\nSeluruh konteks ini tersimpan aman dalam sesi kasir saat ini. Ada hal lain yang ingin Anda kelola atau tindaklanjuti?`,
      }
    }

    // 5.5 Cek Pelanggan / Transaksi Penjualan Terakhir di Kasir POS
    // Contoh: "pelanggan terakhir ada beli apa ya?", "nota terakhir beli apa", "pembeli terakhir"
    if (
      q.includes('pelanggan terakhir') ||
      q.includes('pembeli terakhir') ||
      q.includes('nota terakhir') ||
      q.includes('transaksi terakhir') ||
      q.includes('transaksi paling baru') ||
      q.includes('terakhir beli apa') ||
      q.includes('tadi beli apa') ||
      q.includes('struk terakhir') ||
      ((q.includes('terakhir') || q.includes('paling baru') || q.includes('tadi')) && (q.includes('beli') || q.includes('nota') || q.includes('transaksi') || q.includes('pelanggan') || q.includes('pembeli')))
    ) {
      const sortedSales = [...sales].sort((a, b) => b.id.localeCompare(a.id))
      const last = sortedSales[0]
      if (!last) {
        return {
          text: 'Belum ada transaksi penjualan kasir POS yang tercatat hari ini.',
        }
      }

      const itemsDetail = last.items
        .map((it) => {
          const p = products.find((prod) => prod.id === it.productId)
          const name = p ? p.name : it.productId
          const unit = p ? p.unit : 'unit'
          return `- **${name}**: ${it.quantity} ${unit} × ${formatRupiah(it.price)} = **${formatRupiah(it.price * it.quantity)}**`
        })
        .join('\n')

      return {
        text: `Halo! Pelanggan terakhir yang bertransaksi tercatat pada **Nota ${last.id}** pukul **${last.time}** (kasir: ${last.operator}):\n\n${itemsDetail}\n\n- **Total Tagihan:** **${formatRupiah(last.total)}**\n- **Metode Pembayaran:** **${last.payment}**\n\nSeluruh data ini tersimpan aman di basis data kasir POS toko. Ada yang ingin Anda tindak lanjuti?`,
      }
    }

    // 5.6 Cek Order Jasa Cetak Dokumen Terakhir
    // Contoh: "order print terakhir apa?", "siapa yang ngeprint terakhir?"
    if (
      (q.includes('print terakhir') || q.includes('cetak terakhir') || q.includes('order print paling baru') || q.includes('antrean print terakhir') || (q.includes('print') && q.includes('terakhir')))
    ) {
      const sortedPrintOrders = [...printOrders].sort((a, b) => b.id.localeCompare(a.id))
      const lastPrint = sortedPrintOrders[0]
      if (!lastPrint) {
        return {
          text: 'Belum ada antrean pesanan jasa cetak Word yang masuk ke sistem.',
        }
      }

      return {
        text: `Order cetak dokumen paling baru adalah **${lastPrint.id}** pukul **${lastPrint.time}**:\n\n- **Nama File:** **${lastPrint.fileName}**\n- **Mode Cetak:** ${lastPrint.mode}\n- **Volume:** ${lastPrint.quantity} halaman\n- **Total Biaya:** **${formatRupiah(lastPrint.total)}**\n- **Status Pembayaran:** **${lastPrint.payment}**\n- **Status Pengerjaan:** **${lastPrint.status}**`,
      }
    }

    // 5.7 Cek Produk Paling Laku / Terlaris Hari Ini
    // Contoh: "produk apa yang paling laku hari ini?", "es krim terlaris apa?"
    if (q.includes('paling laku') || q.includes('terlaris') || q.includes('paling laris') || q.includes('favorit')) {
      const productSalesCount: Record<string, number> = {}
      sales.forEach((s) => {
        s.items.forEach((it) => {
          productSalesCount[it.productId] = (productSalesCount[it.productId] || 0) + it.quantity
        })
      })

      const ranked = Object.entries(productSalesCount).sort((a, b) => b[1] - a[1])
      if (ranked.length === 0) {
        return {
          text: 'Belum ada transaksi penjualan es krim yang tercatat hari ini untuk menghitung produk terlaris.',
        }
      }

      const rankList = ranked
        .map(([pid, qty], idx) => {
          const p = products.find((prod) => prod.id === pid)
          return `${idx + 1}. **${p ? p.name : pid}**: terjual **${qty} ${p ? p.unit : 'unit'}**`
        })
        .join('\n')

      return {
        text: `Peringkat es krim terlaris hari ini berdasarkan transaksi kasir POS:\n\n${rankList}\n\nSemua data ini dihitung langsung dari riwayat nota kasir hari ini.`,
      }
    }

    // Ekstrak angka kuantitas
    const extractedQty = extractQuantity(q)

    // Cari produk di pesan saat ini
    let matchedProduct = findProductInText(q)

    // Deteksi intent-intent aksi spesifik
    const isDamagedOrLost = hasWord(q, ['rusak', 'pecah', 'mencair', 'cair', 'basi', 'hilang', 'kedaluwarsa', 'expired'])
    const isRestock = (
      /\b(?:tambah|nambah|restok|restock|re-stok|pasok|kirim|kulak)\w*\b/i.test(q) ||
      hasWord(q, ['masuk', 'pasokan', 'kiriman', 'kulakan', 'pasok']) ||
      q.includes('tambah stok') ||
      q.includes('barang masuk') ||
      q.includes('stok baru') ||
      q.includes('belanja stok')
    ) && !isDamagedOrLost

    const isExplicitSale = hasWord(q, ['jual', 'penjualan', 'transaksi', 'laku', 'terjual']) || q.includes('catat penjualan')
    const isUnrecordedSale =
      q.includes('lupa input') || q.includes('lupa masukin') || q.includes('lupa catat') || q.includes('lupa memasukan') || q.includes('belum diinput') || q.includes('belum masuk') ||
      ((hasWord(q, ['beli', 'membeli']) || q.includes('ada yang beli') || q.includes('seseorang membeli')) && !q.includes('beli bahan') && !q.includes('beli kertas'))

    const isPriceChange = (q.includes('ubah harga') || q.includes('ganti harga') || q.includes('set harga')) && extractedQty !== null

    const physicalLocations = ['freezer', 'kulkas', 'showcase', 'etalase', 'lemari es', 'gudang', 'rak']
    const physicalKeywords = ['fisik', 'nyata', 'aslinya', 'sebenarnya', 'riil', 'opname', 'hitung']
    const hasPhysicalWord = hasWord(q, [...physicalLocations, ...physicalKeywords])
    const hasDiscrepancyContext = hasWord(q, ['tapi', 'cuma', 'hanya', 'tinggal', 'ternyata', 'kok']) && hasWord(q, ['ada', 'tersisa', 'sisa', 'hitung'])
    const isPhysicalDiscrepancy = (hasPhysicalWord || hasDiscrepancyContext) && extractedQty !== null && !isRestock && !isDamagedOrLost

    // 2b. Pertanyaan Skeptis / Konfirmasi ("Yakin?", "Beneran?", "Serius?", "Masa sih?")
    const isSkeptic = /^(yakin\??|beneran\??|serius\??|masa\??|masa sih\??|kamu yakin\??|bener\??)[\s?!.]*$/i.test(q)

    // Cari produk dari riwayat hanya jika konteksnya mengarah pada aksi atau follow-up produk
    const isProductContext = isSkeptic || isRestock || isPhysicalDiscrepancy || isExplicitSale || isUnrecordedSale || isDamagedOrLost || isPriceChange || hasWord(q, ['stok', 'sisa', 'harga', 'modal', 'barcode', 'yakin', 'beneran', 'serius'])
    if (!matchedProduct && isProductContext && history.length > 0) {
      for (let i = history.length - 1; i >= 0; i--) {
        const p = findProductInText(history[i].text)
        if (p) {
          matchedProduct = p
          break
        }
      }
    }
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

    // 2c. Intent Tambah Stok / Restok Barang
    // Contoh: "Aku baru aja restok dan sekarang nambah 50", "tambahkan 50", "tambah stok Matcha Cup 10", "ada kiriman 20 cone"
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

    // 2d. Intent Selisih Stok Fisik / Stok Opname / Freezer
    // Contoh: "Tapi di freezer hanya ada 12 cone", "di kulkas cuma ada 10", "fisik cuma 12", "aslinya cuma 12", "ternyata tinggal 12"
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

    // 3. Intent Pencatatan Penjualan / Barang Laku / Lupa Diinput ke Kasir
    // Contoh: "seseorang membeli matcha cup tapi saya lupa memasukan datanya ke sini, bisakah kamu melakukannya untuk k"
    // Contoh: "catat penjualan matcha cup 2 tunai", "ada yang beli cokelat stick 3"
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
    const isExpense = hasWord(q, ['beban', 'biaya', 'pengeluaran', 'ongkos']) || q.includes('bayar listrik') || q.includes('beli kertas') || q.includes('beli tinta') || q.includes('beli sabun') || q.includes('beli kantong')
    if (isExpense && extractedQty) {
      const amount = extractedQty
      const isBahan = hasWord(q, ['bahan', 'kertas', 'tinta', 'cup', 'stick', 'plastik'])
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

    // 5. Intent Order Print Dokumen Word (Termasuk variasi percakapan seperti "ngeprint proposal 32 halaman, 3 warna lunas")
    const isPrintOrder =
      hasWord(q, ['print', 'ngeprint', 'cetak']) ||
      ['order print', 'cetak dokumen', 'print word', 'print tugas', 'order cetak', 'buat order print', 'jasa print'].some((k) => q.includes(k))
    if (isPrintOrder) {
      const isPostpaid = ['bayar di akhir', 'bayar akhir', 'pascabayar', 'nanti', 'tempo'].some((k) => q.includes(k))
      const payment: 'Lunas di muka' | 'Bayar di akhir' = isPostpaid ? 'Bayar di akhir' : 'Lunas di muka'

      // Ekstrak nama file (misal xxx.docx atau nama setelah kata print/cetak)
      const fileMatch = q.match(/[\w-]+\.(?:docx|doc|pdf)/i) || q.match(/(?:print|ngeprint|cetak)\s+([\w\s_-]+?)(?:,|\s+\d+|\s+jumlah|\s+halaman|\s+hitam|\s+warna|$)/i)
      const rawFileName = fileMatch ? (fileMatch[1] ? fileMatch[1].trim() : fileMatch[0].trim()) : 'Proposal_Dokumen'
      const cleanFileName = rawFileName.replace(/^(?:dokumen|berkas)\s+/i, '').trim() || 'Proposal_Dokumen'
      const fileName = cleanFileName.includes('.') ? cleanFileName : `${cleanFileName}.docx`

      // Cek apakah ada pembagian halaman campuran (warna & hitam putih)
      const colorMatch = q.match(/(\d+)\s*(?:halaman|hal|lbr|lembar)?\s*(?:berwarna|warna|color)/i) ||
                         q.match(/(?:berwarna|warna|color)\s*(?:cuma|hanya)?\s*(\d+)/i)
      const bwMatch = q.match(/(\d+)\s*(?:halaman|hal|lbr|lembar)?\s*(?:hitam[- ]putih|bw|b\/w)/i) ||
                      q.match(/(?:hitam[- ]putih|bw)\s*(?:cuma|hanya)?\s*(\d+)/i)
      const totalMatch = q.match(/(?:total|jumlah|sebanyak|isi)?\s*(\d+)\s*(?:halaman|hal|lembar)/i)

      const colorCount = colorMatch ? parseInt(colorMatch[1], 10) : 0
      let totalPages = totalMatch ? parseInt(totalMatch[1], 10) : (extractedQty || 1)
      let bwCount = bwMatch ? parseInt(bwMatch[1], 10) : 0

      if (totalPages > 0 && colorCount > 0 && bwCount === 0 && totalPages > colorCount) {
        bwCount = totalPages - colorCount
      }

      // Jika campuran warna + hitam putih
      if (colorCount > 0 && bwCount > 0) {
        const costColor = colorCount * 1000
        const costBw = bwCount * 500
        const grandTotal = costColor + costBw

        const actColor: AiAction = {
          id: `act-${Date.now()}-1`,
          action: 'create_print_order',
          description: `Order print ${fileName} - Bagian Berwarna (${colorCount} hal, Rp ${costColor.toLocaleString('id-ID')})`,
          params: {
            fileName: `${fileName.replace(/\.[^/.]+$/, '')}_Warna.docx`,
            mode: 'Berwarna',
            quantity: colorCount,
            payment,
          },
          status: 'pending',
        }

        const actBw: AiAction = {
          id: `act-${Date.now()}-2`,
          action: 'create_print_order',
          description: `Order print ${fileName} - Bagian Hitam Putih (${bwCount} hal, Rp ${costBw.toLocaleString('id-ID')})`,
          params: {
            fileName: `${fileName.replace(/\.[^/.]+$/, '')}_Teks.docx`,
            mode: 'Hitam putih',
            quantity: bwCount,
            payment,
          },
          status: 'pending',
        }

        return {
          text: `Baik, saya telah menghitung rincian dan menyiapkan pencatatan order print **${fileName}** (${totalPages} halaman):\n\n- **Halaman Berwarna:** ${colorCount} hal × Rp 1.000 = **${formatRupiah(costColor)}**\n- **Halaman Hitam-Putih:** ${bwCount} hal × Rp 500 = **${formatRupiah(costBw)}**\n- **Total Biaya:** **${formatRupiah(grandTotal)}** (${payment})\n\nSilakan periksa 2 kartu tindakan di bawah dan klik **Terapkan Semua** untuk memasukkannya ke antrean cetak:`,
          action: actColor,
          actions: [actColor, actBw],
        }
      }

      // Pesanan satu mode (hanya warna atau hanya hitam putih)
      const isColorOnly = hasWord(q, ['warna', 'berwarna', 'color'])
      const mode: 'Hitam putih' | 'Berwarna' = isColorOnly ? 'Berwarna' : 'Hitam putih'
      const pages = totalPages > 0 ? totalPages : 1
      const rate = mode === 'Berwarna' ? 1000 : 500
      const totalCost = pages * rate

      return {
        text: `Saya telah menyiapkan order jasa cetak dokumen untuk Anda:\n\n- **Nama Dokumen:** \`${fileName}\`\n- **Mode Cetak:** ${mode}\n- **Jumlah:** ${pages} halaman\n- **Perkiraan Biaya:** **${formatRupiah(totalCost)}** (${payment})\n\nSilakan periksa kartu tindakan di bawah dan klik **Terapkan Perubahan** untuk memasukkan order ke antrean cetak.`,
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

    // 5.5 Cek Pelanggan / Transaksi Penjualan Terakhir di Kasir POS
    // Contoh: "pelanggan terakhir ada beli apa ya?", "nota terakhir beli apa", "pembeli terakhir"
    if (
      q.includes('pelanggan terakhir') ||
      q.includes('pembeli terakhir') ||
      q.includes('nota terakhir') ||
      q.includes('transaksi terakhir') ||
      q.includes('transaksi paling baru') ||
      q.includes('terakhir beli apa') ||
      q.includes('tadi beli apa') ||
      q.includes('struk terakhir') ||
      ((q.includes('terakhir') || q.includes('paling baru') || q.includes('tadi')) && (q.includes('beli') || q.includes('nota') || q.includes('transaksi') || q.includes('pelanggan') || q.includes('pembeli')))
    ) {
      const sortedSales = [...sales].sort((a, b) => b.id.localeCompare(a.id))
      const last = sortedSales[0]
      if (!last) {
        return {
          text: 'Belum ada transaksi penjualan kasir POS yang tercatat hari ini.',
        }
      }

      const itemsDetail = last.items
        .map((it) => {
          const p = products.find((prod) => prod.id === it.productId)
          const name = p ? p.name : it.productId
          const unit = p ? p.unit : 'unit'
          return `- **${name}**: ${it.quantity} ${unit} × ${formatRupiah(it.price)} = **${formatRupiah(it.price * it.quantity)}**`
        })
        .join('\n')

      return {
        text: `Halo! Pelanggan terakhir yang bertransaksi tercatat pada **Nota ${last.id}** pukul **${last.time}** (kasir: ${last.operator}):\n\n${itemsDetail}\n\n- **Total Tagihan:** **${formatRupiah(last.total)}**\n- **Metode Pembayaran:** **${last.payment}**\n\nSeluruh data ini tersimpan aman di basis data kasir POS toko. Ada yang ingin Anda tindak lanjuti?`,
      }
    }

    // 5.6 Cek Order Jasa Cetak Dokumen Terakhir
    // Contoh: "order print terakhir apa?", "siapa yang ngeprint terakhir?"
    if (
      (q.includes('print terakhir') || q.includes('cetak terakhir') || q.includes('order print paling baru') || q.includes('antrean print terakhir'))
    ) {
      const sortedPrintOrders = [...printOrders].sort((a, b) => b.id.localeCompare(a.id))
      const lastPrint = sortedPrintOrders[0]
      if (!lastPrint) {
        return {
          text: 'Belum ada antrean pesanan jasa cetak Word yang masuk ke sistem.',
        }
      }

      return {
        text: `Order cetak dokumen paling baru adalah **${lastPrint.id}** pukul **${lastPrint.time}**:\n\n- **Nama File:** **${lastPrint.fileName}**\n- **Mode Cetak:** ${lastPrint.mode}\n- **Volume:** ${lastPrint.quantity} halaman\n- **Total Biaya:** **${formatRupiah(lastPrint.total)}**\n- **Status Pembayaran:** **${lastPrint.payment}**\n- **Status Pengerjaan:** **${lastPrint.status}**`,
      }
    }

    // 5.7 Cek Produk Paling Laku / Terlaris Hari Ini
    // Contoh: "produk apa yang paling laku hari ini?", "es krim terlaris apa?"
    if (q.includes('paling laku') || q.includes('terlaris') || q.includes('paling laris') || q.includes('favorit')) {
      const productSalesCount: Record<string, number> = {}
      sales.forEach((s) => {
        s.items.forEach((it) => {
          productSalesCount[it.productId] = (productSalesCount[it.productId] || 0) + it.quantity
        })
      })

      const ranked = Object.entries(productSalesCount).sort((a, b) => b[1] - a[1])
      if (ranked.length === 0) {
        return {
          text: 'Belum ada transaksi penjualan es krim yang tercatat hari ini untuk menghitung produk terlaris.',
        }
      }

      const rankList = ranked
        .map(([pid, qty], idx) => {
          const p = products.find((prod) => prod.id === pid)
          return `${idx + 1}. **${p ? p.name : pid}**: terjual **${qty} ${p ? p.unit : 'unit'}**`
        })
        .join('\n')

      return {
        text: `Peringkat es krim terlaris hari ini berdasarkan transaksi kasir POS:\n\n${rankList}\n\nSemua data ini dihitung langsung dari riwayat nota kasir hari ini.`,
      }
    }

    // 6.5 Intent Ubah Hotkey Pembayaran Kasir POS (Tunai & QRIS)
    // Contoh: "ubah hotkey tunai jadi T dan qris jadi Q", "ganti hotkey 1 dan 2", "set shortcut tunai F1 qris F2"
    if (q.includes('hotkey') || q.includes('shortcut') || (q.includes('tombol') && (q.includes('tunai') || q.includes('qris')))) {
      let tunaiKey = '1'
      let qrisKey = '2'

      const tunaiMatch = q.match(/tunai\s*(?:menjadi|jadi|=|:)?\s*([a-zA-Z0-9]+|f\d+)/i) ||
                         q.match(/([a-zA-Z0-9]+|f\d+)\s*(?:untuk|buat)?\s*tunai/i)
      const qrisMatch = q.match(/qris\s*(?:menjadi|jadi|=|:)?\s*([a-zA-Z0-9]+|f\d+)/i) ||
                        q.match(/([a-zA-Z0-9]+|f\d+)\s*(?:untuk|buat)?\s*qris/i)

      if (tunaiMatch) tunaiKey = tunaiMatch[1].toUpperCase()
      if (qrisMatch) qrisKey = qrisMatch[1].toUpperCase()

      const pairMatch = q.match(/(?:tombol|hotkey|shortcut)\s*([a-zA-Z0-9]+)\s*(?:dan|,|&)\s*([a-zA-Z0-9]+)/i)
      if (!tunaiMatch && !qrisMatch && pairMatch) {
        tunaiKey = pairMatch[1].toUpperCase()
        qrisKey = pairMatch[2].toUpperCase()
      }

      return {
        text: `Saya telah menyiapkan pembaruan tombol pintasan (*hotkey*) metode pembayaran kasir POS:\n\n- **Tunai:** Tombol **[${tunaiKey}]**\n- **QRIS:** Tombol **[${qrisKey}]**\n\nSetelah Anda klik **Terapkan Perubahan**, tombol pada kasir POS beserta lencana pintasannya akan langsung aktif.`,
        action: {
          id: `act-${Date.now()}`,
          action: 'update_payment_hotkeys',
          description: `Ubah hotkey pembayaran: Tunai [${tunaiKey}], QRIS [${qrisKey}]`,
          params: {
            tunai: tunaiKey,
            qris: qrisKey,
          },
          status: 'pending',
        },
      }
    }

    // 7. Intent Ubah Harga Jual Produk
    // Contoh: "ubah harga matcha cup jadi 9000", "ganti harga vanilla cone 7000"
    if (isPriceChange && matchedProduct && extractedQty) {
      const newPrice = extractedQty
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

    // 8. Cek Stok Produk Spesifik (Jawaban Ramah & Tidak Teknikal)
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
        ? `**Perhatian:** Stok sudah menipis (di bawah batas aman ${matchedProduct.reorderPoint} ${matchedProduct.unit}). Sebaiknya segera pesan kembali.`
        : `Stok saat ini masih aman di atas batas minimum (${matchedProduct.reorderPoint} ${matchedProduct.unit}).`

      return {
        text: `Sisa stok **${matchedProduct.name}** saat ini ada **${matchedProduct.stock} ${matchedProduct.unit}** di toko dengan harga jual **${formatRupiah(matchedProduct.price)}**.\n\n${stockNote}`,
      }
    }

    // 9. Cek Stok Menipis / Perlu Reorder
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

    // 10. Cek Penjualan / Omzet / Laba Hari Ini
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

    // 11. Panduan Penggunaan Fitur Web
    if (q.includes('cara') || q.includes('panduan') || q.includes('bagaimana') || q.includes('tutorial') || q.includes('ajarin')) {
      if (q.includes('kasir') || q.includes('pos') || q.includes('jual') || q.includes('bayar') || q.includes('transaksi')) {
        return {
          text: 'Cara Melayani Pembeli di Kasir POS:\n1. Klik kartu produk es krim yang dipilih pembeli (atau scan barcodenya jika ada scanner).\n2. Sesuaikan jumlah pesanan di panel keranjang belanja sebelah kanan.\n3. Pilih metode pembayaran: **Tunai** atau **QRIS**.\n4. Klik tombol hijau **Bayar** (atau tekan **Enter**) untuk menyelesaikan transaksi dan mencetak struk.',
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

    // 12. Bantuan Umum yang Ramah & Tidak Kaku
    return {
      text: `Halo! Saya Asisten Toko Globaliti. Saya siap membantu Anda mengelola kasir dan stok.\n\nBeberapa hal yang bisa Anda sampaikan:\n- *"Berapa sisa stok Matcha Cup?"*\n- *"Aku baru aja restok dan sekarang nambah 50"*\n- *"Ada yang beli 2 Vanilla Cone tapi lupa diinput"*\n- *"Ada kiriman es krim Cokelat Stick 15"*\n- *"Produk apa saja yang stoknya menipis?"*\n- *"Berapa pendapatan kasir hari ini?"*`,
    }
  }

  // Urutan rantai model resmi Groq: dari yang paling pintar hingga paling dasar
  const GROQ_FALLBACK_CHAIN = [
    'qwen/qwen3.8-27b',             // Paling cerdas, fasih bahasa Indonesia, native parallel tool calling
    'openai/gpt-oss-120b',          // Model reasoning 120B parameter
    'openai/gpt-oss-20b',           // Model 20B seimbang & cepat
    'groq/compound',                // Model agentic compound
    'groq/compound-mini',           // Model agentic compound mini
    'allam-2-7b',                   // Model 7B multilingual
    'openai/gpt-oss-safeguard-20b', // Model safeguard dasar
  ]

  // Definisi Custom Tools Schema Resmi OpenAI/Groq
  const GROQ_TOOLS = [
    {
      type: 'function',
      function: {
        name: 'create_print_order',
        description: 'Catat pesanan cetak atau print dokumen baru ke antrean cetak jasa print Word/PDF. Jika dokumen memiliki campuran halaman warna dan hitam putih, panggil fungsi ini 2 kali (sekali untuk berwarna dan sekali untuk hitam putih).',
        parameters: {
          type: 'object',
          properties: {
            fileName: { type: 'string', description: 'Nama file dokumen (misal: Proposal_Kegiatan.docx)' },
            mode: { type: 'string', enum: ['Hitam putih', 'Berwarna'], description: 'Mode cetak warna atau hitam putih' },
            quantity: { type: 'integer', description: 'Jumlah halaman yang dicetak' },
            payment: { type: 'string', enum: ['Lunas di muka', 'Bayar di akhir'], description: 'Status pembayaran' },
          },
          required: ['fileName', 'mode', 'quantity', 'payment'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'record_sale',
        description: 'Catat transaksi penjualan kasir POS untuk produk es krim yang terjual atau belum sempat diinput.',
        parameters: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'string', description: 'ID produk es krim (p1, p2, p3, p4)' },
                  quantity: { type: 'integer', description: 'Jumlah unit yang terjual' },
                },
                required: ['productId', 'quantity'],
              },
              description: 'Daftar produk yang terjual',
            },
            payment: { type: 'string', enum: ['Tunai', 'QRIS'], description: 'Metode pembayaran kasir' },
          },
          required: ['items', 'payment'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'adjust_stock',
        description: 'Sesuaikan atau tambahkan stok fisik produk es krim di kulkas/freezer toko.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'ID produk es krim (p1, p2, p3, p4)' },
            delta: { type: 'integer', description: 'Jumlah selisih stok (positif jika restok, negatif jika rusak/kurang)' },
            reason: { type: 'string', description: 'Alasan perubahan atau penyesuaian stok' },
          },
          required: ['productId', 'delta'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'record_expense',
        description: 'Catat beban atau pengeluaran operasional toko sekolah ke pembukuan keuangan.',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['Operasional', 'Bahan', 'Lainnya'], description: 'Kategori beban' },
            description: { type: 'string', description: 'Keterangan pengeluaran' },
            amount: { type: 'number', description: 'Nominal pengeluaran dalam Rupiah' },
          },
          required: ['category', 'description', 'amount'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'update_price',
        description: 'Perbarui harga jual produk es krim di katalog toko.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'ID produk es krim' },
            newPrice: { type: 'number', description: 'Harga jual baru dalam Rupiah' },
          },
          required: ['productId', 'newPrice'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'update_print_order',
        description: 'Perbarui status pengerjaan atau status pelunasan antrean jasa cetak dokumen Word/PDF.',
        parameters: {
          type: 'object',
          properties: {
            orderId: { type: 'string', description: 'ID pesanan cetak (misal PRINT-0001, PRINT-0002)' },
            status: { type: 'string', enum: ['Menunggu cetak', 'Dicetak', 'Selesai'], description: 'Status pengerjaan cetak' },
            payment: { type: 'string', enum: ['Lunas di muka', 'Bayar di akhir', 'Lunas setelah cetak'], description: 'Status pembayaran' },
          },
          required: ['orderId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'update_payment_hotkeys',
        description: 'Perbarui tombol pintasan keyboard (hotkey) metode pembayaran di kasir POS (contoh: tunai: "1" atau "T", qris: "2" atau "Q", atau F1/F2).',
        parameters: {
          type: 'object',
          properties: {
            tunai: { type: 'string', description: 'Karakter atau tombol hotkey untuk Tunai (misal: "1", "T", "F1")' },
            qris: { type: 'string', description: 'Karakter atau tombol hotkey untuk QRIS (misal: "2", "Q", "F2")' },
          },
          required: ['tunai', 'qris'],
        },
      },
    },
  ]

  const callGroqChat = async (
    userText: string,
    history: AiMessage[],
    onStreamChunk?: (chunk: string) => void
  ): Promise<{ text: string; action?: AiAction; actions?: AiAction[] }> => {
    const rawKey = groqKey || localStorage.getItem('gc_groq_key') || ''
    const key = rawKey.trim()

    if (!key || !key.startsWith('gsk_')) {
      setEngineStatus('Engine Lokal')
      const localResult = processQuery(userText, history)
      if (onStreamChunk && localResult.text) {
        onStreamChunk(localResult.text)
      }
      return localResult
    }

    // Siapkan data operasional lengkap agar Asisten memiliki kontrol dan visibilitas 100% penuh
    const sortedSales = [...sales].sort((a, b) => b.id.localeCompare(a.id))
    const lastSale = sortedSales[0]
    const sortedPrintOrders = [...printOrders].sort((a, b) => b.id.localeCompare(a.id))
    const lastPrintOrder = sortedPrintOrders[0]
    const sortedExpenses = [...expenses]
    const lastExpense = sortedExpenses[0]

    // Hitung produk terlaris hari ini
    const productSalesCount: Record<string, number> = {}
    sales.forEach((s) => {
      s.items.forEach((it) => {
        productSalesCount[it.productId] = (productSalesCount[it.productId] || 0) + it.quantity
      })
    })
    const topSellingSummary = Object.entries(productSalesCount)
      .sort((a, b) => b[1] - a[1])
      .map(([pid, qty]) => {
        const p = products.find((prod) => prod.id === pid)
        return `${p ? p.name : pid} (${qty} ${p ? p.unit : 'unit'} terjual)`
      })
      .join(', ')

    // Ringkasan 10 nota transaksi penjualan kasir terbaru
    const recentSalesDetail = sortedSales.slice(0, 10).map((s) => {
      const itemsStr = s.items.map((it) => {
        const p = products.find((prod) => prod.id === it.productId)
        return `${p ? p.name : it.productId} (${it.quantity} ${p ? p.unit : 'unit'} @${formatRupiah(it.price)})`
      }).join(', ')
      return `  * [Nota: ${s.id}] Jam: ${s.time} | Kasir: ${s.operator} | Item: ${itemsStr} | Total: ${formatRupiah(s.total)} (${s.payment})`
    }).join('\n')

    // Ringkasan antrean cetak Word terbaru
    const recentPrintDetail = sortedPrintOrders.slice(0, 8).map((o) => {
      return `  * [Order: ${o.id}] Jam: ${o.time} | File: ${o.fileName} | Mode: ${o.mode} | Hal: ${o.quantity} | Total: ${formatRupiah(o.total)} | Pembayaran: ${o.payment} | Status: ${o.status}`
    }).join('\n')

    // Ringkasan beban pengeluaran toko terbaru
    const recentExpenseDetail = sortedExpenses.slice(0, 6).map((e) => {
      return `  * [Beban: ${e.id}] Kategori: ${e.category} | Ket: ${e.label || (e as any).description} | Nominal: ${formatRupiah(e.amount)}`
    }).join('\n')

    const systemPrompt = `Kamu adalah Asisten Kasir & Toko Pintar "Globaliti Creative Center" di SMKS TI Bali Global Denpasar.
STATUS OTORITAS: Kamu memiliki AKSES LANGSUNG dan KONTROL PENUH ke seluruh basis data operasional toko: riwayat nota kasir POS (termasuk isi nota belanja pelanggan terakhir), katalog dan stok produk di kulkas, antrean cetak Word, dan pembukuan beban.

DILARANG KERAS:
- Jangan pernah mengatakan "saya tidak memiliki akses langsung ke detail nota terakhir", "saya tidak tahu pelanggan terakhir beli apa", atau menyuruh kasir mencari sendiri! Kamu SUDAH memiliki data lengkap seluruh nota dan order di bawah ini. Jawab secara langsung, spesifik, ramah, dan solutif.

Data Operasional Toko Real-Time:
- TRANSAKSI PENJUALAN TERAKHIR (PALING BARU):
  ${lastSale ? `Nota ${lastSale.id} pada jam ${lastSale.time} WITA oleh ${lastSale.operator}:
  Barang yang dibeli: [${lastSale.items.map((it) => {
    const p = products.find((prod) => prod.id === it.productId)
    return `${p ? p.name : it.productId} sebanyak ${it.quantity} ${p ? p.unit : 'unit'} (Total: ${formatRupiah(it.price * it.quantity)})`
  }).join(', ')}]
  Total Tagihan: ${formatRupiah(lastSale.total)} via ${lastSale.payment}` : 'Belum ada transaksi kasir hari ini.'}

- RIWAYAT 10 NOTA PENJUALAN KASIR POS TERAKHIR:
${recentSalesDetail || '  (Belum ada transaksi)'}

- PRODUK TERLARIS HARI INI: ${topSellingSummary || 'Belum ada produk yang terjual hari ini'}

- ORDER CETAK DOKUMEN WORD TERAKHIR:
  ${lastPrintOrder ? `Order ${lastPrintOrder.id} (${lastPrintOrder.fileName}, ${lastPrintOrder.quantity} hal, ${lastPrintOrder.mode}, Total: ${formatRupiah(lastPrintOrder.total)}, Pembayaran: ${lastPrintOrder.payment}, Status: ${lastPrintOrder.status}) pada jam ${lastPrintOrder.time}` : 'Belum ada order cetak hari ini.'}

- RIWAYAT ANTREAN PRINT DOKUMEN:
${recentPrintDetail || '  (Belum ada antrean cetak)'}

- PENGELUARAN / BEBAN TERAKHIR:
  ${lastExpense ? `Beban ${lastExpense.id} (${lastExpense.label || (lastExpense as any).description}): ${formatRupiah(lastExpense.amount)} (${lastExpense.category})` : 'Belum ada pengeluaran'}

- RIWAYAT BEBAN PENGELUARAN TOKO:
${recentExpenseDetail || '  (Belum ada pengeluaran)'}

- KATALOG PRODUK & STOK FISIK SAAT INI:
${products.map((p) => `  * ${p.name} (ID: ${p.id}, Barcode: ${p.barcode}) | Stok: ${p.stock} ${p.unit} | Harga Jual: ${formatRupiah(p.price)} | Modal: ${formatRupiah(p.cost)} | Batas Min: ${p.reorderPoint} ${p.unit}`).join('\n')}

- PINTASAN KEYBOARD (HOTKEY) PEMBAYARAN KASIR SAAT INI:
  * Tunai: [${paymentHotkeys?.tunai || '1'}]
  * QRIS: [${paymentHotkeys?.qris || '2'}]
  (Jika kasir meminta untuk mengganti tombol hotkey pembayaran, gunakan fungsi update_payment_hotkeys).

- RINGKASAN FINANSIAL TOKO HARI INI:
  * Total Omzet Penjualan Es Krim: ${formatRupiah(sales.reduce((s, x) => s + x.total, 0))} (${sales.length} nota)
  * Pendapatan Print Dokumen: ${formatRupiah(printOrders.filter((o) => o.status === 'Selesai' || o.payment === 'Lunas di muka' || o.payment === 'Lunas setelah cetak').reduce((s, x) => s + x.total, 0))} (${printOrders.length} order)
  * Total Beban Operasional: ${formatRupiah(expenses.reduce((s, x) => s + x.amount, 0))}

Panduan Penggunaan Fitur Web:
${SYSTEM_MANUAL_MD}

Pedoman Komunikasi & Penyiapan Tindakan Sistem (Tool Calls):
1. Gunakan Bahasa Indonesia yang ramah, sopan, dan solutif.
2. DILARANG menggunakan tanda em-dash (—). Gunakan tanda minus (-) atau koma/titik biasa.
3. JIKA kasir meminta tindakan sistem (misal: penjualan es krim, tambah stok / restok, stok opname fisik di freezer, catat beban toko):
   - Jelaskan rincian dan perhitungannya secara ramah dan ringkas di teks chat.
   - PENTING: Untuk setiap aksi perubahan data, sertakan blok JSON aksi di AKHIR pesanmu. Blok aksi ini otomatis ditangkap sistem menjadi kartu UI khusus (Tool Call UI) dan TIDAK BOLEH dicampur di dalam paragraf obrolan.

Format tindakan penjualan:
Bisa digabung dalam satu transaksi:
\`\`\`action
{
  "type": "record_sale",
  "items": [
    { "productId": "p1", "quantity": 2 },
    { "productId": "p2", "quantity": 5 },
    { "productId": "p4", "quantity": 3 }
  ],
  "payment": "Tunai"
}
\`\`\`
Atau per item terpisah:
\`\`\`action
{
  "type": "record_sale",
  "productId": "p1",
  "quantity": 2,
  "payment": "Tunai",
  "description": "Penjualan Matcha Cup"
}
\`\`\`

Format tindakan stok:
\`\`\`action
{
  "type": "adjust_stock",
  "productId": "p2",
  "delta": 4,
  "description": "Tambah stok Vanilla Cone sebanyak 4 cone"
}
\`\`\`

Format tindakan beban:
\`\`\`action
{
  "type": "record_expense",
  "category": "Operasional" atau "Bahan",
  "amount": 50000,
  "description": "Beli kertas HVS"
}
\`\`\`

Format tindakan pesanan print/cetak dokumen:
\`\`\`action
{
  "type": "create_print_order",
  "fileName": "Proposal_Kegiatan.docx",
  "mode": "Berwarna" atau "Hitam putih",
  "quantity": 32,
  "payment": "Lunas di muka" atau "Bayar di akhir",
  "description": "Order print proposal (32 hal, Berwarna, Lunas)"
}
\`\`\`
Jika pesanan cetak memiliki campuran halaman warna dan hitam putih (misal 3 halaman berwarna dan 29 halaman hitam putih), WAJIB buatkan 2 blok action terpisah di akhir pesanmu:
\`\`\`action
{
  "type": "create_print_order",
  "fileName": "Proposal_Warna.docx",
  "mode": "Berwarna",
  "quantity": 3,
  "payment": "Lunas di muka",
  "description": "Print proposal bagian warna (3 hal, Berwarna, Lunas)"
}
\`\`\`
\`\`\`action
{
  "type": "create_print_order",
  "fileName": "Proposal_Teks.docx",
  "mode": "Hitam putih",
  "quantity": 29,
  "payment": "Lunas di muka",
  "description": "Print proposal bagian teks (29 hal, Hitam putih, Lunas)"
}
\`\`\`

PENTING: JANGAN PERNAH hanya menyebut perhitungan di teks tanpa menyertakan blok \`\`\`action. Setiap kali kasir meminta mencatat penjualan, beban, restok, atau order print, kamu WAJIB menyertakan blok \`\`\`action di akhir jawabanmu!
Jika pengguna hanya bertanya atau mengobrol biasa, jangan sertakan blok \`\`\`action.`

    const conversationMessages = history.slice(0, -1).slice(-8).map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }))

    let lastError = ''

    // Loop fallback chain secara berurutan dari yang paling pintar ke yang paling dasar
    for (const modelName of GROQ_FALLBACK_CHAIN) {
      try {
        let requestPayload: any = {
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationMessages,
            { role: 'user', content: userText },
          ],
          tools: GROQ_TOOLS,
          tool_choice: 'auto',
          stream: true,
          max_tokens: 800,
          temperature: 0.15,
        }

        let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
        })

        // Jika model tidak mendukung custom tool-calling (seperti groq/compound), coba ulang tanpa tools parameter
        if (!response.ok) {
          const errBody = await response.json().catch(() => null)
          const isToolUnsupported =
            errBody?.error?.message?.includes('tool calling') || errBody?.error?.param === 'tool calling'

          if (isToolUnsupported) {
            delete requestPayload.tools
            delete requestPayload.tool_choice
            response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestPayload),
            })
          }

          if (!response.ok) {
            const finalErrBody = await response.json().catch(() => null)
            const msg = finalErrBody?.error?.message || `HTTP ${response.status}`
            lastError = `${modelName}: ${msg}`
            console.warn(`Model Groq ${modelName} gagal:`, msg)
            continue
          }
        }

        let answer = ''
        const nativeToolCallsByIndex: Record<number, { id: string; name: string; arguments: string }> = {}

        if (response.body) {
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          let isSSE: boolean | null = null

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk

            if (isSSE === null) {
              const trimmed = buffer.trimStart()
              if (trimmed.startsWith('data:') || trimmed.startsWith(':')) {
                isSSE = true
              } else if (trimmed.startsWith('{')) {
                isSSE = false
              }
            }

            if (isSSE) {
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''
              for (const line of lines) {
                const t = line.trim()
                if (!t.startsWith('data:')) continue
                const payload = t.replace(/^data:\s*/, '')
                if (payload === '[DONE]') continue
                try {
                  const json = JSON.parse(payload)
                  const delta = json.choices?.[0]?.delta

                  if (delta?.content) {
                    answer += delta.content
                    if (onStreamChunk) {
                      const liveClean = answer
                        .replace(/```(?:action|json)?\s*\{[\s\S]*?(?:```|`|$)/gi, '')
                        .replace(/```(?:action|json)?[\s\S]*?(?:```|`|$)/gi, '')
                        .trim()
                      onStreamChunk(liveClean)
                    }
                  }

                  // Tangkap delta stream tool_calls resmi dari Groq
                  if (delta?.tool_calls && Array.isArray(delta.tool_calls)) {
                    for (const tc of delta.tool_calls) {
                      const idx = tc.index ?? 0
                      if (!nativeToolCallsByIndex[idx]) {
                        nativeToolCallsByIndex[idx] = {
                          id: tc.id || `tc-${Date.now()}-${idx}`,
                          name: '',
                          arguments: '',
                        }
                      }
                      if (tc.id) nativeToolCallsByIndex[idx].id = tc.id
                      if (tc.function?.name) nativeToolCallsByIndex[idx].name += tc.function.name
                      if (tc.function?.arguments) nativeToolCallsByIndex[idx].arguments += tc.function.arguments
                    }
                  }
                } catch {
                  // ignore partial json chunk
                }
              }
            }
          }

          if (!isSSE && buffer.trim()) {
            try {
              const json = JSON.parse(buffer.trim())
              const choiceMsg = json.choices?.[0]?.message
              answer = choiceMsg?.content || ''
              if (choiceMsg?.tool_calls && Array.isArray(choiceMsg.tool_calls)) {
                choiceMsg.tool_calls.forEach((tc: any, i: number) => {
                  nativeToolCallsByIndex[i] = {
                    id: tc.id || `tc-${Date.now()}-${i}`,
                    name: tc.function?.name || '',
                    arguments: tc.function?.arguments || '',
                  }
                })
              }
            } catch {
              // ignore
            }
          }
        }

        const actionBlocks: AiAction[] = []

        // 1. Eksekusi Native Tool Calls dari Groq (jika ada)
        const nativeIndexes = Object.keys(nativeToolCallsByIndex).sort((a, b) => Number(a) - Number(b))
        if (nativeIndexes.length > 0) {
          for (const k of nativeIndexes) {
            const tc = nativeToolCallsByIndex[Number(k)]
            try {
              const parsed = JSON.parse(tc.arguments.trim())
              if (tc.name === 'create_print_order') {
                const rawFileName = parsed.fileName || 'proposal.docx'
                const fileName = rawFileName.includes('.') ? rawFileName : `${rawFileName}.docx`
                const rawMode = String(parsed.mode || '').toLowerCase()
                const mode: 'Hitam putih' | 'Berwarna' = rawMode.includes('warna') || rawMode.includes('color') ? 'Berwarna' : 'Hitam putih'
                const qty = Math.max(1, Number(parsed.quantity || parsed.pages) || 1)
                const rawPay = String(parsed.payment || '').toLowerCase()
                const isPostpaid = rawPay.includes('akhir') || rawPay.includes('nanti') || rawPay.includes('tempo')
                const payment: 'Lunas di muka' | 'Bayar di akhir' = isPostpaid ? 'Bayar di akhir' : 'Lunas di muka'
                actionBlocks.push({
                  id: tc.id || `act-${Date.now()}-${actionBlocks.length}`,
                  action: 'create_print_order',
                  description: `Order print ${fileName} (${qty} hal, ${mode}, ${payment})`,
                  params: {
                    fileName,
                    mode,
                    quantity: qty,
                    payment,
                  },
                  status: 'pending',
                })
              } else if (tc.name === 'record_sale') {
                if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
                  const saleItems = parsed.items.map((it: any) => {
                    const p = products.find((prod) => prod.id === it.productId)
                    return {
                      productId: it.productId,
                      quantity: Number(it.quantity) || 1,
                      price: p ? p.price : Number(it.price) || 0,
                    }
                  })
                  const total = saleItems.reduce((s: number, it: any) => s + it.price * it.quantity, 0)
                  const payment = parsed.payment === 'QRIS' ? 'QRIS' : 'Tunai'
                  actionBlocks.push({
                    id: tc.id || `act-${Date.now()}-${actionBlocks.length}`,
                    action: 'record_sale',
                    description: `Catat transaksi penjualan ${saleItems.length} produk (${formatRupiah(total)}) via ${payment}`,
                    params: {
                      items: saleItems,
                      payment,
                    },
                    status: 'pending',
                  })
                }
              } else if (tc.name === 'adjust_stock') {
                const prod = products.find((p) => p.id === parsed.productId)
                if (prod && typeof parsed.delta === 'number') {
                  actionBlocks.push({
                    id: tc.id || `act-${Date.now()}-${actionBlocks.length}`,
                    action: 'adjust_stock',
                    description: parsed.reason || `${parsed.delta > 0 ? 'Tambah' : 'Kurangi'} stok ${prod.name} sebanyak ${Math.abs(parsed.delta)} ${prod.unit}`,
                    params: {
                      productId: prod.id,
                      delta: parsed.delta,
                      reason: parsed.reason || 'Penyesuaian stok via asisten AI',
                    },
                    status: 'pending',
                  })
                }
              } else if (tc.name === 'record_expense' && parsed.amount) {
                const amount = Number(parsed.amount)
                const category = parsed.category === 'Bahan' ? 'Bahan' : 'Operasional'
                const desc = parsed.description || 'Beban Operasional Toko'
                actionBlocks.push({
                  id: tc.id || `act-${Date.now()}-${actionBlocks.length}`,
                  action: 'record_expense',
                  description: `Catat beban ${desc} (${category}) senilai ${formatRupiah(amount)}`,
                  params: {
                    category,
                    description: desc,
                    amount,
                  },
                  status: 'pending',
                })
              } else if (tc.name === 'update_price' && parsed.productId && typeof parsed.newPrice === 'number') {
                const prod = products.find((p) => p.id === parsed.productId)
                if (prod) {
                  actionBlocks.push({
                    id: tc.id || `act-${Date.now()}-${actionBlocks.length}`,
                    action: 'update_price',
                    description: `Ubah harga jual ${prod.name} menjadi ${formatRupiah(parsed.newPrice)}`,
                    params: {
                      productId: prod.id,
                      newPrice: parsed.newPrice,
                    },
                    status: 'pending',
                  })
                }
              } else if (tc.name === 'update_print_order' && parsed.orderId) {
                const target = printOrders.find((o) => o.id.toUpperCase() === parsed.orderId.toUpperCase()) || printOrders[0]
                if (target) {
                  const status = parsed.status || 'Selesai'
                  const payment = parsed.payment || (target.payment === 'Bayar di akhir' ? 'Lunas setelah cetak' : target.payment)
                  actionBlocks.push({
                    id: tc.id || `act-${Date.now()}-${actionBlocks.length}`,
                    action: 'update_print_order',
                    description: `Perbarui order ${target.id}: status ${status}, ${payment}`,
                    params: {
                      orderId: target.id,
                      status,
                      payment,
                    },
                    status: 'pending',
                  })
                }
              } else if (tc.name === 'update_payment_hotkeys' && parsed.tunai && parsed.qris) {
                actionBlocks.push({
                  id: tc.id || `act-${Date.now()}-${actionBlocks.length}`,
                  action: 'update_payment_hotkeys',
                  description: `Ubah hotkey pembayaran: Tunai [${String(parsed.tunai).toUpperCase()}], QRIS [${String(parsed.qris).toUpperCase()}]`,
                  params: {
                    tunai: String(parsed.tunai).toUpperCase(),
                    qris: String(parsed.qris).toUpperCase(),
                  },
                  status: 'pending',
                })
              }
            } catch (err) {
              console.warn('Gagal mem-parsing argumen native tool call:', err)
            }
          }
        }

        // 2. Ekstrak Action Card dari blok ```action atau ```json (fallback jika LLM menulis format kode)
        if (actionBlocks.length === 0) {
          const blockRegex = /```(?:action|json)?\s*(\{[\s\S]*?\})\s*(?:```|`|$)/gi
          let matchResult
          while ((matchResult = blockRegex.exec(answer)) !== null) {
            try {
              const parsed = JSON.parse(matchResult[1].trim())
              if (parsed.type === 'adjust_stock' && parsed.productId && typeof parsed.delta === 'number') {
                const prod = products.find((p) => p.id === parsed.productId)
                if (prod) {
                  actionBlocks.push({
                    id: `act-${Date.now()}-${actionBlocks.length}`,
                    action: 'adjust_stock',
                    description: parsed.description || `${parsed.delta > 0 ? 'Tambah' : 'Kurangi'} stok ${prod.name} sebanyak ${Math.abs(parsed.delta)} ${prod.unit}`,
                    params: {
                      productId: prod.id,
                      delta: parsed.delta,
                      reason: parsed.description || 'Penyesuaian stok via asisten AI',
                    },
                    status: 'pending',
                  })
                }
              } else if (parsed.type === 'record_sale') {
                if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
                  const saleItems = parsed.items.map((it: any) => {
                    const p = products.find((prod) => prod.id === it.productId)
                    return {
                      productId: it.productId,
                      quantity: Number(it.quantity) || 1,
                      price: p ? p.price : Number(it.price) || 0,
                    }
                  })
                  const total = saleItems.reduce((s: number, it: any) => s + it.price * it.quantity, 0)
                  const payment = parsed.payment === 'QRIS' ? 'QRIS' : 'Tunai'
                  actionBlocks.push({
                    id: `act-${Date.now()}-${actionBlocks.length}`,
                    action: 'record_sale',
                    description: parsed.description || `Catat transaksi penjualan ${saleItems.length} produk (${formatRupiah(total)}) via ${payment}`,
                    params: {
                      items: saleItems,
                      payment,
                    },
                    status: 'pending',
                  })
                } else if (parsed.productId && parsed.quantity) {
                  const prod = products.find((p) => p.id === parsed.productId)
                  if (prod) {
                    const qty = Number(parsed.quantity)
                    const payment = parsed.payment === 'QRIS' ? 'QRIS' : 'Tunai'
                    const totalPrice = prod.price * qty
                    actionBlocks.push({
                      id: `act-${Date.now()}-${actionBlocks.length}`,
                      action: 'record_sale',
                      description: parsed.description || `Catat transaksi penjualan: ${prod.name} (${qty} ${prod.unit}) senilai ${formatRupiah(totalPrice)} via ${payment}`,
                      params: {
                        items: [{ productId: prod.id, quantity: qty, price: prod.price }],
                        payment,
                      },
                      status: 'pending',
                    })
                  }
                }
              } else if (parsed.type === 'record_expense' && parsed.amount) {
                const amount = Number(parsed.amount)
                const category = parsed.category === 'Bahan' ? 'Bahan' : 'Operasional'
                const desc = parsed.description || 'Beban Operasional Toko'
                actionBlocks.push({
                  id: `act-${Date.now()}-${actionBlocks.length}`,
                  action: 'record_expense',
                  description: `Catat beban ${desc} (${category}) senilai ${formatRupiah(amount)}`,
                  params: {
                    category,
                    description: desc,
                    amount,
                  },
                  status: 'pending',
                })
              } else if (parsed.type === 'create_print_order' || parsed.type === 'print_order') {
                const rawFileName = parsed.fileName || parsed.file || 'Dokumen_Proposal.docx'
                const fileName = rawFileName.includes('.') ? rawFileName : `${rawFileName}.docx`
                const rawMode = String(parsed.mode || '').toLowerCase()
                const mode: 'Hitam putih' | 'Berwarna' = rawMode.includes('warna') || rawMode.includes('color') ? 'Berwarna' : 'Hitam putih'
                const qty = Math.max(1, Number(parsed.quantity || parsed.pages || parsed.halaman || parsed.qty) || 1)
                const rawPay = String(parsed.payment || '').toLowerCase()
                const isPostpaid = rawPay.includes('akhir') || rawPay.includes('nanti') || rawPay.includes('tempo')
                const payment: 'Lunas di muka' | 'Bayar di akhir' = isPostpaid ? 'Bayar di akhir' : 'Lunas di muka'
                actionBlocks.push({
                  id: `act-${Date.now()}-${actionBlocks.length}`,
                  action: 'create_print_order',
                  description: parsed.description || `Buat order cetak: ${fileName} (${qty} hal, ${mode}, ${payment})`,
                  params: {
                    fileName,
                    mode,
                    quantity: qty,
                    payment,
                  },
                  status: 'pending',
                })
              } else if (parsed.type === 'update_print_order') {
                const orderId = parsed.orderId || printOrders[0]?.id || 'PRINT-0001'
                const status = parsed.status || 'Selesai'
                const payment = parsed.payment || 'Lunas setelah cetak'
                actionBlocks.push({
                  id: `act-${Date.now()}-${actionBlocks.length}`,
                  action: 'update_print_order',
                  description: parsed.description || `Perbarui status ${orderId}: ${status} (${payment})`,
                  params: {
                    orderId,
                    status,
                    payment,
                  },
                  status: 'pending',
                })
              } else if (parsed.type === 'update_payment_hotkeys' && parsed.tunai && parsed.qris) {
                actionBlocks.push({
                  id: `act-${Date.now()}-${actionBlocks.length}`,
                  action: 'update_payment_hotkeys',
                  description: `Ubah hotkey pembayaran: Tunai [${String(parsed.tunai).toUpperCase()}], QRIS [${String(parsed.qris).toUpperCase()}]`,
                  params: {
                    tunai: String(parsed.tunai).toUpperCase(),
                    qris: String(parsed.qris).toUpperCase(),
                  },
                  status: 'pending',
                })
              } else if (parsed.type === 'update_price' && parsed.productId && typeof parsed.newPrice === 'number') {
                const prod = products.find((p) => p.id === parsed.productId)
                if (prod) {
                  actionBlocks.push({
                    id: `act-${Date.now()}-${actionBlocks.length}`,
                    action: 'update_price',
                    description: parsed.description || `Ubah harga jual ${prod.name} menjadi ${formatRupiah(parsed.newPrice)}`,
                    params: {
                      productId: prod.id,
                      newPrice: parsed.newPrice,
                    },
                    status: 'pending',
                  })
                }
              }
            } catch {
              // Abaikan JSON parse error
            }
          }
        }

        // Bersihkan seluruh blok action / json / code blocks dari chat bubble agar tidak terekspos
        let cleanText = answer
          .replace(/```(?:action|json)?\s*\{[\s\S]*?\}\s*(?:```|`|$)/gi, '')
          .replace(/```(?:action|json)?[\s\S]*?(?:```|`|$)/gi, '')
          .trim()

        // 3. Fallback ekstraksi heuristik jika LLM menjawab teks biasa tanpa format JSON ataupun native tools
        if (actionBlocks.length === 0) {
          const q = userText.toLowerCase()
          let targetProduct = findProductInText(q) || findProductInText(cleanText)
          if (!targetProduct && history.length > 0) {
            for (let i = history.length - 1; i >= 0; i--) {
              const p = findProductInText(history[i].text)
              if (p) { targetProduct = p; break }
            }
          }

          const extractedQty = extractQuantity(q) || extractQuantity(cleanText)
          const isRestockIntent = /\b(?:tambah|nambah|restok|restock|re-stok|pasok|kirim|kulak)\w*\b/i.test(q)
          const isPhysicalDiscrepancy = ['freezer', 'kulkas', 'showcase', 'etalase', 'lemari es', 'gudang', 'rak', 'fisik', 'nyata', 'aslinya', 'sebenarnya', 'riil', 'opname'].some(k => q.includes(k) || cleanText.toLowerCase().includes(k))

          if (targetProduct && isRestockIntent && extractedQty) {
            const qty = extractedQty
            actionBlocks.push({
              id: `act-${Date.now()}-0`,
              action: 'adjust_stock',
              description: `Tambah stok ${targetProduct.name} sebanyak ${qty} ${targetProduct.unit}`,
              params: {
                productId: targetProduct.id,
                delta: qty,
                reason: 'Penambahan stok via asisten AI',
              },
              status: 'pending',
            })
          } else if (targetProduct && isPhysicalDiscrepancy && extractedQty !== null) {
            const physicalQty = extractedQty
            const delta = physicalQty - targetProduct.stock
            if (delta !== 0) {
              actionBlocks.push({
                id: `act-${Date.now()}-0`,
                action: 'adjust_stock',
                description: `Sesuaikan stok opname ${targetProduct.name} menjadi ${physicalQty} ${targetProduct.unit} (${delta > 0 ? '+' : ''}${delta} ${targetProduct.unit} selisih fisik)`,
                params: {
                  productId: targetProduct.id,
                  delta,
                  reason: 'Penyesuaian stok opname fisik di freezer',
                },
                status: 'pending',
              })
            }
          }

          // Fallback ekstraksi cerdas untuk pesanan cetak/print (misal: "32 halaman, 3 halaman berwarna lunas")
          const isPrintMention = /\b(?:print|ngeprint|cetak|halaman|proposal|word|lembar)\b/i.test(q) ||
                                 /\b(?:print|ngeprint|cetak|halaman|proposal|order cetak)\b/i.test(cleanText)
          if (isPrintMention) {
            const combinedText = `${userText} ${cleanText}`
            const colorMatch = combinedText.match(/(\d+)\s*(?:halaman|hal|lbr|lembar)?\s*(?:berwarna|warna|color)/i) ||
                               combinedText.match(/(?:berwarna|warna|color)\s*(?:cuma|hanya)?\s*(\d+)/i)
            const bwMatch = combinedText.match(/(\d+)\s*(?:halaman|hal|lbr|lembar)?\s*(?:hitam[- ]putih|bw|b\/w)/i) ||
                            combinedText.match(/(?:hitam[- ]putih|bw)\s*(?:cuma|hanya)?\s*(\d+)/i)
            const totalMatch = combinedText.match(/(?:total|jumlah|sebanyak|isi)?\s*(\d+)\s*(?:halaman|hal|lembar)/i)

            const colorCount = colorMatch ? parseInt(colorMatch[1], 10) : 0
            let totalPages = totalMatch ? parseInt(totalMatch[1], 10) : (extractedQty || 0)
            let bwCount = bwMatch ? parseInt(bwMatch[1], 10) : 0

            if (totalPages > 0 && colorCount > 0 && bwCount === 0 && totalPages > colorCount) {
              bwCount = totalPages - colorCount
            }

            const isPostpaid = /\b(?:bayar nanti|tempo|bayar di akhir|belum lunas|ngutang)\b/i.test(combinedText)
            const payment: 'Lunas di muka' | 'Bayar di akhir' = isPostpaid ? 'Bayar di akhir' : 'Lunas di muka'
            const fileBase = /proposal/i.test(combinedText) ? 'Proposal_Kegiatan' : 'Dokumen_Cetak'

            if (colorCount > 0) {
              actionBlocks.push({
                id: `act-${Date.now()}-${actionBlocks.length}`,
                action: 'create_print_order',
                description: `Buat order cetak: ${fileBase}_Warna.docx (${colorCount} hal, Berwarna, ${payment})`,
                params: {
                  fileName: `${fileBase}_Warna.docx`,
                  mode: 'Berwarna',
                  quantity: colorCount,
                  payment,
                },
                status: 'pending',
              })
            }

            if (bwCount > 0) {
              actionBlocks.push({
                id: `act-${Date.now()}-${actionBlocks.length}`,
                action: 'create_print_order',
                description: `Buat order cetak: ${fileBase}_Teks.docx (${bwCount} hal, Hitam putih, ${payment})`,
                params: {
                  fileName: `${fileBase}_Teks.docx`,
                  mode: 'Hitam putih',
                  quantity: bwCount,
                  payment,
                },
                status: 'pending',
              })
            } else if (colorCount === 0 && totalPages > 0) {
              actionBlocks.push({
                id: `act-${Date.now()}-${actionBlocks.length}`,
                action: 'create_print_order',
                description: `Buat order cetak: ${fileBase}.docx (${totalPages} hal, Hitam putih, ${payment})`,
                params: {
                  fileName: `${fileBase}.docx`,
                  mode: 'Hitam putih',
                  quantity: totalPages,
                  payment,
                },
                status: 'pending',
              })
            }
          }
        }

        // Jika model hanya mengeluarkan tool calls tanpa teks (misal gpt-oss-120b), siapkan teks pengantar kasir ramah
        if (!cleanText && actionBlocks.length > 0) {
          if (actionBlocks.some((a) => a.action === 'create_print_order')) {
            cleanText = `Baik, saya telah menyiapkan pencatatan ${actionBlocks.length} order cetak dokumen ke antrean print. Silakan periksa kartu tindakan di bawah dan terapkan:`
          } else if (actionBlocks.some((a) => a.action === 'record_sale')) {
            cleanText = `Baik, saya telah menyiapkan pencatatan transaksi penjualan kasir untuk Anda. Silakan periksa rincian di bawah:`
          } else if (actionBlocks.some((a) => a.action === 'adjust_stock')) {
            cleanText = `Baik, saya telah menyiapkan kartu penyesuaian stok produk toko. Silakan periksa dan konfirmasi di bawah:`
          } else if (actionBlocks.some((a) => a.action === 'record_expense')) {
            cleanText = `Baik, saya telah menyiapkan pencatatan beban operasional toko ke laporan keuangan. Silakan periksa di bawah:`
          } else {
            cleanText = `Saya telah menyiapkan ${actionBlocks.length} tindakan sistem untuk Anda. Silakan periksa kartu di bawah:`
          }
        }

        if (!cleanText && actionBlocks.length === 0) {
          continue
        }

                setEngineStatus(`Groq (${modelName})`)
        setEngineError(null)
        return {
          text: cleanText,
          action: actionBlocks[0],
          actions: actionBlocks,
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Kesalahan jaringan'
        console.warn(`Kesalahan jaringan pada model ${modelName}:`, err)
        continue
      }
    }

    // Jika seluruh model pada fallback chain gagal, fallback ke engine lokal dan berikan peringatan
    console.error('Semua model Groq gagal:', lastError)
    setEngineStatus('Engine Lokal (Fallback)')
    setEngineError(`Groq tidak merespons (${lastError}). Menggunakan engine lokal.`)
    return processQuery(userText, history)
  }

      const handleSend = async () => {
    if (!input.trim() || loading) return

    const userText = input.trim()
    const now = new Date()
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

    const userMsg: AiMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: userText,
      time: timeStr,
    }

    const assistantId = `msg-${Date.now() + 1}`
    const placeholderAssistantMsg: AiMessage = {
      id: assistantId,
      role: 'assistant',
      text: '',
      time: timeStr,
      streaming: true,
    }

    onUpdateMessages((prev) => [...prev, userMsg, placeholderAssistantMsg])
    setInput('')
    setLoading(true)

    const onStreamChunk = (partialText: string) => {
      onUpdateMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, text: partialText } : m))
      )
    }

    // Teruskan riwayat pesan (termasuk userMsg yang baru dikirim) ke Groq
    const currentHistory = [...messages, userMsg]
    const response = await callGroqChat(userText, currentHistory, onStreamChunk)

    onUpdateMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? {
              ...m,
              text: response.text,
              action: response.action,
              actions: response.actions,
              streaming: false,
            }
          : m
      )
    )
    setLoading(false)
  }

  const handleApplyAction = (msgId: string, action: AiAction) => {
    if (action.action === 'adjust_stock' && onAdjustStock) {
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
    } else if (action.action === 'update_payment_hotkeys' && onUpdatePaymentHotkeys) {
      onUpdatePaymentHotkeys({ tunai: action.params.tunai, qris: action.params.qris })
    }

    onUpdateMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== msgId) return msg
        const updatedSingle = msg.action && msg.action.id === action.id ? { ...msg.action, status: 'applied' as const } : msg.action
        const updatedList = msg.actions
          ? msg.actions.map((act) => (act.id === action.id ? { ...act, status: 'applied' as const } : act))
          : undefined
        return {
          ...msg,
          action: updatedSingle,
          actions: updatedList,
        }
      })
    )
  }

  const handleApplyAllActions = (msgId: string, actions: AiAction[]) => {
    actions.filter((a) => a.status === 'pending').forEach((a) => {
      handleApplyAction(msgId, a)
    })
  }

  const handleRejectAction = (msgId: string, actionId?: string) => {
    onUpdateMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== msgId) return msg
        const updatedSingle = msg.action && (!actionId || msg.action.id === actionId) ? { ...msg.action, status: 'rejected' as const } : msg.action
        const updatedList = msg.actions
          ? msg.actions.map((act) => (!actionId || act.id === actionId ? { ...act, status: 'rejected' as const } : act))
          : undefined
        return {
          ...msg,
          action: updatedSingle,
          actions: updatedList,
        }
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
            {engineError ? (
              <span className="status-pill waiting" title={engineError}>
                <Warning size={13} /> Groq Offline (Lokal)
              </span>
            ) : (
              <span className={`status-pill ${groqKey && groqKey.startsWith('gsk_') ? 'live' : 'paused'}`}>
                {groqKey && groqKey.startsWith('gsk_')
                  ? <><Lightning size={13} /> {engineStatus}</>
                  : <><Desktop size={13} /> Engine Lokal</>}
              </span>
            )}
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
                {msg.role === 'user' ? <User size={16} /> : <Sparkle size={15} weight="fill" />}
              </div>
              <div className="ai-bubble-content">
                <div className="ai-bubble-header">
                  <strong>{msg.role === 'user' ? 'Pengelola' : 'Asisten Globaliti'}</strong>
                  <small>{msg.time}</small>
                </div>
                <div className="ai-bubble-text">
                  {msg.role === 'assistant' ? (
                    <>
                      {msg.text ? <MarkdownContent content={msg.text} /> : (msg.streaming ? <span className="ai-thinking">Mengetik jawaban...</span> : null)}
                      {msg.streaming && <span className="streaming-cursor" aria-hidden="true" />}
                    </>
                  ) : (
                    msg.text
                  )}
                </div>

                {/* Dedicated Action Proposal UI (Human-friendly & Modern) */}
                {(() => {
                  const msgActions = msg.actions && msg.actions.length > 0 ? msg.actions : (msg.action ? [msg.action] : [])
                  if (msgActions.length === 0) return null

                  const pendingCount = msgActions.filter((a) => a.status === 'pending').length

                  const isBatch = msgActions.length > 1

                  return (
                    <div className={`ai-actions-stack ${isBatch ? 'is-batch' : 'is-single'}`}>
                      {isBatch && (
                        <div className="proposal-batch-banner ai-batch-actions-bar">
                          <div className="batch-info">
                            <span className="batch-badge">
                              {pendingCount > 0 ? `${pendingCount} Tindakan` : `${msgActions.length} Tindakan`}
                            </span>
                            <span className="batch-label">
                              {pendingCount > 0 ? 'Perlu konfirmasi' : 'Semua tindakan telah diterapkan'}
                            </span>
                          </div>
                          {pendingCount > 0 && (
                            <button
                              type="button"
                              className="proposal-btn-apply batch-apply-btn"
                              onClick={() => handleApplyAllActions(msg.id, msgActions)}
                            >
                              <Check size={13} weight="bold" />
                              <span>Terapkan Semua ({pendingCount})</span>
                            </button>
                          )}
                        </div>
                      )}

                      {msgActions.map((action, idx) => {
                        const cat = getActionCategory(action.action)
                        return (
                          <div
                            key={action.id || `act-${idx}`}
                            className={`action-proposal-card tool-call-card ${action.status} ${isBatch ? 'is-batch-item' : ''}`}
                          >
                            <div className="proposal-header">
                              <div className="proposal-category">
                                <span className="proposal-category-icon">{cat.icon}</span>
                                <span>{cat.label}</span>
                              </div>
                              <span className={`proposal-status-pill ${action.status}`}>
                                {action.status === 'pending'
                                  ? 'Perlu Konfirmasi'
                                  : action.status === 'applied'
                                  ? 'Telah Diterapkan'
                                  : 'Dibatalkan'}
                              </span>
                            </div>

                            <div className="proposal-content">
                              <h4 className="proposal-title">{action.description}</h4>
                              {action.action === 'record_sale' && action.params.items && (
                                <div className="proposal-meta-row">
                                  {action.params.items.map((it: any, itemIdx: number) => {
                                    const p = products.find((prod) => prod.id === it.productId)
                                    return (
                                      <span key={itemIdx} className="proposal-tag">
                                        {p ? p.name : it.productId} · <strong>{it.quantity} {p ? p.unit : 'unit'}</strong> ({formatRupiah(it.price * it.quantity)})
                                      </span>
                                    )
                                  })}
                                  <span className="proposal-tag method">
                                    Metode: <strong>{action.params.payment}</strong>
                                  </span>
                                </div>
                              )}
                              {action.action === 'adjust_stock' && (
                                <div className="proposal-meta-row">
                                  <span className="proposal-tag">
                                    Perubahan: <strong>{action.params.delta > 0 ? `+${action.params.delta}` : action.params.delta} unit</strong>
                                  </span>
                                  {action.params.reason && <span className="proposal-tag">{action.params.reason}</span>}
                                </div>
                              )}
                              {action.action === 'record_expense' && (
                                <div className="proposal-meta-row">
                                  <span className="proposal-tag">Kategori: <strong>{action.params.category}</strong></span>
                                  <span className="proposal-tag">Nominal: <strong>{formatRupiah(action.params.amount)}</strong></span>
                                </div>
                              )}
                              {action.action === 'create_print_order' && (
                                <div className="proposal-meta-row">
                                  <span className="proposal-tag"><strong>{action.params.fileName}</strong></span>
                                  <span className="proposal-tag"><strong>{action.params.quantity} hal</strong> · {action.params.mode}</span>
                                  <span className="proposal-tag method"><strong>{action.params.payment}</strong></span>
                                </div>
                              )}
                              {action.action === 'update_payment_hotkeys' && (
                                <div className="proposal-meta-row">
                                  <span className="proposal-tag">Tunai: <strong>[{action.params.tunai}]</strong></span>
                                  <span className="proposal-tag">QRIS: <strong>[{action.params.qris}]</strong></span>
                                </div>
                              )}
                            </div>

                            {action.status === 'pending' && (
                              <div className="proposal-footer-actions ai-action-buttons">
                                <button
                                  type="button"
                                  className="proposal-btn-dismiss secondary-button"
                                  onClick={() => handleRejectAction(msg.id, action.id)}
                                >
                                  Batalkan
                                </button>
                                <button
                                  type="button"
                                  className="proposal-btn-apply primary-action"
                                  onClick={() => handleApplyAction(msg.id, action)}
                                >
                                  <Check size={14} weight="bold" /> Terapkan Perubahan
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>
          ))}

          {loading && messages.length > 0 && messages[messages.length - 1]?.text === '' && (
            <div className="ai-message-bubble assistant-side">
              <div className="ai-avatar"><Sparkle size={15} weight="fill" /></div>
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
