import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  Barcode,
  CaretRight,
  Check,
  CheckCircle,
  ClockCounterClockwise,
  Cube,
  FileText,
  GearSix,
  MagnifyingGlass,
  Minus,
  Package,
  PencilSimple,
  Plus,
  Power,
  Printer,
  Receipt,
  Scan,
  ShoppingBag,
  ShoppingCart,
  Trash,
  Wallet,
  Warning,
  X,
} from '@phosphor-icons/react'
import type { PrintOrder, PrintSettings, Product, Sale, SaleItem } from './types'
import './index.css'
import './globaliti-base.css'
import './globaliti-layout.css'
import './globaliti-overlays.css'
import './globaliti-catalog.css'
import './globaliti-print.css'
import './globaliti-finance.css'
import './globaliti-ai.css'
import './globaliti-responsive.css'
import './globaliti-settings.css'
import FinanceView from './components/FinanceView'
import AiView from './components/AiView'
import FloatingAssistant from './components/FloatingAssistant'
import SettingsView from './components/SettingsView'
import { loadStore, saveStore, type StoreData } from './lib/store'
import type { AiMessage, Expense } from './types'

// Design Read: Reading this as a trust-first operational dashboard for two school-store managers, with a calm white and pastel language, leaning toward a focused retail control room.
// Dials: DESIGN_VARIANCE 4, MOTION_INTENSITY 3, VISUAL_DENSITY 7.
// Signature: a mint "scan rail" that turns a barcode scan into a visible transaction receipt.

type View = 'pos' | 'products' | 'print' | 'finance' | 'settings'
type ProductForm = Omit<Product, 'id' | 'active'>
type PrintForm = {
  fileName: string
  mode: 'Hitam putih' | 'Berwarna'
  quantity: number
  payment: 'Lunas di muka' | 'Bayar di akhir'
}

const initialProducts: Product[] = [
  { id: 'p1', barcode: '8990000000010', name: 'Matcha Cup', category: 'Es krim', unit: 'cup', price: 8000, cost: 4500, stock: 24, reorderPoint: 8, active: true },
  { id: 'p2', barcode: '8990000000027', name: 'Vanilla Cone', category: 'Es krim', unit: 'cone', price: 6000, cost: 3000, stock: 18, reorderPoint: 8, active: true },
  { id: 'p3', barcode: '8990000000034', name: 'Cokelat Stick', category: 'Es krim', unit: 'stick', price: 5000, cost: 2500, stock: 32, reorderPoint: 10, active: true },
  { id: 'p4', barcode: '8990000000041', name: 'Strawberry Cup', category: 'Es krim', unit: 'cup', price: 8000, cost: 4500, stock: 11, reorderPoint: 8, active: true },
]

const initialSales: Sale[] = [
  { id: 'TRX-0001', time: '08:14', operator: 'Pengelola 1', items: [{ productId: 'p1', quantity: 2, price: 8000 }], total: 16000, payment: 'Tunai' },
  { id: 'TRX-0002', time: '09:02', operator: 'Pengelola 1', items: [{ productId: 'p3', quantity: 1, price: 5000 }], total: 5000, payment: 'QRIS' },
  { id: 'TRX-0003', time: '10:26', operator: 'Pengelola 2', items: [{ productId: 'p2', quantity: 3, price: 6000 }], total: 18000, payment: 'Tunai' },
]

const initialSettings: PrintSettings = { bwRate: 500, colorRate: 1000, basis: 'Halaman' }

const initialExpenses: Expense[] = [
  { id: 'exp-1', label: 'Pembelian Kertas HVS A4 2 Rim', category: 'Bahan Habis Pakai', amount: 96000, date: '2026-09-17' },
  { id: 'exp-2', label: 'Tinta Printer Black & Color Refill', category: 'Bahan Habis Pakai', amount: 150000, date: '2026-09-16' },
]

const initialPrintOrders: PrintOrder[] = [
  { id: 'PRINT-0001', time: '08:44', fileName: 'Makalah_Bab_1.docx', mode: 'Hitam putih', quantity: 4, basis: 'Halaman', total: 2000, payment: 'Lunas di muka', status: 'Selesai' },
  { id: 'PRINT-0002', time: '10:18', fileName: 'Lampiran_Tugas.docx', mode: 'Berwarna', quantity: 2, basis: 'Halaman', total: 2000, payment: 'Bayar di akhir', status: 'Dicetak' },
  { id: 'PRINT-0003', time: '11:05', fileName: 'Proposal_Kegiatan.docx', mode: 'Hitam putih', quantity: 6, basis: 'Halaman', total: 3000, payment: 'Lunas di muka', status: 'Menunggu cetak' },
]

const productImages: Record<string, string> = {
  p1: '/products/matcha-cup.svg',
  p2: '/products/vanilla-cone.svg',
  p3: '/products/chocolate-stick.svg',
  p4: '/products/strawberry-cup.svg',
}

const getProductImage = (id: string) => productImages[id] || '/products/default-icecream.svg'

const formatRupiah = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

const defaultAiWelcomeMessage: AiMessage = {
  id: 'msg-welcome',
  role: 'assistant',
  text: 'Halo! Saya Asisten Globaliti. Ada yang bisa saya bantu untuk cek stok es krim, jasa print dokumen, atau operasional toko hari ini? Anda bisa langsung bertanya atau meminta bantuan dengan bahasa santai sehari-hari.',
  time: '08:00',
}

function GlobalitiApp() {
  const [storageError, setStorageError] = useState('')
  const [restored] = useState<Partial<StoreData>>(() => {
    try { return loadStore() } catch { return { operator: '__STORAGE_ERROR__' } }
  })
  const storageBlocked = restored.operator === '__STORAGE_ERROR__'
  const [view, setView] = useState<View>('pos')
  const [products, setProducts] = useState<Product[]>(restored.products ?? initialProducts)
  const [sales, setSales] = useState<Sale[]>(restored.sales ?? initialSales)
  const [notice, setNotice] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState<ProductForm>({
    barcode: '',
    name: '',
    category: 'Es krim',
    unit: 'cup',
    price: 5000,
    cost: 2500,
    stock: 10,
    reorderPoint: 5,
  })
  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [stockDelta, setStockDelta] = useState(0)
  const [stockReason, setStockReason] = useState('Stok masuk')
  const [cart, setCart] = useState<SaleItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS'>('Tunai')
  const [saleComplete, setSaleComplete] = useState<Sale | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>(restored.expenses ?? initialExpenses)
  const [operator, setOperator] = useState(storageBlocked ? 'Pengelola 1' : restored.operator ?? 'Pengelola 1')
  const [aiMessages, setAiMessages] = useState<AiMessage[]>(restored.aiMessages ?? [defaultAiWelcomeMessage])
  const [groqKey, setGroqKey] = useState<string>(() => {
    return localStorage.getItem('gc_groq_key') || ''
  })
  const [printOrders, setPrintOrders] = useState<PrintOrder[]>(restored.printOrders ?? initialPrintOrders)
  const [printSettings, setPrintSettings] = useState<PrintSettings>(restored.printSettings ?? initialSettings)
  const [showPrintForm, setShowPrintForm] = useState(false)
  const [showPrintSettings, setShowPrintSettings] = useState(false)
  const [printForm, setPrintForm] = useState<PrintForm>({ fileName: '', mode: 'Hitam putih', quantity: 1, payment: 'Lunas di muka' })
  const [printQuery, setPrintQuery] = useState('')
  const [settingsDraft, setSettingsDraft] = useState<PrintSettings>(restored.printSettings ?? initialSettings)

  useEffect(() => {
    if (storageBlocked) return
    try {
      saveStore({ products, sales, expenses, printOrders, printSettings, operator, aiMessages })
      setStorageError('')
    } catch {
      setStorageError('Penyimpanan gagal. Jangan tutup halaman. Ekspor cadangan sebelum melanjutkan.')
    }
  }, [products, sales, expenses, printOrders, printSettings, operator, aiMessages, storageBlocked])

  const exportBackup = () => {
    const content = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data: { products, sales, expenses, printOrders, printSettings, operator, aiMessages } }, null, 2)
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `globaliti-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const todaySalesTotal = useMemo(() => sales.reduce((sum, sale) => sum + sale.total, 0), [sales])
  const lowStockCount = useMemo(() => products.filter((product) => product.stock <= product.reorderPoint).length, [products])
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * item.price, 0), [cart])
  const printRevenue = useMemo(() => printOrders.filter((order) => order.status === 'Selesai' || order.payment === 'Lunas di muka').reduce((sum, order) => sum + order.total, 0), [printOrders])
  const pendingPrintCount = useMemo(() => printOrders.filter((order) => order.status !== 'Selesai').length, [printOrders])
  const unpaidPrintCount = useMemo(() => printOrders.filter((order) => order.payment === 'Bayar di akhir').length, [printOrders])

  const notify = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3200)
  }

  const filteredProducts = products.filter((product) => product.active && `${product.name} ${product.barcode}`.toLowerCase().includes(productQuery.toLowerCase()))
  const catalogProducts = products.filter((product) => `${product.name} ${product.barcode}`.toLowerCase().includes(productQuery.toLowerCase()))
  const productById = (id: string) => products.find((product) => product.id === id)
  const inventoryValue = useMemo(() => products.reduce((sum, product) => sum + product.stock * product.cost, 0), [products])

  const openAddProduct = () => {
    setEditingProduct(null)
    setProductForm({ barcode: '', name: '', category: 'Es krim', unit: 'cup', price: 5000, cost: 2500, stock: 10, reorderPoint: 5 })
    setShowProductForm(true)
  }

  const openEditProduct = (product: Product) => {
    setEditingProduct(product)
    setProductForm({ barcode: product.barcode, name: product.name, category: product.category, unit: product.unit, price: product.price, cost: product.cost, stock: product.stock, reorderPoint: product.reorderPoint })
    setShowProductForm(true)
  }

  const updateProductForm = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setProductForm((current) => ({ ...current, [name]: ['price', 'cost', 'stock', 'reorderPoint'].includes(name) ? Number(value) : value }))
  }

  const submitProduct = (event: FormEvent) => {
    event.preventDefault()
    const duplicate = products.some((product) => product.barcode === productForm.barcode && (!editingProduct || product.id !== editingProduct.id))
    if (duplicate) {
      notify('Barcode sudah digunakan produk lain')
      return
    }
    if (!productForm.name.trim() || !productForm.barcode.trim()) {
      notify('Nama produk dan barcode wajib diisi')
      return
    }
    if (editingProduct) {
      setProducts((current) => current.map((product) => product.id === editingProduct.id ? { ...product, ...productForm, name: productForm.name.trim() } : product))
      notify('Produk diperbarui')
    } else {
      const newProduct: Product = { id: `p${Date.now()}`, ...productForm, name: productForm.name.trim(), active: true }
      setProducts((current) => [newProduct, ...current])
      notify('Produk baru ditambahkan')
    }
    setShowProductForm(false)
  }

  const toggleProduct = (product: Product) => {
    setProducts((current) => current.map((item) => item.id === product.id ? { ...item, active: !item.active } : item))
    notify(product.active ? `${product.name} dinonaktifkan` : `${product.name} diaktifkan`)
  }

  const openStockAdjustment = (product: Product) => {
    setStockProduct(product)
    setStockDelta(0)
    setStockReason('Stok masuk')
  }

  const submitStockAdjustment = (event: FormEvent) => {
    event.preventDefault()
    if (!stockProduct || stockDelta === 0) return
    const nextStock = stockProduct.stock + stockDelta
    if (nextStock < 0) {
      notify('Stok akhir tidak boleh negatif')
      return
    }
    setProducts((current) => current.map((product) => product.id === stockProduct.id ? { ...product, stock: nextStock } : product))
    notify(`Stok ${stockProduct.name} diperbarui menjadi ${nextStock} ${stockProduct.unit}`)
    setStockProduct(null)
  }


  const addToCart = (product: Product) => {
    const inCart = cart.find((item) => item.productId === product.id)
    const currentQuantity = inCart?.quantity ?? 0
    if (currentQuantity + 1 > product.stock) {
      notify(`Stok ${product.name} tidak mencukupi`)
      return
    }
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.productId === product.id)
      if (existing) {
        return currentCart.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...currentCart, { productId: product.id, quantity: 1, price: product.price }]
    })
  }

  const handleBarcode = (event: FormEvent) => {
    event.preventDefault()
    const scanned = barcodeInput.trim()
    const product = products.find((item) => item.barcode === scanned && item.active)
    if (!product) {
      notify('Barcode tidak ditemukan')
      setBarcodeInput('')
      return
    }
    addToCart(product)
    setBarcodeInput('')
  }

  const updateQuantity = (productId: string, nextQuantity: number) => {
    const product = productById(productId)
    if (!product || nextQuantity < 1) return
    if (nextQuantity > product.stock) {
      notify(`Stok tersisa ${product.stock} ${product.unit}`)
      return
    }
    setCart((currentCart) => currentCart.map((item) => item.productId === productId ? { ...item, quantity: nextQuantity } : item))
  }

  const removeFromCart = (productId: string) => {
    setCart((currentCart) => currentCart.filter((item) => item.productId !== productId))
  }

  const completeSale = () => {
    if (cart.length === 0) return
    const now = new Date()
    const sale: Sale = {
      id: `TRX-${String(sales.length + 1).padStart(4, '0')}`,
      time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      operator: operator,
      items: cart,
      total: cartTotal,
      payment: paymentMethod,
    }
    setProducts((currentProducts) => currentProducts.map((product) => {
      const item = cart.find((cartItem) => cartItem.productId === product.id)
      return item ? { ...product, stock: product.stock - item.quantity } : product
    }))
    setSales((currentSales) => [sale, ...currentSales])
    setSaleComplete(sale)
    setCart([])
  }

  const startNewSale = () => setSaleComplete(null)

  const handleAiAdjustStock = (productId: string, delta: number, reason: string) => {
    setProducts((current) =>
      current.map((p) => (p.id === productId ? { ...p, stock: Math.max(0, p.stock + delta) } : p))
    )
    notify(`Stok diperbarui (${reason}): ${delta > 0 ? '+' : ''}${delta} unit`)
  }

  const handleAiRecordSale = (items: SaleItem[], payment: 'Tunai' | 'QRIS') => {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const now = new Date()
    const sale: Sale = {
      id: `TRX-${String(sales.length + 1).padStart(4, '0')}`,
      time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      operator: operator,
      items,
      total,
      payment,
    }
    setProducts((currentProducts) =>
      currentProducts.map((product) => {
        const item = items.find((cartItem) => cartItem.productId === product.id)
        return item ? { ...product, stock: Math.max(0, product.stock - item.quantity) } : product
      })
    )
    setSales((currentSales) => [sale, ...currentSales])
    notify(`Transaksi penjualan ${sale.id} berhasil dicatat (${payment}, ${formatRupiah(total)})`)
  }

  const handleAiRecordExpense = (category: 'Operasional' | 'Bahan' | 'Lainnya', description: string, amount: number) => {
    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      date: '17 Sep 2026',
      category,
      label: description,
      amount,
    }
    setExpenses((current) => [newExp, ...current])
    notify(`Beban ${description} (${formatRupiah(amount)}) berhasil dicatat`)
  }

  const handleAiCreatePrintOrder = (
    fileName: string,
    mode: 'Hitam putih' | 'Berwarna',
    quantity: number,
    payment: 'Lunas di muka' | 'Bayar di akhir'
  ) => {
    const order: PrintOrder = {
      id: `PRINT-${String(printOrders.length + 1).padStart(4, '0')}`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      fileName: fileName.trim(),
      mode,
      quantity,
      basis: printSettings.basis,
      total: quantity * (mode === 'Hitam putih' ? printSettings.bwRate : printSettings.colorRate),
      payment,
      status: 'Menunggu cetak',
    }
    setPrintOrders((current) => [order, ...current])
    notify(`Order print ${order.id} dibuat (${order.fileName})`)
  }

  const handleAiUpdatePrintOrder = (
    orderId: string,
    status?: 'Menunggu cetak' | 'Dicetak' | 'Selesai',
    payment?: 'Lunas di muka' | 'Bayar di akhir' | 'Lunas setelah cetak'
  ) => {
    setPrintOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              ...(status ? { status } : {}),
              ...(payment ? { payment } : {}),
            }
          : order
      )
    )
    notify(`Status order print ${orderId} berhasil diperbarui`)
  }

  const handleAiUpdatePrice = (productId: string, newPrice: number) => {
    setProducts((current) =>
      current.map((product) => (product.id === productId ? { ...product, price: newPrice } : product))
    )
    notify(`Harga produk berhasil diperbarui`)
  }

  const handleAddExpense = (expenseData: Omit<Expense, 'id'>) => {
    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      ...expenseData,
    }
    setExpenses((current) => [newExp, ...current])
    notify('Beban operasional berhasil dicatat')
  }

  const filteredPrintOrders = printOrders.filter((order) => `${order.fileName} ${order.id}`.toLowerCase().includes(printQuery.toLowerCase()))
  const printRateFor = (mode: 'Hitam putih' | 'Berwarna') => mode === 'Hitam putih' ? printSettings.bwRate : printSettings.colorRate
  const openNewPrintOrder = () => {
    setPrintForm({ fileName: '', mode: 'Hitam putih', quantity: 1, payment: 'Lunas di muka' })
    setShowPrintForm(true)
  }
  const updatePrintForm = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setPrintForm((current) => ({ ...current, [name]: name === 'quantity' ? Number(value) : value }))
  }
  const submitPrintOrder = (event: FormEvent) => {
    event.preventDefault()
    if (!printForm.fileName.trim() || printForm.quantity < 1) {
      notify('Nama dokumen dan jumlah halaman wajib diisi')
      return
    }
    const order: PrintOrder = {
      id: `PRINT-${String(printOrders.length + 1).padStart(4, '0')}`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      fileName: printForm.fileName.trim(),
      mode: printForm.mode,
      quantity: printForm.quantity,
      basis: printSettings.basis,
      total: printForm.quantity * printRateFor(printForm.mode),
      payment: printForm.payment,
      status: 'Menunggu cetak',
    }
    setPrintOrders((current) => [order, ...current])
    setShowPrintForm(false)
    notify('Order print dibuat')
  }
  const completePrintOrder = (id: string) => {
    setPrintOrders((current) => current.map((order) => order.id === id ? { ...order, status: 'Selesai' } : order))
    notify('Order print ditandai selesai')
  }
  const markPrintPaid = (id: string) => {
    setPrintOrders((current) => current.map((order) => order.id === id ? { ...order, payment: 'Lunas setelah cetak' } : order))
    notify('Pembayaran print dicatat lunas')
  }
  const openPrintSettings = () => {
    setSettingsDraft({ ...printSettings })
    setShowPrintSettings(true)
  }
  const updateSettingsDraft = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setSettingsDraft((current) => ({ ...current, [name]: ['bwRate', 'colorRate'].includes(name) ? Number(value) : value }))
  }
  const submitPrintSettings = (event: FormEvent) => {
    event.preventDefault()
    if (settingsDraft.bwRate <= 0 || settingsDraft.colorRate <= 0) {
      notify('Tarif print harus lebih dari nol')
      return
    }
    setPrintSettings({ ...settingsDraft })
    setShowPrintSettings(false)
    notify('Tarif print diperbarui')
  }

  if (storageBlocked) return <main className="storage-warning" role="alert"><h1>Data lokal tidak dapat dibaca</h1><p>Data asli tidak ditimpa. Jangan hapus penyimpanan browser. Hubungi pengelola untuk memulihkan cadangan.</p></main>

  const handleClearChat = () => {
    setAiMessages([defaultAiWelcomeMessage])
    notify('Riwayat percakapan asisten telah dibersihkan')
  }

  return (
    <div className="globaliti-shell">
      {storageError && <div role="alert" className="storage-warning">{storageError}</div>}
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-tile">GC</div>
          <div>
            <strong>Globaliti</strong>
            <span>Creative Center</span>
          </div>
        </div>
        <div className="sidebar-section">
          <span className="sidebar-label">Operasional</span>
          <button className={view === 'pos' ? 'nav-item active' : 'nav-item'} onClick={() => setView('pos')}>
            <ShoppingCart size={18} /> Kasir POS
          </button>
          <button className={view === 'products' ? 'nav-item active' : 'nav-item'} onClick={() => setView('products')}>
            <Cube size={18} /> Katalog & Stok
          </button>
          <button className={view === 'print' ? 'nav-item active' : 'nav-item'} onClick={() => setView('print')}>
            <Printer size={18} /> Jasa Print Word
          </button>
        </div>
        <div className="sidebar-section">
          <span className="sidebar-label">Pembukuan & Kendali</span>
          <button className={view === 'finance' ? 'nav-item active' : 'nav-item'} onClick={() => setView('finance')}>
            <FileText size={18} /> Laporan Keuangan
          </button>
          <button className={view === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => setView('settings')}>
            <GearSix size={18} /> Pengaturan
          </button>
        </div>
        <div className="sidebar-foot">
          <span className="status-dot" /> Sistem lokal aktif
        </div>
      </aside>

      <div className="app-column">
        <header className="topbar-globaliti">
          <div>
            <h1>{view === 'pos' ? 'Kasir Toko' : view === 'products' ? 'Katalog & Stok' : view === 'print' ? 'Jasa Print Word' : view === 'finance' ? 'Laporan Keuangan' : 'Pengaturan'}</h1>
          </div>
          <div className="topbar-actions">
            <div className="date-chip">17 Sep 2026</div>
            <div className="manager-chip"><span>P</span> {operator}</div>
          </div>
        </header>

        <main className="app-main pos-layout">
          {view === 'pos' && (
            <>
          <section className="pos-left">
            <div className="pos-summary-bar">
              <div className="pos-metric">
                <span className="pos-metric-label">Penjualan Hari Ini</span>
                <strong className="pos-metric-value">{formatRupiah(todaySalesTotal)}</strong>
              </div>
              <div className="pos-metric-divider" />
              <div className="pos-metric">
                <span className="pos-metric-label">Total Transaksi</span>
                <strong className="pos-metric-value">{sales.length} nota</strong>
              </div>
            </div>

            <div className="scan-panel">
              <div className="scan-heading">
                <h2>Pindai Barcode</h2>
                <Scan size={22} />
              </div>
              <form className="scan-form" onSubmit={handleBarcode}>
                <Barcode size={21} />
                <input value={barcodeInput} onChange={(event) => setBarcodeInput(event.target.value)} placeholder="Scan atau ketik barcode, lalu Enter" autoComplete="off" aria-label="Input barcode produk" />
                <button type="submit" className="scan-submit">Tambah</button>
              </form>
              <div className="scan-hint"><Scan size={14} /> Scanner USB mode keyboard akan langsung mengisi kolom ini.</div>
            </div>

            <div className="product-browser">
              <div className="browser-toolbar">
                <h2>Pilih Produk Es Krim</h2>
                <div className="product-search">
                  <MagnifyingGlass size={17} />
                  <input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Cari produk" aria-label="Cari produk" />
                </div>
              </div>
              <div className="product-grid">
                {filteredProducts.map((product) => (
                  <button key={product.id} className="product-tile" onClick={() => addToCart(product)}>
                    <div className="product-image" style={{ backgroundImage: `url(${getProductImage(product.id)})` }}>
                      <span className={`stock-chip ${product.stock <= product.reorderPoint ? 'low' : ''}`}>{product.stock} {product.unit}</span>
                    </div>
                    <div className="product-tile-copy">
                      <div><strong>{product.name}</strong><span>{product.unit}</span></div>
                      <b>{formatRupiah(product.price)}</b>
                    </div>
                    <span className="tile-add"><Plus size={17} weight="bold" /></span>
                  </button>
                ))}
              </div>
              {filteredProducts.length === 0 && <div className="inline-empty"><SearchEmpty /> Tidak ada produk yang cocok.</div>}
            </div>

            <div className="recent-sales">
              <div className="recent-heading">
                <h2>Transaksi Terakhir</h2>
                <CaretRight size={18} />
              </div>
              <div className="recent-list">
                {sales.slice(0, 3).map((sale) => (
                  <div className="recent-row" key={sale.id}>
                    <div className="recent-icon"><Receipt size={16} /></div>
                    <div><strong>{sale.id}</strong><span>{sale.time} · {sale.payment}</span></div>
                    <b>{formatRupiah(sale.total)}</b>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="cart-panel">
            <div className="cart-header">
              <h2>Keranjang Belanja</h2>
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </div>

            {cart.length === 0 ? (
              <div className="cart-empty">
                <div className="cart-empty-icon"><ShoppingBag size={25} /></div>
                <strong>Keranjang masih kosong</strong>
                <span>Scan barcode atau pilih produk untuk memulai transaksi.</span>
              </div>
            ) : (
              <div className="cart-lines">
                {cart.map((item) => {
                  const product = productById(item.productId)
                  if (!product) return null
                  return (
                    <div className="cart-line" key={item.productId}>
                      <div className="cart-line-image" style={{ backgroundImage: `url(${getProductImage(product.id)})` }} />
                      <div className="cart-line-copy">
                        <strong>{product.name}</strong>
                        <span>{formatRupiah(item.price)} / {product.unit}</span>
                        <div className="quantity-control">
                          <button onClick={() => updateQuantity(product.id, item.quantity - 1)} aria-label={`Kurangi ${product.name}`}><Minus size={14} /></button>
                          <b>{item.quantity}</b>
                          <button onClick={() => updateQuantity(product.id, item.quantity + 1)} aria-label={`Tambah ${product.name}`}><Plus size={14} /></button>
                        </div>
                      </div>
                      <div className="cart-line-total"><strong>{formatRupiah(item.price * item.quantity)}</strong><button onClick={() => removeFromCart(product.id)} aria-label={`Hapus ${product.name}`}><Trash size={16} /></button></div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="cart-summary">
              <div><span>Total transaksi</span><strong>{formatRupiah(cartTotal)}</strong></div>
              <div className="payment-label"><span>Metode pembayaran</span><span>{paymentMethod}</span></div>
              <div className="payment-options">
                <button className={paymentMethod === 'Tunai' ? 'payment-option active' : 'payment-option'} onClick={() => setPaymentMethod('Tunai')}><Wallet size={17} /> Tunai</button>
                <button className={paymentMethod === 'QRIS' ? 'payment-option active' : 'payment-option'} onClick={() => setPaymentMethod('QRIS')}><Barcode size={17} /> QRIS</button>
              </div>
              <button className="complete-sale-button" onClick={completeSale} disabled={cart.length === 0}><Check size={19} weight="bold" /> Bayar {formatRupiah(cartTotal)}</button>
              <span className="cart-footnote">Transaksi yang sudah dibayar tidak dapat dibatalkan.</span>
            </div>
          </aside>
            </>
          )}

          {view === 'products' && (
            <section className="catalog-page">
              <div className="page-intro-row">
                <div>
                  <h2>Katalog Produk & Persediaan</h2>
                  <p>Pindai produk baru, perbarui harga modal/jual, atau sesuaikan unit fisik stok toko.</p>
                </div>
                <button className="primary-action" onClick={openAddProduct}><Plus size={18} weight="bold" /> Tambah Produk</button>
              </div>

              <div className="catalog-stats">
                <div className="catalog-stat"><div><Cube size={18} /></div><span>Total Jenis Produk</span><strong>{products.length}</strong><small>Item terdaftar</small></div>
                <div className="catalog-stat"><div><Package size={18} /></div><span>Total Unit Fisik</span><strong>{products.reduce((sum, product) => sum + product.stock, 0)}</strong><small>Unit tersedia di toko</small></div>
                <div className="catalog-stat"><div><Wallet size={18} /></div><span>Nilai Persediaan</span><strong>{formatRupiah(inventoryValue)}</strong><small>Berdasarkan harga modal</small></div>
                <div className="catalog-stat"><div><Warning size={18} /></div><span>Stok Perlu Reorder</span><strong>{lowStockCount}</strong><small>Di bawah batas minimum</small></div>
              </div>

              <div className="catalog-toolbar">
                <div className="catalog-search"><MagnifyingGlass size={18} /><input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Cari nama atau barcode" aria-label="Cari produk katalog" /></div>
                <div className="catalog-filter"><span className="filter-dot" /> Menampilkan {catalogProducts.length} produk</div>
              </div>

              <div className="catalog-table" role="table" aria-label="Daftar produk">
                <div className="catalog-row catalog-head" role="row">
                  <span>Produk</span><span>Barcode</span><span>Harga</span><span>Stok</span><span>Status</span><span>Aksi</span>
                </div>
                {catalogProducts.map((product) => (
                  <div className={`catalog-row product-row ${product.active ? '' : 'inactive'}`} key={product.id} role="row">
                    <div className="catalog-product-cell">
                      <div className="catalog-product-image" style={{ backgroundImage: `url(${getProductImage(product.id)})` }} />
                      <div><strong>{product.name}</strong><span>{product.category} · {product.unit}</span></div>
                    </div>
                    <code>{product.barcode}</code>
                    <div className="catalog-price"><strong>{formatRupiah(product.price)}</strong><span>Modal {formatRupiah(product.cost)}</span></div>
                    <div className={`stock-meter ${product.stock <= product.reorderPoint ? 'low' : ''}`}><span style={{ width: `${Math.min(100, (product.stock / (product.reorderPoint * 4)) * 100)}%` }} /><strong>{product.stock} {product.unit}</strong></div>
                    <span className={`status-pill ${product.active ? 'live' : 'paused'}`}>{product.active ? 'Aktif' : 'Nonaktif'}</span>
                    <div className="row-actions">
                      <button title="Sesuaikan stok" onClick={() => openStockAdjustment(product)}><Package size={16} /></button>
                      <button title="Edit produk" onClick={() => openEditProduct(product)}><PencilSimple size={16} /></button>
                      <button title={product.active ? 'Nonaktifkan produk' : 'Aktifkan produk'} onClick={() => toggleProduct(product)}><Power size={16} /></button>
                    </div>
                  </div>
                ))}
                {catalogProducts.length === 0 && <div className="table-empty"><SearchEmpty /> Tidak ada produk yang sesuai dengan pencarian.</div>}
              </div>
            </section>
          )}

          {view === 'print' && (
            <section className="print-page">
              <div className="page-intro-row">
                <div>
                  <span className="page-kicker">JASA PRINT WORD</span>
                  <h2>Order cetak dan pembayaran</h2>
                  <p>Input dokumen Word satu per satu, pilih hitam putih atau berwarna, lalu tentukan bayar di muka atau setelah cetak.</p>
                </div>
                <button className="primary-action" onClick={openNewPrintOrder}><Plus size={18} weight="bold" /> Buat order print</button>
              </div>

              <div className="print-stats">
                <div className="print-stat"><div><Printer size={18} /></div><span>Order hari ini</span><strong>{printOrders.length}</strong><small>Dokumen Word masuk</small></div>
                <div className="print-stat"><div><Wallet size={18} /></div><span>Pendapatan print</span><strong>{formatRupiah(printRevenue)}</strong><small>Order selesai atau prabayar</small></div>
                <div className="print-stat"><div><ClockCounterClockwise size={18} /></div><span>Menunggu diproses</span><strong>{pendingPrintCount}</strong><small>Belum ditandai selesai</small></div>
                <div className="print-stat warning"><div><Warning size={18} /></div><span>Belum dibayar</span><strong>{unpaidPrintCount}</strong><small>Perlu ditagih atau dikonfirmasi</small></div>
              </div>

              <div className="print-workspace">
                <div className="print-orders-panel">
                  <div className="print-panel-header">
                    <div><span className="section-label">DAFTAR ORDER</span><h3>Dokumen masuk</h3></div>
                    <div className="print-search"><MagnifyingGlass size={17} /><input value={printQuery} onChange={(event) => setPrintQuery(event.target.value)} placeholder="Cari dokumen atau ID" aria-label="Cari order print" /></div>
                  </div>
                  <div className="print-list">
                    {filteredPrintOrders.map((order) => (
                      <div className="print-order-row" key={order.id}>
                        <div className="print-file-icon"><FileText size={20} /></div>
                        <div className="print-order-copy">
                          <strong>{order.fileName}</strong>
                          <span>{order.id} · {order.time} · {order.quantity} {order.basis.toLowerCase()}</span>
                          <div className="print-meta"><span className={`print-mode ${order.mode === 'Berwarna' ? 'color' : ''}`}>{order.mode}</span><span>{order.basis}</span></div>
                        </div>
                        <div className="print-order-total"><span>Total</span><strong>{formatRupiah(order.total)}</strong></div>
                        <div className="print-order-state">
                          <span className={`status-pill ${order.status === 'Selesai' ? 'live' : order.status === 'Dicetak' ? 'info' : 'waiting'}`}>{order.status}</span>
                          <span className={`payment-pill ${order.payment === 'Lunas di muka' || order.payment === 'Lunas setelah cetak' ? 'paid' : 'unpaid'}`}>{order.payment}</span>
                        </div>
                        <div className="print-order-actions">
                          {order.status !== 'Selesai' && <button className="small-action" onClick={() => completePrintOrder(order.id)}><CheckCircle size={15} /> Selesai</button>}
                          {order.payment === 'Bayar di akhir' && order.status === 'Selesai' && <button className="small-action" onClick={() => markPrintPaid(order.id)}><Check size={15} weight="bold" /> Tandai lunas</button>}
                        </div>
                      </div>
                    ))}
                    {filteredPrintOrders.length === 0 && <div className="print-empty"><SearchEmpty /> Tidak ada order print yang sesuai.</div>}
                  </div>
                </div>

                <aside className="print-side-panel">
                  <div className="print-rate-card">
                    <div className="rate-card-header">
                      <h3>Tarif Print Word</h3>
                      <button className="icon-button" onClick={openPrintSettings} aria-label="Atur tarif print"><GearSix size={17} /></button>
                    </div>
                    <div className="rate-line"><span>Hitam putih</span><strong>{formatRupiah(printSettings.bwRate)} <small>/ {printSettings.basis.toLowerCase()}</small></strong></div>
                    <div className="rate-line"><span>Berwarna</span><strong>{formatRupiah(printSettings.colorRate)} <small>/ {printSettings.basis.toLowerCase()}</small></strong></div>
                    <div className="rate-basis"><CheckCircle size={15} /> Dasar hitung: <strong>{printSettings.basis}</strong></div>
                    <p>Tarif dihitung per dokumen Word. Perubahan tarif dapat diatur sewaktu-waktu oleh pengelola.</p>
                  </div>
                </aside>
              </div>
            </section>
          )}

          {view === 'finance' && (
            <FinanceView
              products={products}
              sales={sales}
              printOrders={printOrders}
              expenses={expenses}
              onAddExpense={handleAddExpense}
            />
          )}

          <FloatingAssistant onClearChat={handleClearChat}>
            <AiView variant="floating"
              products={products}
              sales={sales}
              printOrders={printOrders}
              expenses={expenses}
              groqKey={groqKey}
              messages={aiMessages}
              onUpdateMessages={setAiMessages}
              onClearChat={handleClearChat}
              onAdjustStock={handleAiAdjustStock}
              onRecordSale={handleAiRecordSale}
              onRecordExpense={handleAiRecordExpense}
              onCreatePrintOrder={handleAiCreatePrintOrder}
              onUpdatePrintOrder={handleAiUpdatePrintOrder}
              onUpdatePrice={handleAiUpdatePrice}
              onAddProduct={(newProdData) => {
                const newProd: Product = { id: `p${Date.now()}`, ...newProdData, active: true }
                setProducts((curr) => [newProd, ...curr])
                notify('Produk baru ditambahkan via asisten AI')
              }}
            />
          </FloatingAssistant>

          {view === 'settings' && (
            <SettingsView
              onExportBackup={exportBackup}
              activeOperator={operator}
              onChangeOperator={(op) => {
                setOperator(op)
                notify(`Operator kasir aktif: ${op}`)
              }}
              groqKey={groqKey}
              onSaveGroqKey={(k) => {
                setGroqKey(k)
                localStorage.setItem('gc_groq_key', k)
                notify('Kunci API Groq berhasil disimpan')
              }}
            />
          )}
        </main>
      </div>

      {showPrintForm && (
        <div className="modal-backdrop-globaliti" role="presentation" onClick={() => setShowPrintForm(false)}>
          <form className="form-modal" role="dialog" aria-modal="true" onSubmit={submitPrintOrder} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><span className="page-kicker">ORDER BARU</span><h2>Print dokumen Word</h2></div><button type="button" className="icon-button" onClick={() => setShowPrintForm(false)} aria-label="Tutup"><X size={18} /></button></div>
            <label className="field full"><span>Nama file dokumen</span><div className="field-with-icon"><FileText size={17} /><input name="fileName" value={printForm.fileName} onChange={updatePrintForm} placeholder="Contoh: Makalah_Bab_1.docx" /></div><small>Gunakan satu nama file untuk satu order.</small></label>
            <label className="field"><span>Mode cetak</span><select name="mode" value={printForm.mode} onChange={updatePrintForm}><option>Hitam putih</option><option>Berwarna</option></select></label>
            <label className="field"><span>Jumlah {printSettings.basis.toLowerCase()}</span><input name="quantity" type="number" min="1" value={printForm.quantity} onChange={updatePrintForm} /></label>
            <label className="field full"><span>Waktu pembayaran</span><select name="payment" value={printForm.payment} onChange={updatePrintForm}><option>Lunas di muka</option><option>Bayar di akhir</option></select></label>
            <div className="print-total-preview"><span>Estimasi total</span><strong>{formatRupiah(printForm.quantity * printRateFor(printForm.mode))}</strong><small>{printForm.quantity} {printSettings.basis.toLowerCase()} × {formatRupiah(printRateFor(printForm.mode))}</small></div>
            <div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setShowPrintForm(false)}>Batal</button><button className="modal-primary" type="submit"><Check size={17} weight="bold" /> Simpan order</button></div>
          </form>
        </div>
      )}

      {showPrintSettings && (
        <div className="modal-backdrop-globaliti" role="presentation" onClick={() => setShowPrintSettings(false)}>
          <form className="form-modal" role="dialog" aria-modal="true" onSubmit={submitPrintSettings} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><span className="page-kicker">PENGATURAN PRINT</span><h2>Tarif dan dasar hitung</h2></div><button type="button" className="icon-button" onClick={() => setShowPrintSettings(false)} aria-label="Tutup"><X size={18} /></button></div>
            <label className="field"><span>Tarif hitam putih</span><input name="bwRate" type="number" min="1" value={settingsDraft.bwRate} onChange={updateSettingsDraft} /></label>
            <label className="field"><span>Tarif berwarna</span><input name="colorRate" type="number" min="1" value={settingsDraft.colorRate} onChange={updateSettingsDraft} /></label>
            <label className="field full"><span>Dasar hitung</span><select name="basis" value={settingsDraft.basis} onChange={updateSettingsDraft}><option>Halaman</option><option>Kertas</option></select></label>
            <div className="settings-note"><CheckCircle size={16} /> Perubahan berlaku untuk order print berikutnya.</div>
            <div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setShowPrintSettings(false)}>Batal</button><button className="modal-primary" type="submit"><Check size={17} weight="bold" /> Simpan tarif</button></div>
          </form>
        </div>
      )}

      {showProductForm && (
        <div className="modal-backdrop-globaliti" role="presentation" onClick={() => setShowProductForm(false)}>
          <form className="form-modal wide-modal" role="dialog" aria-modal="true" onSubmit={submitProduct} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><span className="page-kicker">{editingProduct ? 'EDIT PRODUK' : 'PRODUK BARU'}</span><h2>{editingProduct ? 'Perbarui produk' : 'Tambah produk'}</h2></div>
              <button type="button" className="icon-button" onClick={() => setShowProductForm(false)} aria-label="Tutup"><X size={18} /></button>
            </div>
            <div className="form-grid">
              <label className="field full"><span>Barcode produk</span><div className="field-with-icon"><Scan size={17} /><input name="barcode" value={productForm.barcode} onChange={updateProductForm} placeholder="Scan barcode di sini" /></div><small>Wajib diisi dan harus unik.</small></label>
              <label className="field full"><span>Nama produk</span><input name="name" value={productForm.name} onChange={updateProductForm} placeholder="Contoh: Matcha Cup" /></label>
              <label className="field"><span>Kategori</span><select name="category" value={productForm.category} onChange={updateProductForm}><option>Es krim</option><option>Minuman</option><option>Snack</option></select></label>
              <label className="field"><span>Unit</span><input name="unit" value={productForm.unit} onChange={updateProductForm} placeholder="cup" /></label>
              <label className="field"><span>Harga jual</span><input name="price" type="number" min="0" value={productForm.price} onChange={updateProductForm} /></label>
              <label className="field"><span>Harga modal</span><input name="cost" type="number" min="0" value={productForm.cost} onChange={updateProductForm} /></label>
              <label className="field"><span>Stok awal</span><input name="stock" type="number" min="0" value={productForm.stock} onChange={updateProductForm} /></label>
              <label className="field"><span>Batas stok rendah</span><input name="reorderPoint" type="number" min="0" value={productForm.reorderPoint} onChange={updateProductForm} /></label>
            </div>
            <div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setShowProductForm(false)}>Batal</button><button className="modal-primary" type="submit"><Check size={17} weight="bold" /> Simpan produk</button></div>
          </form>
        </div>
      )}

      {stockProduct && (
        <div className="modal-backdrop-globaliti" role="presentation" onClick={() => setStockProduct(null)}>
          <form className="form-modal" role="dialog" aria-modal="true" onSubmit={submitStockAdjustment} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><span className="page-kicker">PENYESUAIAN STOK</span><h2>{stockProduct.name}</h2></div><button type="button" className="icon-button" onClick={() => setStockProduct(null)} aria-label="Tutup"><X size={18} /></button></div>
            <div className="stock-preview"><span>Stok saat ini</span><strong>{stockProduct.stock} {stockProduct.unit}</strong></div>
            <label className="field"><span>Perubahan stok</span><input type="number" value={stockDelta} onChange={(event) => setStockDelta(Number(event.target.value))} placeholder="Contoh: 10 atau -3" /></label>
            <label className="field"><span>Alasan</span><select value={stockReason} onChange={(event) => setStockReason(event.target.value)}><option>Stok masuk</option><option>Stok keluar</option><option>Koreksi stok</option><option>Rusak atau hilang</option></select></label>
            <div className="stock-next">Stok setelah disimpan: <strong>{stockProduct.stock + stockDelta} {stockProduct.unit}</strong></div>
            <div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setStockProduct(null)}>Batal</button><button className="modal-primary" type="submit"><Check size={17} weight="bold" /> Simpan stok</button></div>
          </form>
        </div>
      )}

      {saleComplete && (
        <div className="modal-backdrop-globaliti" role="presentation" onClick={startNewSale}>
          <div className="sale-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="success-mark"><Check size={28} weight="bold" /></div>
            <span className="modal-kicker-globaliti">TRANSAKSI TERSIMPAN</span>
            <h2>Pembayaran berhasil</h2>
            <p>Stok telah diperbarui dan transaksi masuk ke riwayat hari ini.</p>
            <div className="sale-receipt">
              <div><span>ID transaksi</span><strong>{saleComplete.id}</strong></div>
              <div><span>Total dibayar</span><strong>{formatRupiah(saleComplete.total)}</strong></div>
              <div><span>Metode</span><strong>{saleComplete.payment}</strong></div>
            </div>
            <button className="modal-primary" onClick={startNewSale}>Transaksi baru <CaretRight size={17} /></button>
          </div>
        </div>
      )}

      {notice && <div className="notice-toast">{notice}</div>}
    </div>
  )
}

function SearchEmpty() {
  return <MagnifyingGlass size={19} />
}

export default GlobalitiApp

