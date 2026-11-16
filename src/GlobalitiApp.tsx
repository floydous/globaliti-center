import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  ArrowsDownUp,
  Barcode,
  CaretLeft,
  CaretLineLeft,
  CaretLineRight,
  CaretRight,
  Check,
  Cube,
  FileText,
  GearSix,
  Info,
  MagnifyingGlass,
  Minus,
  Package,
  PencilSimple,
  Printer,
  Plus,
  Power,
  Prohibit,
  Receipt,
  Scan,
  SquaresFour,
  Table as TableIcon,
  ShoppingBag,
  ShoppingCart,
  Trash,
  Wallet,
  Warning,
  X,
} from '@phosphor-icons/react'
import type { Product, Sale, SaleItem } from './types'
import './index.css'
import './globaliti-base.css'
import './globaliti-layout.css'
import './globaliti-overlays.css'
import './globaliti-catalog.css'
import './globaliti-finance.css'
import './globaliti-formal-report.css'
import './globaliti-ai.css'
import './globaliti-responsive.css'
import './globaliti-settings.css'
import FinanceView from './components/FinanceView'
import AiView from './components/AiView'
import FloatingAssistant from './components/FloatingAssistant'
import SettingsView from './components/SettingsView'
import { fetchServerStore, loadStore, migrateLocalStoreToServer, saveStore, type StoreData } from './lib/store'
import { estimateCost } from './lib/hpp'
import { fetchGroqKeyStatus } from './lib/groqKey'
import { fileToProductImage, safeProductImage } from './lib/productImage'
import { localDateKey } from './lib/dailySales'
import BarcodeImage from './components/BarcodeImage'
import BarcodePrintDialog from './components/BarcodePrintDialog'
import { generateEan13, isValidEan13 } from './lib/barcode'
import { DEFAULT_PROFILE, costRatio, type BusinessProfile } from './lib/business'
import type { AiMessage, Expense, PaymentHotkeys } from './types'

type CatalogSort = 'manual' | 'buyers' | 'units' | 'stock-high' | 'stock-low' | 'name' | 'price-high' | 'price-low' | 'active-first' | 'inactive-first'

const CATALOG_SORTS: { id: CatalogSort; label: string }[] = [
  { id: 'manual', label: 'Urutan kasir' },
  { id: 'buyers', label: 'Pembeli terbanyak' },
  { id: 'units', label: 'Terjual terbanyak' },
  { id: 'stock-high', label: 'Stok terbanyak' },
  { id: 'stock-low', label: 'Stok tersedikit' },
  { id: 'name', label: 'Nama A-Z' },
  { id: 'price-high', label: 'Harga tertinggi' },
  { id: 'price-low', label: 'Harga terendah' },
  { id: 'active-first', label: 'Produk aktif di atas' },
  { id: 'inactive-first', label: 'Produk nonaktif di atas' },
]

type View = 'pos' | 'products' | 'finance' | 'settings'
type ProductForm = Omit<Product, 'id' | 'active'>

const initialProducts: Product[] = [
  { id: 'p1', barcode: '8990000000010', name: 'Matcha Cup', price: 8000, stock: 24, reorderPoint: 8, active: true, image: '/products/histeria-matcha.webp' },
  { id: 'p2', barcode: '8990000000027', name: 'Vanilla Cone', price: 6000, stock: 18, reorderPoint: 8, active: true, image: '/products/vanilla.webp' },
  { id: 'p3', barcode: '8990000000034', name: 'Cokelat Stick', price: 5000, stock: 32, reorderPoint: 10, active: true, image: '/products/chocolate.webp' },
  { id: 'p4', barcode: '8990000000041', name: 'Strawberry Cup', price: 8000, stock: 11, reorderPoint: 8, active: true, image: '/products/strawberry-sundae.webp' },
  { id: 'p5', barcode: '8990000000058', name: 'Aice Chocolate Sundae', price: 8000, stock: 20, reorderPoint: 8, active: true, image: '/products/chocolate-sundae.webp' },
  { id: 'p6', barcode: '8990000000065', name: 'Aice Choco Meets Oats', price: 5000, stock: 25, reorderPoint: 8, active: true, image: '/products/choco-meets-oats.webp' },
  { id: 'p7', barcode: '8990000000072', name: 'Aice Coffee Crispy', price: 5000, stock: 22, reorderPoint: 8, active: true, image: '/products/cofee-crispy.webp' },
  { id: 'p8', barcode: '8990000000089', name: 'Aice Coklat 2 Colors', price: 3000, stock: 30, reorderPoint: 10, active: true, image: '/products/coklat-2-colors.webp' },
  { id: 'p9', barcode: '8990000000096', name: 'Aice Durian Asli', price: 10000, stock: 15, reorderPoint: 6, active: true, image: '/products/durian.webp' },
  { id: 'p10', barcode: '8990000000102', name: 'Aice Durian Cup', price: 12000, stock: 12, reorderPoint: 5, active: true, image: '/products/durian-cupp.webp' },
  { id: 'p11', barcode: '8990000000119', name: 'Aice Fruizzy', price: 4000, stock: 28, reorderPoint: 8, active: true, image: '/products/fruizzy.webp' },
  { id: 'p12', barcode: '8990000000126', name: 'Aice Histeria Vanilla', price: 8000, stock: 18, reorderPoint: 6, active: true, image: '/products/histeria.webp' },
  { id: 'p13', barcode: '8990000000133', name: 'Aice Klepon', price: 4000, stock: 24, reorderPoint: 8, active: true, image: '/products/klepon.webp' },
  { id: 'p14', barcode: '8990000000140', name: 'Aice Mango Stick', price: 4000, stock: 25, reorderPoint: 8, active: true, image: '/products/mango.webp' },
  { id: 'p15', barcode: '8990000000157', name: 'Aice Mango Hi-C', price: 4000, stock: 20, reorderPoint: 8, active: true, image: '/products/mango-hi-c-tanpa-fifa.webp' },
  { id: 'p16', barcode: '8990000000164', name: 'Aice Mango Slush Low Fat', price: 8000, stock: 16, reorderPoint: 6, active: true, image: '/products/mango-slush.webp' },
  { id: 'p17', barcode: '8990000000171', name: 'Aice Milk Melon', price: 4000, stock: 26, reorderPoint: 8, active: true, image: '/products/milk-melon-2.webp' },
  { id: 'p18', barcode: '8990000000188', name: 'Aice Milk Tea Boba', price: 6000, stock: 20, reorderPoint: 8, active: true, image: '/products/milktea-boba.webp' },
  { id: 'p19', barcode: '8990000000195', name: 'Aice Mochi Milk Tea', price: 4500, stock: 30, reorderPoint: 10, active: true, image: '/products/mochi-milk-tea.webp' },
  { id: 'p20', barcode: '8990000000201', name: 'Aice Nanas Stick', price: 3000, stock: 35, reorderPoint: 10, active: true, image: '/products/nanas.webp' },
  { id: 'p21', barcode: '8990000000218', name: 'Aice Sweet Peach', price: 4000, stock: 22, reorderPoint: 8, active: true, image: '/products/peach.webp' },
  { id: 'p22', barcode: '8990000000225', name: 'Aice Semangka', price: 3000, stock: 40, reorderPoint: 12, active: true, image: '/products/semangka-kemasan.webp' },
  { id: 'p23', barcode: '8990000000232', name: 'Aice Sesame Choco Crispy', price: 5000, stock: 18, reorderPoint: 6, active: true, image: '/products/sesame-choco-crispy.webp' },
  { id: 'p24', barcode: '8990000000249', name: 'Aice Shine Muscat', price: 4000, stock: 25, reorderPoint: 8, active: true, image: '/products/shine-muscat.png' },
  { id: 'p25', barcode: '8990000000256', name: 'Aice Jagung Sweet Corn', price: 4000, stock: 35, reorderPoint: 10, active: true, image: '/products/sweetcorn.webp' },
  { id: 'p26', barcode: '8990000000263', name: 'Aice Taro Crispy', price: 5000, stock: 20, reorderPoint: 8, active: true, image: '/products/taro-crispy-3.webp' },
  { id: 'p27', barcode: '8990000000270', name: 'Aice Vanilla Chocolate Cup', price: 7000, stock: 18, reorderPoint: 6, active: true, image: '/products/vanilla-chocolate-cup.webp' },
  { id: 'p28', barcode: '8990000000287', name: 'Aice Crispy Balls', price: 6000, stock: 24, reorderPoint: 8, active: true, image: '/products/aice-crispy-balls.webp' },
  { id: 'p29', barcode: '8990000000294', name: 'Aice Durian Crispy', price: 10000, stock: 15, reorderPoint: 6, active: true, image: '/products/aice-durian.webp' },
  { id: 'p30', barcode: '8990000000300', name: 'Aice Jeruk Stick', price: 3000, stock: 30, reorderPoint: 10, active: true, image: '/products/aice-jeruk.webp' },
  { id: 'p31', barcode: '8990000000317', name: 'Aice Miki-Miki', price: 3000, stock: 35, reorderPoint: 10, active: true, image: '/products/aice-miki-miki.webp' },
  { id: 'p32', barcode: '8990000000324', name: 'Aice Susu Segar Milk', price: 3000, stock: 28, reorderPoint: 10, active: true, image: '/products/aice-milk.webp' },
  { id: 'p33', barcode: '8990000000331', name: 'Aice Mung Bean (Kacang Hijau)', price: 4000, stock: 25, reorderPoint: 8, active: true, image: '/products/aice-moong-bean.webp' },
  { id: 'p34', barcode: '8990000000348', name: 'Aice Banana Crispy', price: 5000, stock: 22, reorderPoint: 8, active: true, image: '/products/banana.webp' },
  { id: 'p35', barcode: '8990000000355', name: 'Aice Blueberry Cookies', price: 5000, stock: 20, reorderPoint: 8, active: true, image: '/products/blueberry-cookies.webp' },
  { id: 'p36', barcode: '8990000000362', name: 'Aice Choco Crispy Stick', price: 5000, stock: 25, reorderPoint: 8, active: true, image: '/products/choco-crispy.webp' },
]

const initialSales: Sale[] = []
const initialExpenses: Expense[] = []

const productImages: Record<string, string> = {
  p1: '/products/histeria-matcha.webp',
  p2: '/products/vanilla.webp',
  p3: '/products/chocolate.webp',
  p4: '/products/strawberry-sundae.webp',
  p5: '/products/chocolate-sundae.webp',
  p6: '/products/choco-meets-oats.webp',
  p7: '/products/cofee-crispy.webp',
  p8: '/products/coklat-2-colors.webp',
  p9: '/products/durian.webp',
  p10: '/products/durian-cupp.webp',
  p11: '/products/fruizzy.webp',
  p12: '/products/histeria.webp',
  p13: '/products/klepon.webp',
  p14: '/products/mango.webp',
  p15: '/products/mango-hi-c-tanpa-fifa.webp',
  p16: '/products/mango-slush.webp',
  p17: '/products/milk-melon-2.webp',
  p18: '/products/milktea-boba.webp',
  p19: '/products/mochi-milk-tea.webp',
  p20: '/products/nanas.webp',
  p21: '/products/peach.webp',
  p22: '/products/semangka-kemasan.webp',
  p23: '/products/sesame-choco-crispy.webp',
  p24: '/products/shine-muscat.png',
  p25: '/products/sweetcorn.webp',
  p26: '/products/taro-crispy-3.webp',
  p27: '/products/vanilla-chocolate-cup.webp',
  p28: '/products/aice-crispy-balls.webp',
  p29: '/products/aice-durian.webp',
  p30: '/products/aice-jeruk.webp',
  p31: '/products/aice-miki-miki.webp',
  p32: '/products/aice-milk.webp',
  p33: '/products/aice-moong-bean.webp',
  p34: '/products/banana.webp',
  p35: '/products/blueberry-cookies.webp',
  p36: '/products/choco-crispy.webp',
}

const getProductImage = (productOrId: string | Product | undefined) => {
  if (!productOrId) return '/products/default-icecream.svg'
  if (typeof productOrId === 'object') {
    return safeProductImage(productOrId.image) ?? (productImages[productOrId.id] || '/products/default-icecream.svg')
  }
  return productImages[productOrId] || '/products/default-icecream.svg'
}

const nextSaleId = (sales: Sale[]) =>
  `TRX-${String(sales.reduce((max, sale) => Math.max(max, Number(sale.id.replace(/\D/g, '')) || 0), 0) + 1).padStart(4, '0')}`

// Batas wajar untuk angka yang datang dari asisten AI; keluaran model tidak dipercaya begitu saja.
const MAX_AMOUNT = 1_000_000_000
const isAmount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_AMOUNT
const HOTKEY_PATTERN = /^(F([1-9]|1[0-2])|[A-Za-z0-9])$/

const formatRupiah = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

const defaultPaymentHotkeys: PaymentHotkeys = { tunai: '1', qris: '2' }

const defaultAiWelcomeMessage: AiMessage = {
  id: 'msg-welcome',
  role: 'assistant',
  text: 'Halo! Saya Asisten Globaliti. Ada yang bisa saya bantu untuk cek stok es krim atau operasional toko hari ini? Anda bisa langsung bertanya atau meminta bantuan dengan bahasa santai sehari-hari.',
  time: '08:00',
}

function GlobalitiApp() {
  const [storageError, setStorageError] = useState('')
  const [restored] = useState<{ data: Partial<StoreData>; failed: boolean }>(() => {
    try { return { data: loadStore(), failed: false } } catch { return { data: {}, failed: true } }
  })
  const storageBlocked = restored.failed
  const [view, setView] = useState<View>('pos')
  const [products, setProducts] = useState<Product[]>(() => {
    if (restored.data.products) {
      const seedMap = new Map(initialProducts.map((p) => [p.id, p]))
      const merged = restored.data.products.map((p) => {
        const seed = seedMap.get(p.id)
        return seed ? { ...seed, ...p, image: p.image || seed.image } : p
      })
      const restoredIds = new Set(restored.data.products.map((p) => p.id))
      const deleted = new Set(restored.data.deletedProductIds ?? [])
      initialProducts.forEach((p) => {
        if (!restoredIds.has(p.id) && !deleted.has(p.id)) merged.push(p)
      })
      return merged
    }
    return initialProducts
  })
  const [deletedProductIds, setDeletedProductIds] = useState<string[]>(restored.data.deletedProductIds ?? [])
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [confirmResetAllStock, setConfirmResetAllStock] = useState(false)
  const [confirmResetFinance, setConfirmResetFinance] = useState(false)
  const [showBarcodePrint, setShowBarcodePrint] = useState(false)
  const [showBarcodePreview, setShowBarcodePreview] = useState(false)
  const [sales, setSales] = useState<Sale[]>(restored.data.sales ?? initialSales)
  const [notice, setNotice] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const barcodeInputRef = useRef<HTMLInputElement | null>(null)
  const productSearchRef = useRef<HTMLInputElement | null>(null)
  // Menyimpan completeSale terbaru supaya handler keyboard tidak perlu didaftarkan ulang tiap render
  const completeSaleRef = useRef<() => boolean>(() => false)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [productQuery, setProductQuery] = useState('')
  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogSort, setCatalogSort] = useState<CatalogSort>(() => {
    try {
      const saved = localStorage.getItem('globaliti_catalog_sort')
      if (saved) return saved as CatalogSort
    } catch {}
    return 'manual'
  })
  const [catalogMode, setCatalogMode] = useState<'cards' | 'table'>(() => {
    try {
      const saved = localStorage.getItem('globaliti_catalog_mode')
      if (saved === 'cards' || saved === 'table') return saved
    } catch {}
    return 'cards'
  })
  const [resetFinanceRestoreStock, setResetFinanceRestoreStock] = useState(true)
  const [zoomFactor, setZoomFactor] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('globaliti_zoom_factor')
      if (saved) {
        const parsed = parseFloat(saved)
        if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.0) {
          return Math.round(parsed * 100) / 100
        }
      }
    } catch {}
    return 1.0
  })
  const [profile, setProfile] = useState<BusinessProfile>(restored.data.profile ?? DEFAULT_PROFILE)
  const [reordering, setReordering] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const productGridRef = useRef<HTMLDivElement | null>(null)
  const dragPointerY = useRef<number | null>(null)
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState<ProductForm>({
    barcode: '',
    name: '',
    price: 5000,
    stock: 10,
    reorderPoint: 5,
  })
  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [stockDelta, setStockDelta] = useState(0)
  const [stockReason, setStockReason] = useState('Stok masuk')
  const [cart, setCart] = useState<SaleItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS'>('Tunai')
  const [paymentHotkeys, setPaymentHotkeys] = useState<PaymentHotkeys>(restored.data.paymentHotkeys ?? defaultPaymentHotkeys)
  const [saleComplete, setSaleComplete] = useState<Sale | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>(restored.data.expenses ?? initialExpenses)
  const [aiMessages, setAiMessages] = useState<AiMessage[]>(restored.data.aiMessages ?? [defaultAiWelcomeMessage])
  const [groqEnabled, setGroqEnabled] = useState(false)
  useEffect(() => {
    fetchGroqKeyStatus().then((status) => setGroqEnabled(status.configured))
  }, [])

  // Terapkan skala zoom aplikasi dan simpan ke localStorage
  useEffect(() => {
    try {
      ;(document.documentElement.style as any).zoom = String(zoomFactor)
      localStorage.setItem('globaliti_zoom_factor', String(zoomFactor))
    } catch {}
  }, [zoomFactor])

  // Listener pintasan keyboard dan scroll mouse untuk zoom in/out
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+' || e.code === 'NumpadAdd' || e.code === 'Equal') {
          e.preventDefault()
          setZoomFactor((prev) => Math.min(2.0, Math.round((prev + 0.05) * 100) / 100))
        } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract' || e.code === 'Minus') {
          e.preventDefault()
          setZoomFactor((prev) => Math.max(0.5, Math.round((prev - 0.05) * 100) / 100))
        } else if (e.key === '0' || e.code === 'Numpad0' || e.code === 'Digit0') {
          e.preventDefault()
          setZoomFactor(1.0)
        }
      }
    }

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        const delta = e.deltaY < 0 ? 0.05 : -0.05
        setZoomFactor((prev) => Math.min(2.0, Math.max(0.5, Math.round((prev + delta) * 100) / 100)))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('wheel', handleWheel)
    }
  }, [])

  const handleSetCatalogSort = (newSort: CatalogSort) => {
    setCatalogSort(newSort)
    try {
      localStorage.setItem('globaliti_catalog_sort', newSort)
    } catch {}
  }

  const handleSetCatalogMode = (newMode: 'cards' | 'table') => {
    setCatalogMode(newMode)
    try {
      localStorage.setItem('globaliti_catalog_mode', newMode)
    } catch {}
  }

  const localDataRef = useRef({ products, sales, expenses, aiMessages, paymentHotkeys, profile, deletedProductIds })
  localDataRef.current = { products, sales, expenses, aiMessages, paymentHotkeys, profile, deletedProductIds }

  useEffect(() => {
    if (storageBlocked) return
    if (typeof navigator !== 'undefined' && navigator.webdriver) return

    fetchServerStore()
      .then((res) => {
        if (!res.ok) return
        const hasRealLocalData = Boolean(
          (restored.data.sales && restored.data.sales.some((s) => !s.sample)) ||
          (restored.data.expenses && restored.data.expenses.some((e) => !e.sample)) ||
          (restored.data.deletedProductIds && restored.data.deletedProductIds.length > 0)
        )
        if (res.empty || (res.isDefaultSeed && hasRealLocalData)) {
          migrateLocalStoreToServer(localDataRef.current).catch(() => {})
          return
        }
        if (res.data) {
          // Pulihkan seluruh data dari database SQLite server sebagai sumber kebenaran utama
          if (res.data.products && res.data.products.length > 0) setProducts(res.data.products)
          if (res.data.sales) setSales(res.data.sales)
          if (res.data.expenses) setExpenses(res.data.expenses)
          if (res.data.profile) setProfile(res.data.profile)
          if (res.data.paymentHotkeys) setPaymentHotkeys(res.data.paymentHotkeys)
          if (res.data.deletedProductIds) setDeletedProductIds(res.data.deletedProductIds)
          if (res.data.aiMessages && res.data.aiMessages.length > 0) setAiMessages(res.data.aiMessages)
        }
      })
      .catch(() => {})
  }, [storageBlocked, restored.data])

  useEffect(() => {
    if (storageBlocked) return
    try {
      saveStore({ products, sales, expenses, aiMessages, paymentHotkeys, profile, deletedProductIds })
      setStorageError('')
    } catch {
      setStorageError('Penyimpanan gagal. Jangan tutup halaman. Ekspor cadangan sebelum melanjutkan.')
    }
  }, [products, sales, expenses, aiMessages, paymentHotkeys, profile, deletedProductIds, storageBlocked])

  useEffect(() => {
    if (view !== 'pos') return

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika tombol modifier aktif (Ctrl, Alt, Meta/Cmd)
      if (e.ctrlKey || e.altKey || e.metaKey) return

      const targetEl = e.target as HTMLElement | null
      const activeEl = document.activeElement as HTMLElement | null

      // PENTING: Jangan pernah mencegat atau mengalihkan keystroke jika pengguna sedang
      // berada di dalam panel Asisten AI (.assistant-panel, .ai-page, form ai), atau modal dialog apa pun
      const isInsideAssistantOrDialog =
        Boolean(targetEl?.closest?.('.assistant-panel, #assistant-panel, .ai-page, .ai-floating, .ai-input-form, .modal-backdrop-globaliti, .modal-backdrop, [role="dialog"]')) ||
        Boolean(activeEl?.closest?.('.assistant-panel, #assistant-panel, .ai-page, .ai-floating, .ai-input-form, .modal-backdrop-globaliti, .modal-backdrop, [role="dialog"]'))

      if (isInsideAssistantOrDialog) {
        return
      }

      const inputEl = barcodeInputRef.current
      const isInputFocused = !!activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable
      )

      // Prioritas 1: Pintasan Hotkey Pembayaran Kasir (default: "1" Tunai, "2" QRIS)
      // PENTING: Hotkey HANYA boleh aktif jika pengguna TIDAK sedang fokus pada kotak input apa pun
      if (!isInputFocused) {
        const pressed = e.key.toUpperCase()
        const tunaiKey = (paymentHotkeys.tunai || '1').toUpperCase()
        const qrisKey = (paymentHotkeys.qris || '2').toUpperCase()

        if (pressed === tunaiKey) {
          e.preventDefault()
          setPaymentMethod('Tunai')
          return
        }
        if (pressed === qrisKey) {
          e.preventDefault()
          setPaymentMethod('QRIS')
          return
        }
      }

      // "/" memfokuskan kolom cari produk (seperti pintasan cari di banyak aplikasi web)
      if (e.key === '/' && !isInputFocused) {
        e.preventDefault()
        productSearchRef.current?.focus()
        return
      }

      // Prioritas 2: Arahkan segala input angka 0-9 ke barcode input box
      if (e.key >= '0' && e.key <= '9') {
        if (!inputEl) return

        if (document.activeElement !== inputEl) {
          e.preventDefault()
          inputEl.focus()
          const len = inputEl.value.length
          inputEl.setSelectionRange(len, len)
          setBarcodeInput((prev) => prev + e.key)
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [view, paymentHotkeys, barcodeInput])

  // Enter selalu berarti "Bayar", walau fokus ada di tombol lain (fase capture mencegah tombol itu
  // ikut terklik). Alurnya: Enter membuka konfirmasi, Enter lagi membayar, Enter lagi menutup struk.
  // Kolom teks tetap memakai Enter sendiri (input barcode menambah produk). Enter yang ditahan diabaikan
  // supaya tidak melewati konfirmasi dan struk.
  useEffect(() => {
    const onEnter = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return
      if (saleComplete) {
        e.preventDefault()
        setSaleComplete(null)
        return
      }
      if (confirmingPayment) {
        e.preventDefault()
        confirmPayment()
        return
      }
      if (view !== 'pos') return
      const target = e.target as HTMLElement | null
      if (target?.closest?.('input, textarea, [contenteditable="true"], .assistant-panel, #assistant-panel, .ai-page, .ai-floating, .ai-input-form, [role="dialog"]')) return
      if (cart.length === 0) return
      e.preventDefault()
      setConfirmingPayment(true)
    }
    window.addEventListener('keydown', onEnter, true)
    return () => window.removeEventListener('keydown', onEnter, true)
  })

  useEffect(() => {
    if (!confirmingPayment) return
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmingPayment(false)
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [confirmingPayment])

  const exportBackup = () => {
    const content = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data: { products, sales, expenses, aiMessages, profile, deletedProductIds } }, null, 2)
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `globaliti-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // "Hari ini" hanya nota bertanggal hari ini; nota lama tanpa tanggal tidak dihitung.
  const todayKey = localDateKey()
  const todaySales = sales.filter((sale) => sale.date === todayKey)
  const todaySalesTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0)
  const hasSampleData = sales.some((sale) => sale.sample) || expenses.some((expense) => expense.sample)
  const lowStockCount = useMemo(() => products.filter((product) => product.stock <= product.reorderPoint).length, [products])
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * item.price, 0), [cart])

  const notify = (message: string) => {
    setNotice(message)
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      window.setTimeout(() => setNotice(''), 1000)
    }
  }

  const filteredProducts = products.filter((product) => product.active && `${product.name} ${product.barcode}`.toLowerCase().includes(productQuery.toLowerCase()))
  // Pembeli = jumlah nota yang memuat produk; terjual = jumlah unit. Dihitung dari seluruh riwayat nota.
  const salesByProduct = useMemo(() => {
    const totals = new Map<string, { buyers: number; units: number }>()
    for (const sale of sales) {
      for (const item of sale.items) {
        const entry = totals.get(item.productId) ?? { buyers: 0, units: 0 }
        entry.units += item.quantity
        totals.set(item.productId, entry)
      }
      for (const productId of new Set(sale.items.map((item) => item.productId))) {
        const entry = totals.get(productId)
        if (entry) entry.buyers += 1
      }
    }
    return totals
  }, [sales])
  const soldOf = (id: string) => salesByProduct.get(id) ?? { buyers: 0, units: 0 }
  const catalogProducts = products
    .filter((product) => `${product.name} ${product.barcode}`.toLowerCase().includes(catalogQuery.toLowerCase()))
    .sort((a, b) => {
      switch (catalogSort) {
        case 'buyers': return soldOf(b.id).buyers - soldOf(a.id).buyers || soldOf(b.id).units - soldOf(a.id).units
        case 'units': return soldOf(b.id).units - soldOf(a.id).units || soldOf(b.id).buyers - soldOf(a.id).buyers
        case 'stock-high': return b.stock - a.stock
        case 'stock-low': return a.stock - b.stock
        case 'name': return a.name.localeCompare(b.name, 'id')
        case 'price-high': return b.price - a.price
        case 'price-low': return a.price - b.price
        case 'active-first': return Number(b.active) - Number(a.active)
        case 'inactive-first': return Number(a.active) - Number(b.active)
        default: return 0
      }
    })
  const productById = (id: string) => products.find((product) => product.id === id)

  // Urutan daftar produk adalah urutan array `products`, jadi ikut tersimpan di penyimpanan lokal.
  const moveProduct = (id: string, to: 'first' | 'last' | 'earlier' | 'later' | { onto: string }) => {
    setProducts((current) => {
      const from = current.findIndex((product) => product.id === id)
      if (from < 0) return current
      let dest: number
      if (to === 'first') dest = 0
      else if (to === 'last') dest = current.length - 1
      else if (typeof to === 'object') dest = current.findIndex((product) => product.id === to.onto)
      else {
        // Geser melewati produk aktif terdekat; produk nonaktif tidak tampil di kasir
        const step = to === 'earlier' ? -1 : 1
        dest = from + step
        while (dest >= 0 && dest < current.length && !current[dest].active) dest += step
      }
      if (dest < 0 || dest >= current.length || dest === from) return current
      const next = [...current]
      const [item] = next.splice(from, 1)
      next.splice(dest, 0, item)
      return next
    })
  }

  // Browser tidak selalu menggulir daftar saat tile diseret ke tepinya, jadi digulir manual
  // selama menyeret: makin dekat ke tepi atas/bawah, makin cepat.
  useEffect(() => {
    if (!dragId) return
    const timer = window.setInterval(() => {
      const grid = productGridRef.current
      const y = dragPointerY.current
      if (!grid || y === null) return
      const rect = grid.getBoundingClientRect()
      const zone = 72
      if (y < rect.top + zone) grid.scrollTop -= Math.min(24, Math.ceil((rect.top + zone - y) / 3))
      else if (y > rect.bottom - zone) grid.scrollTop += Math.min(24, Math.ceil((y - (rect.bottom - zone)) / 3))
    }, 16)
    return () => {
      window.clearInterval(timer)
      dragPointerY.current = null
    }
  }, [dragId])

  // Setelah dipindah, tile tetap terlihat di daftar yang bisa digulir
  const keepProductInView = (id: string) => {
    requestAnimationFrame(() => {
      const grid = productGridRef.current
      const tile = grid?.querySelector<HTMLElement>(`[data-product-id="${id}"]`)
      if (!grid || !tile) return
      const gridRect = grid.getBoundingClientRect()
      const tileRect = tile.getBoundingClientRect()
      if (tileRect.top < gridRect.top) grid.scrollTop -= gridRect.top - tileRect.top
      else if (tileRect.bottom > gridRect.bottom) grid.scrollTop += tileRect.bottom - gridRect.bottom
    })
  }

  const moveProductAndShow = (id: string, to: Parameters<typeof moveProduct>[1]) => {
    moveProduct(id, to)
    keepProductInView(id)
  }

  const toggleReordering = () => {
    setProductQuery('')
    setDragId(null)
    setDragOverId(null)
    setReordering((current) => !current)
  }
  const inventoryValue = useMemo(() => products.reduce((sum, product) => sum + product.stock * estimateCost(product.price, costRatio(profile)), 0), [products, profile])

  const productActions = (product: Product) => (
    <>
      <button
        type="button"
        className="box-btn-adjust"
        title="Sesuaikan stok"
        aria-label="Sesuaikan stok"
        onClick={() => openStockAdjustment(product)}
      >
        <Package size={16} weight="bold" />
        <span>Stok</span>
      </button>
      <button
        type="button"
        className="box-btn-edit"
        title="Edit produk"
        onClick={() => openEditProduct(product)}
      >
        <PencilSimple size={16} />
        <span>Edit</span>
      </button>
      <span className="box-btn-group">
      <button
        type="button"
        className={`box-btn-toggle ${product.active ? 'active' : 'inactive'}`}
        title={product.active ? 'Nonaktifkan produk' : 'Aktifkan produk'}
        onClick={() => toggleProduct(product)}
      >
        <Power size={16} />
      </button>
      <button
        type="button"
        className="box-btn-delete"
        title="Hapus produk dari katalog"
        aria-label={`Hapus produk ${product.name} dari katalog`}
        onClick={() => setProductToDelete(product)}
      >
        <Trash size={16} />
      </button>
      </span>
    </>
  )

  // Nota lama menyimpan id produk, jadi riwayat penjualan tetap utuh; produknya tampil sebagai "Produk dihapus".
  const deleteProduct = (product: Product) => {
    setProducts((current) => current.filter((item) => item.id !== product.id))
    setDeletedProductIds((current) => (current.includes(product.id) ? current : [...current, product.id]))
    setCart((current) => current.filter((item) => item.productId !== product.id))
    setProductToDelete(null)
    notify(`${product.name} dihapus dari katalog`)
  }

  const openAddProduct = () => {
    setEditingProduct(null)
    setProductForm({ barcode: '', name: '', price: 5000, stock: 10, reorderPoint: 5 })
    setShowProductForm(true)
  }

  const openEditProduct = (product: Product) => {
    setEditingProduct(product)
    setProductForm({ barcode: product.barcode, name: product.name, price: product.price, stock: product.stock, reorderPoint: product.reorderPoint, image: product.image, barcodeGenerated: product.barcodeGenerated })
    setShowProductForm(true)
  }

  const updateProductForm = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setProductForm((current) => ({
      ...current,
      [name]: ['price', 'stock', 'reorderPoint'].includes(name) ? Number(value) : value,
      // Barcode yang diketik atau dipindai sendiri bukan barcode buatan aplikasi
      ...(name === 'barcode' ? { barcodeGenerated: undefined } : {}),
    }))
  }

  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const chooseProductImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const image = await fileToProductImage(file)
      setProductForm((current) => ({ ...current, image }))
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Gambar tidak dapat dibaca')
    }
  }
  // Foto unggahan saja yang bisa dihapus; produk bawaan kembali ke gambar aslinya.
  const hasCustomImage = Boolean(productForm.image?.startsWith('data:'))
  const productFormImage = productForm.image || getProductImage(editingProduct?.id)

  useEffect(() => {
    if (!showBarcodePreview) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setShowBarcodePreview(false)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [showBarcodePreview])

  const generateBarcode = () =>
    setProductForm((current) => ({ ...current, barcode: generateEan13(new Set(products.map((product) => product.barcode))), barcodeGenerated: true }))

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
    notify(`Stok ${stockProduct.name} diperbarui menjadi ${nextStock}`)
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
      notify(`Stok tersisa ${product.stock}`)
      return
    }
    setCart((currentCart) => currentCart.map((item) => item.productId === productId ? { ...item, quantity: nextQuantity } : item))
  }

  const removeFromCart = (productId: string) => {
    setCart((currentCart) => currentCart.filter((item) => item.productId !== productId))
  }

  const completeSale = (): boolean => {
    if (cart.length === 0) return false
    const now = new Date()
    const sale: Sale = {
      id: nextSaleId(sales),
      date: localDateKey(now),
      time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      items: cart.map((item) => ({ ...item, stockAfter: (productById(item.productId)?.stock ?? 0) - item.quantity })),
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
    return true
  }

  const startNewSale = () => setSaleComplete(null)

  const requestPayment = () => {
    if (cart.length > 0) setConfirmingPayment(true)
  }

  const confirmPayment = () => {
    setConfirmingPayment(false)
    completeSale()
  }

  useEffect(() => {
    completeSaleRef.current = completeSale
  })

  const rejectAiAction = () => notify('Usulan asisten tidak valid dan tidak diterapkan')

  const handleAiAdjustStock = (productId: string, delta: number, reason: string) => {
    const amount = Number(delta)
    if (!productById(productId) || !Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 100000) return rejectAiAction()
    setProducts((current) =>
      current.map((p) => (p.id === productId ? { ...p, stock: Math.max(0, p.stock + amount) } : p))
    )
    notify(`Stok diperbarui (${String(reason).slice(0, 60)}): ${amount > 0 ? '+' : ''}${amount} unit`)
  }

  const handleAiRecordSale = (items: SaleItem[], payment: 'Tunai' | 'QRIS') => {
    const cleanItems = Array.isArray(items)
      ? items.map((item) => ({ productId: String(item.productId), quantity: Number(item.quantity), price: Number(item.price) }))
      : []
    const valid = cleanItems.length > 0 && cleanItems.every((item) =>
      productById(item.productId) && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 10000 && isAmount(item.price))
    if (!valid) return rejectAiAction()
    const method = payment === 'QRIS' ? 'QRIS' : 'Tunai'
    const total = cleanItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const now = new Date()
    const sale: Sale = {
      id: nextSaleId(sales),
      date: localDateKey(now),
      time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      items: cleanItems.map((item) => ({ ...item, stockAfter: Math.max(0, (productById(item.productId)?.stock ?? 0) - item.quantity) })),
      total,
      payment: method,
    }
    setProducts((currentProducts) =>
      currentProducts.map((product) => {
        const item = cleanItems.find((cartItem) => cartItem.productId === product.id)
        return item ? { ...product, stock: Math.max(0, product.stock - item.quantity) } : product
      })
    )
    setSales((currentSales) => [sale, ...currentSales])
    notify(`Transaksi penjualan ${sale.id} berhasil dicatat (${method}, ${formatRupiah(total)})`)
  }

  const handleAiRecordExpense = (description: string, amount: number) => {
    const label = String(description ?? '').trim().slice(0, 120)
    const value = Number(amount)
    if (!label || !isAmount(value) || value === 0) return rejectAiAction()
    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      date: localDateKey(),
      label,
      amount: value,
    }
    setExpenses((current) => [newExp, ...current])
    notify(`Beban ${label} (${formatRupiah(value)}) berhasil dicatat`)
  }

  const handleAiUpdatePrice = (productId: string, newPrice: number) => {
    const price = Number(newPrice)
    if (!productById(productId) || !isAmount(price)) return rejectAiAction()
    setProducts((current) =>
      current.map((product) => (product.id === productId ? { ...product, price } : product))
    )
    notify(`Harga produk berhasil diperbarui`)
  }

  const handleAiAddProduct = (data: Omit<Product, 'id' | 'active'>) => {
    const name = String(data?.name ?? '').trim().slice(0, 100)
    const barcode = String(data?.barcode ?? '').trim().slice(0, 40)
    const price = Number(data?.price)
    const stock = Number(data?.stock)
    const reorderPoint = Number(data?.reorderPoint)
    if (!name || !barcode || !isAmount(price) || !isAmount(stock) || !isAmount(reorderPoint)) return rejectAiAction()
    if (products.some((product) => product.barcode === barcode)) return notify('Barcode sudah digunakan produk lain')
    // Gambar tidak pernah diterima dari asisten
    const newProd: Product = { id: `p${Date.now()}`, barcode, name, price, stock: Math.floor(stock), reorderPoint: Math.floor(reorderPoint), active: true }
    setProducts((curr) => [newProd, ...curr])
    notify('Produk baru ditambahkan via asisten AI')
  }

  const handleAiUpdateHotkeys = (newKeys: PaymentHotkeys) => {
    const tunai = String(newKeys?.tunai ?? '').trim()
    const qris = String(newKeys?.qris ?? '').trim()
    if (!HOTKEY_PATTERN.test(tunai) || !HOTKEY_PATTERN.test(qris) || tunai.toUpperCase() === qris.toUpperCase()) return rejectAiAction()
    setPaymentHotkeys({ tunai, qris })
    notify(`Hotkey pembayaran berhasil diubah: Tunai [${tunai}], QRIS [${qris}]`)
  }

  const clearSampleData = () => {
    setSales((current) => current.filter((sale) => !sale.sample))
    setExpenses((current) => current.filter((expense) => !expense.sample))
    notify('Data contoh dihapus. Pembukuan kini hanya berisi catatan Anda')
  }

  const handleAddExpense = (expenseData: Omit<Expense, 'id'>) => {
    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      ...expenseData,
    }
    setExpenses((current) => [newExp, ...current])
    notify('Beban operasional berhasil dicatat')
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
        <div className="brand-lockup brand-card">
          <div className="brand-tile">
            <img src="/globaliti-creative-center-icon.png" alt="Globaliti Creative Center" width={38} height={38} />
          </div>
          <div className="brand-info">
            <span className="brand-school">SMKS TI BALI GLOBAL</span>
            <div className="brand-heading">
              <strong>Globaliti</strong>
              <span className="brand-badge">POS</span>
            </div>
            <span className="brand-sub">Creative Center</span>
          </div>
        </div>
        <nav className="sidebar-nav-container" aria-label="Navigasi Utama">
          <div className="sidebar-section">
            <span className="sidebar-label">Operasional</span>
            <button className={view === 'pos' ? 'nav-item active' : 'nav-item'} onClick={() => setView('pos')}>
              <span className="nav-indicator" aria-hidden="true" />
              <ShoppingCart size={18} />
              <span className="nav-label-text">Kasir POS</span>
            </button>
            <button className={view === 'products' ? 'nav-item active' : 'nav-item'} onClick={() => setView('products')}>
              <span className="nav-indicator" aria-hidden="true" />
              <Cube size={18} />
              <span className="nav-label-text">Katalog & Stok</span>
            </button>
          </div>
          <div className="sidebar-section">
            <span className="sidebar-label">Pembukuan & Kendali</span>
            <button className={view === 'finance' ? 'nav-item active' : 'nav-item'} onClick={() => setView('finance')}>
              <span className="nav-indicator" aria-hidden="true" />
              <FileText size={18} />
              <span className="nav-label-text">Laporan Keuangan</span>
            </button>
            <button className={view === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => setView('settings')}>
              <span className="nav-indicator" aria-hidden="true" />
              <GearSix size={18} />
              <span className="nav-label-text">Pengaturan</span>
            </button>
          </div>
        </nav>
      </aside>

      <div className="app-column">
        <header className="topbar-globaliti">
          <div>
            <h1>{view === 'pos' ? 'Kasir Toko' : view === 'products' ? 'Katalog & Stok' : view === 'finance' ? 'Laporan Keuangan' : 'Pengaturan'}</h1>
          </div>
          <div className="topbar-actions">
            <div className="date-chip">{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <FloatingAssistant onClearChat={handleClearChat} enabled={groqEnabled}>
              <AiView variant="floating"
                profile={profile}
                products={products}
                sales={sales}
                expenses={expenses}
                groqEnabled={groqEnabled}
                messages={aiMessages}
                paymentHotkeys={paymentHotkeys}
                onUpdatePaymentHotkeys={handleAiUpdateHotkeys}
                onUpdateMessages={setAiMessages}
                onClearChat={handleClearChat}
                onAdjustStock={handleAiAdjustStock}
                onRecordSale={handleAiRecordSale}
                onRecordExpense={handleAiRecordExpense}
                onUpdatePrice={handleAiUpdatePrice}
                onAddProduct={handleAiAddProduct}
              />
            </FloatingAssistant>
          </div>
        </header>

        <main className={`app-main ${view === 'pos' ? 'pos-layout' : 'app-main-full'}`}>

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
                <strong className="pos-metric-value">{todaySales.length} nota</strong>
              </div>
            </div>

            <div className="scan-panel">
              <div className="scan-heading">
                <h2>Pindai Barcode</h2>
                <Scan size={22} />
              </div>
              <form className="scan-form" onSubmit={handleBarcode}>
                <Barcode size={21} />
                <input ref={barcodeInputRef} value={barcodeInput} onChange={(event) => setBarcodeInput(event.target.value)} placeholder="Scan atau ketik barcode, lalu Enter" autoComplete="off" aria-label="Input barcode produk" />
                <button type="submit" className="scan-submit">Tambah</button>
              </form>
              <div className="scan-hint"><Scan size={14} /> Scanner USB mode keyboard akan langsung mengisi kolom ini.</div>
            </div>

            <div className="product-browser">
              <div className="browser-toolbar">
                <h2>Pilih Produk Es Krim</h2>
                <div className="browser-toolbar-tools">
                  <div className="product-search">
                    <MagnifyingGlass size={17} />
                    <input ref={productSearchRef} value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Cari produk" aria-label="Cari produk" disabled={reordering} />
                    <kbd className="hotkey-badge" aria-hidden="true">/</kbd>
                  </div>
                  <button type="button" className={reordering ? 'reorder-toggle active' : 'reorder-toggle'} aria-pressed={reordering} onClick={toggleReordering}>
                    {reordering ? <Check size={16} weight="bold" /> : <ArrowsDownUp size={16} />}
                    {reordering ? 'Selesai' : 'Atur urutan'}
                  </button>
                </div>
              </div>
              {reordering && <p className="reorder-hint">Seret produk atau pakai tombol panah. Produk yang sulit dipindai taruh di bagian atas.</p>}
              <div
                className={reordering ? 'product-grid reordering' : 'product-grid'}
                ref={productGridRef}
                onDragOver={(event) => { if (!dragId) return; event.preventDefault(); dragPointerY.current = event.clientY }}
              >
                {filteredProducts.map((product) => reordering ? (
                  <div
                    key={product.id}
                    data-product-id={product.id}
                    className={`product-tile reordering${dragId === product.id ? ' dragging' : ''}${dragOverId === product.id && dragId !== product.id ? ' drag-over' : ''}`}
                    draggable
                    onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; setDragId(product.id) }}
                    onDragOver={(event) => { event.preventDefault(); setDragOverId(product.id) }}
                    onDrop={(event) => { event.preventDefault(); if (dragId && dragId !== product.id) moveProductAndShow(dragId, { onto: product.id }); setDragId(null); setDragOverId(null) }}
                    onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                  >
                    <div className="product-image" style={{ backgroundImage: `url(${getProductImage(product)})` }}>
                      <span className={`stock-chip ${product.stock <= product.reorderPoint ? 'low' : ''}`}>{product.stock}</span>
                    </div>
                    <div className="product-tile-copy">
                      <div><strong>{product.name}</strong></div>
                      <b>{formatRupiah(product.price)}</b>
                    </div>
                    <div className="reorder-controls">
                      <button type="button" onClick={() => moveProductAndShow(product.id, 'first')} aria-label={`Pindahkan ${product.name} ke paling awal`} title="Ke paling awal"><CaretLineLeft size={16} /></button>
                      <button type="button" onClick={() => moveProductAndShow(product.id, 'earlier')} aria-label={`Geser ${product.name} maju`} title="Geser maju"><CaretLeft size={16} /></button>
                      <button type="button" onClick={() => moveProductAndShow(product.id, 'later')} aria-label={`Geser ${product.name} mundur`} title="Geser mundur"><CaretRight size={16} /></button>
                      <button type="button" onClick={() => moveProductAndShow(product.id, 'last')} aria-label={`Pindahkan ${product.name} ke paling akhir`} title="Ke paling akhir"><CaretLineRight size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <button key={product.id} className="product-tile" onClick={() => addToCart(product)}>
                    <div className="product-image" style={{ backgroundImage: `url(${getProductImage(product)})` }}>
                      <span className={`stock-chip ${product.stock <= product.reorderPoint ? 'low' : ''}`}>{product.stock}</span>
                    </div>
                    <div className="product-tile-copy">
                      <div><strong>{product.name}</strong></div>
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
                <span className="recent-count">{sales.length} nota</span>
              </div>
              <div className="recent-list">
                {sales.slice(0, 3).map((sale) => (
                  <div className="recent-row" key={sale.id}>
                    <div className="recent-icon"><Receipt size={16} /></div>
                    <div>
                      <strong>{sale.items.map((item) => {
                        const product = productById(item.productId)
                        return `${item.quantity}x ${product?.name ?? 'Produk dihapus'}`
                      }).join(', ')}</strong>
                      <span>{sale.time} · {sale.payment}</span>
                    </div>
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
                      <div className="cart-line-image" style={{ backgroundImage: `url(${getProductImage(product)})` }} />
                      <div className="cart-line-copy">
                        <strong>{product.name}</strong>
                        <span>{formatRupiah(item.price)}</span>
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
                <button
                  className={paymentMethod === 'Tunai' ? 'payment-option active' : 'payment-option'}
                  onClick={() => setPaymentMethod('Tunai')}
                  title={`Pilih metode pembayaran Tunai (Hotkey [${paymentHotkeys.tunai}])`}
                >
                  <Wallet size={17} /> Tunai <kbd className="hotkey-badge">{paymentHotkeys.tunai}</kbd>
                </button>
                <button
                  className={paymentMethod === 'QRIS' ? 'payment-option active' : 'payment-option'}
                  onClick={() => setPaymentMethod('QRIS')}
                  title={`Pilih metode pembayaran QRIS (Hotkey [${paymentHotkeys.qris}])`}
                >
                  <Barcode size={17} /> QRIS <kbd className="hotkey-badge">{paymentHotkeys.qris}</kbd>
                </button>
              </div>
              <button className="complete-sale-button" onClick={requestPayment} disabled={cart.length === 0} title="Tekan Enter untuk membayar"><Check size={19} weight="bold" /> Bayar {formatRupiah(cartTotal)} <kbd className="hotkey-badge hotkey-badge-enter">Enter</kbd></button>
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
                  <p>Pindai produk baru, perbarui harga jual, atau sesuaikan stok fisik toko.</p>
                </div>
                <div className="page-intro-actions">
                  <button type="button" className="secondary-button" onClick={() => setShowBarcodePrint(true)}><Printer size={16} /> Cetak barcode</button>
                  <button className="primary-action" onClick={openAddProduct}><Plus size={18} weight="bold" /> Tambah Produk</button>
                </div>
              </div>

              <div className="catalog-stats">
                <div className="catalog-stat"><span>Total Jenis Produk</span><strong>{products.length}</strong><small>Item terdaftar</small></div>
                <div className="catalog-stat"><span>Total Stok Fisik</span><strong>{products.reduce((sum, product) => sum + product.stock, 0)}</strong><small>Item tersedia di toko</small></div>
                <div className="catalog-stat"><span>Nilai Persediaan</span><strong>{formatRupiah(inventoryValue)}</strong><small>Estimasi harga perolehan</small></div>
                <div className={lowStockCount > 0 ? 'catalog-stat attention' : 'catalog-stat'}><span>Stok Perlu Reorder</span><strong>{lowStockCount}</strong><small>Di bawah batas minimum</small></div>
              </div>

              <div className="catalog-toolbar">
                <div className="catalog-search"><MagnifyingGlass size={18} /><input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Cari nama atau barcode" aria-label="Cari produk katalog" /></div>
                <div className="catalog-filter"><span className="filter-dot" /> Menampilkan {catalogProducts.length} produk</div>
                <select className="catalog-sort" aria-label="Urutkan produk" value={catalogSort} onChange={(event) => handleSetCatalogSort(event.target.value as CatalogSort)}>
                  {CATALOG_SORTS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
                <div className="segmented" role="group" aria-label="Tampilan katalog">
                  <button type="button" className={catalogMode === 'cards' ? 'active' : ''} aria-pressed={catalogMode === 'cards'} onClick={() => handleSetCatalogMode('cards')}><SquaresFour size={16} /> Kartu</button>
                  <button type="button" className={catalogMode === 'table' ? 'active' : ''} aria-pressed={catalogMode === 'table'} onClick={() => handleSetCatalogMode('table')}><TableIcon size={16} /> Tabel</button>
                </div>
              </div>

              {catalogMode === 'cards' && (
              <div className="catalog-boxes-grid" role="region" aria-label="Daftar produk persediaan">
                {catalogProducts.map((product) => {
                  const isLowStock = product.stock <= product.reorderPoint

                  return (
                    <article
                      className={`catalog-box-card ${product.active ? '' : 'inactive'}`}
                      key={product.id}
                    >
                      {!product.active && (
                        <div className="catalog-card-inactive-banner">
                          <Prohibit size={13} weight="bold" /> NONAKTIF (OFF KASIR)
                        </div>
                      )}
                      <div className="catalog-box-image-wrap">
                        <div
                          className="catalog-box-image"
                          style={{ backgroundImage: `url(${getProductImage(product)})` }}
                          role="img"
                          aria-label={product.name}
                        />
                        <div className="catalog-box-badges">
                          {!product.active && <span className="status-pill paused inactive-prominent-badge"><Prohibit size={11} weight="bold" /> Nonaktif</span>}
                        </div>
                      </div>

                      <div className="catalog-box-body">
                        <div className="catalog-box-title-row">
                          <h3 className="catalog-box-title">{product.name}</h3>
                          <strong className="box-price-val">{formatRupiah(product.price)}</strong>
                        </div>

                        <div className="catalog-box-meta">
                          <code className="catalog-box-barcode">{product.barcode}</code>
                        </div>

                        <div className={`catalog-box-stock ${isLowStock ? 'low' : ''}`}>
                          <div className="box-stock-header">
                            <div className="box-stock-amount">
                              <span>Stok</span>
                              <strong>{product.stock}</strong>
                            </div>
                            {isLowStock && <span className="box-stock-pill low"><Warning size={12} /> Reorder</span>}
                          </div>
                        </div>

                        <div className="catalog-box-actions">
                          {productActions(product)}
                        </div>
                      </div>
                    </article>
                  )
                })}
                {catalogProducts.length === 0 && (
                  <div className="table-empty">
                    <SearchEmpty /> Tidak ada produk yang sesuai dengan pencarian.
                  </div>
                )}
              </div>
              )}

              {catalogMode === 'table' && (
              <div className="catalog-table-wrap" role="region" aria-label="Tabel produk persediaan">
                <table className="catalog-table">
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th>Barcode</th>
                      <th className="num">Harga</th>
                      <th className="num">Stok</th>
                      <th>Status</th>
                      <th><span className="sr-only">Aksi</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogProducts.map((product) => {
                      const isLowStock = product.stock <= product.reorderPoint
                      return (
                        <tr key={product.id} className={`${product.active ? '' : 'inactive'} ${isLowStock ? 'low' : ''}`}>
                          <td>
                            <div className="catalog-table-product">
                              <div className="catalog-table-thumb" style={{ backgroundImage: `url(${getProductImage(product)})` }} role="img" aria-label={product.name} />
                              <strong>{product.name}</strong>
                            </div>
                          </td>
                          <td><code className="catalog-box-barcode">{product.barcode}</code></td>
                          <td className="num price">{formatRupiah(product.price)}</td>
                          <td className="num stock">{product.stock}</td>
                          <td>
                            {isLowStock && <span className="box-stock-pill low"><Warning size={12} /> Reorder</span>}
                            {!product.active && <span className="status-pill paused inactive-prominent-badge"><Prohibit size={12} weight="bold" /> Nonaktif</span>}
                          </td>
                          <td><div className="catalog-table-actions">{productActions(product)}</div></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {catalogProducts.length === 0 && (
                  <div className="table-empty">
                    <SearchEmpty /> Tidak ada produk yang sesuai dengan pencarian.
                  </div>
                )}
              </div>
              )}
            </section>
          )}

          {view === 'finance' && (
            <FinanceView
              products={products}
              sales={sales}
              expenses={expenses}
              profile={profile}
              hasSampleData={hasSampleData}
              onClearSampleData={clearSampleData}
              onAddExpense={handleAddExpense}
            />
          )}

          {view === 'settings' && (
            <SettingsView
              onExportBackup={exportBackup}
              profile={profile}
              productCount={products.length}
              onResetAllStock={() => setConfirmResetAllStock(true)}
              onResetFinance={() => setConfirmResetFinance(true)}
              salesCount={sales.length}
              expenseCount={expenses.length}
              zoomFactor={zoomFactor}
              onSetZoom={setZoomFactor}
              onProfileSaved={(next) => {
                setProfile(next)
                notify('Pengaturan unit usaha disimpan')
              }}
              onGroqKeySaved={(configured) => {
                setGroqEnabled(configured)
                notify(configured ? 'Kunci API Groq berhasil disimpan' : 'Kunci API Groq dihapus')
              }}
            />
          )}
        </main>
      </div>

      {showProductForm && (
        <div className="modal-backdrop-globaliti" role="presentation" onClick={() => setShowProductForm(false)}>
          <form className="form-modal wide-modal" role="dialog" aria-modal="true" onSubmit={submitProduct} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><h2>{editingProduct ? 'Perbarui produk' : 'Tambah produk'}</h2></div>
              <button type="button" className="icon-button" onClick={() => setShowProductForm(false)} aria-label="Tutup"><X size={18} /></button>
            </div>
            <div className="form-grid">
              <div className="product-form-top">
                <div className="field">
                  <span>Gambar produk</span>
                  <div className="image-field">
                    <div className="image-field-preview" role="img" aria-label="Pratinjau gambar produk" style={{ backgroundImage: `url(${productFormImage})` }} />
                    <div className="image-field-actions">
                      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={chooseProductImage} aria-label="Berkas gambar produk" />
                      <button type="button" className="secondary-button" onClick={() => imageInputRef.current?.click()}>{hasCustomImage ? 'Ganti gambar' : 'Pilih gambar'}</button>
                      {hasCustomImage && <button type="button" className="secondary-button" onClick={() => setProductForm((current) => ({ ...current, image: undefined }))}>Hapus gambar</button>}
                    </div>
                    <small>PNG, JPG, atau WebP. Diperkecil otomatis.</small>
                  </div>
                </div>
                <div className="product-form-top-fields">
                  <div className="field">
                    <label htmlFor="product-barcode"><span>Barcode produk</span></label>
                    <div className="barcode-row">
                      <div className="field-with-icon"><Scan size={17} /><input id="product-barcode" name="barcode" value={productForm.barcode} onChange={updateProductForm} placeholder="Scan barcode di sini" /></div>
                      <button type="button" className="secondary-button" onClick={generateBarcode}>Buat barcode</button>
                      <button type="button" className="secondary-button" disabled={!isValidEan13(productForm.barcode)} title={isValidEan13(productForm.barcode) ? undefined : 'Hanya kode EAN-13 yang valid yang bisa ditampilkan'} onClick={() => setShowBarcodePreview(true)}>Tampilkan</button>
                    </div>
                    <small>Wajib diisi dan harus unik. Untuk produk tanpa barcode, buat barcode lalu cetak labelnya.</small>
                  </div>
                  <label className="field"><span>Nama produk</span><input name="name" value={productForm.name} onChange={updateProductForm} placeholder="Contoh: Matcha Cup" /></label>
                </div>
              </div>
              <div className="field-row">
                <label className="field"><span>Harga jual</span><input name="price" type="number" min="0" value={productForm.price} onChange={updateProductForm} /></label>
                <label className="field"><span>Stok awal</span><input name="stock" type="number" min="0" value={productForm.stock} onChange={updateProductForm} /></label>
                <label className="field"><span>Batas stok rendah</span><input name="reorderPoint" type="number" min="0" value={productForm.reorderPoint} onChange={updateProductForm} /></label>
              </div>
            </div>
            <div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setShowProductForm(false)}>Batal</button><button className="modal-primary" type="submit"><Check size={17} weight="bold" /> Simpan produk</button></div>
          </form>
        </div>
      )}

      {showBarcodePreview && isValidEan13(productForm.barcode) && (
        <div className="modal-backdrop-globaliti barcode-preview-backdrop" role="presentation" onClick={() => setShowBarcodePreview(false)}>
          <div className="form-modal barcode-preview-modal" role="dialog" aria-modal="true" aria-label="Pratinjau barcode" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><h2>{productForm.name.trim() || 'Barcode produk'}</h2></div>
              <button type="button" className="icon-button" onClick={() => setShowBarcodePreview(false)} aria-label="Tutup pratinjau"><X size={18} /></button>
            </div>
            <BarcodeImage code={productForm.barcode} className="barcode-preview" />
          </div>
        </div>
      )}

      {showBarcodePrint && <BarcodePrintDialog products={products} onClose={() => setShowBarcodePrint(false)} />}

      {productToDelete && (
        <div className="modal-backdrop-globaliti" role="presentation" onClick={() => setProductToDelete(null)}>
          <div className="form-modal" role="dialog" aria-modal="true" aria-label={`Hapus produk ${productToDelete.name}`} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Hapus {productToDelete.name}?</h2>
                <p className="modal-sub">Produk dihapus dari katalog dan kasir beserta stoknya ({productToDelete.stock}). Riwayat penjualan tetap tersimpan dan menampilkannya sebagai "Produk dihapus". Tindakan ini tidak bisa dibatalkan. Untuk menyembunyikan sementara, pakai tombol nonaktifkan.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setProductToDelete(null)}>Batal</button>
              <button type="button" className="primary-action danger-action" onClick={() => deleteProduct(productToDelete)}>Hapus produk</button>
            </div>
          </div>
        </div>
      )}

      {stockProduct && (
        <div className="modal-backdrop-globaliti" role="presentation" onClick={() => setStockProduct(null)}>
          <form className="form-modal" role="dialog" aria-modal="true" aria-label={`Penyesuaian Stok ${stockProduct.name}`} onSubmit={submitStockAdjustment} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><h2>{stockProduct.name}</h2></div><button type="button" className="icon-button" onClick={() => setStockProduct(null)} aria-label="Tutup"><X size={18} /></button></div>
            <div className="stock-preview"><span>Stok saat ini</span><strong>{stockProduct.stock}</strong></div>
            <label className="field"><span>Perubahan stok</span><input type="number" value={stockDelta} onChange={(event) => setStockDelta(Number(event.target.value))} placeholder="Contoh: 10 atau -3" /></label>
            <label className="field"><span>Alasan</span><select value={stockReason} onChange={(event) => setStockReason(event.target.value)}><option>Stok masuk</option><option>Stok keluar</option><option>Koreksi stok</option><option>Rusak atau hilang</option></select></label>
            <div className="stock-next">Stok setelah disimpan: <strong>{stockProduct.stock + stockDelta}</strong></div>
            <div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setStockProduct(null)}>Batal</button><button className="modal-primary" type="submit"><Check size={17} weight="bold" /> Simpan stok</button></div>
          </form>
        </div>
      )}

      {confirmResetAllStock && (
        <div className="modal-backdrop-globaliti" role="presentation" onClick={() => setConfirmResetAllStock(false)}>
          <div className="form-modal" role="dialog" aria-modal="true" aria-label="Nolkan semua stok produk" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Nolkan semua stok produk?</h2>
                <p className="modal-sub">Seluruh stok produk ({products.length} item) akan diatur menjadi 0 untuk persiapan stok opname atau pencatatan fisik dari awal. Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setConfirmResetAllStock(false)}>Batal</button>
              <button
                type="button"
                className="primary-action danger-action"
                onClick={() => {
                  setProducts((current) => current.map((p) => ({ ...p, stock: 0 })))
                  notify('Semua stok produk berhasil diatur menjadi 0')
                  setConfirmResetAllStock(false)
                }}
              >
                Nolkan semua stok
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmResetFinance && (
        <div className="modal-backdrop-globaliti" role="presentation" onClick={() => setConfirmResetFinance(false)}>
          <div className="form-modal" role="dialog" aria-modal="true" aria-label="Reset seluruh data keuangan" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Reset seluruh data keuangan?</h2>
                <p className="modal-sub">Pilih opsi reset pembukuan di bawah ini. Riwayat penjualan ({sales.length} nota) dan beban operasional ({expenses.length} catatan) akan dihapus.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setConfirmResetFinance(false)} aria-label="Tutup"><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '14px 0' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: resetFinanceRestoreStock ? '2px solid #2563eb' : '1px solid var(--gc-border)',
                  backgroundColor: resetFinanceRestoreStock ? 'rgba(37, 99, 235, 0.05)' : 'var(--gc-surface)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="reset_finance_mode"
                  checked={resetFinanceRestoreStock}
                  onChange={() => setResetFinanceRestoreStock(true)}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <strong style={{ display: 'block', color: 'var(--gc-text)', fontSize: '14px', marginBottom: '3px' }}>
                    Opsi A: Kembalikan Stok Produk ke Awal & Hapus Data Keuangan
                  </strong>
                  <span style={{ fontSize: '13px', color: 'var(--gc-text-muted)', lineHeight: 1.4 }}>
                    Jumlah produk yang telah laku/terjual akan ditambahkan kembali ke stok produk di katalog (rollback penjualan), kemudian riwayat keuangan dihapus bersih.
                  </span>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: !resetFinanceRestoreStock ? '2px solid #2563eb' : '1px solid var(--gc-border)',
                  backgroundColor: !resetFinanceRestoreStock ? 'rgba(37, 99, 235, 0.05)' : 'var(--gc-surface)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="reset_finance_mode"
                  checked={!resetFinanceRestoreStock}
                  onChange={() => setResetFinanceRestoreStock(false)}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <strong style={{ display: 'block', color: 'var(--gc-text)', fontSize: '14px', marginBottom: '3px' }}>
                    Opsi B: Reset Data Keuangan Saja (Pertahankan Stok Sekarang)
                  </strong>
                  <span style={{ fontSize: '13px', color: 'var(--gc-text-muted)', lineHeight: 1.4 }}>
                    Hanya menghapus riwayat penjualan dan beban toko. Jumlah stok produk saat ini tidak diubah sama sekali.
                  </span>
                </div>
              </label>
            </div>

            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setConfirmResetFinance(false)}>Batal</button>
              <button
                type="button"
                className="primary-action danger-action"
                onClick={() => {
                  if (resetFinanceRestoreStock) {
                    const soldMap: Record<string, number> = {}
                    sales.forEach((s) => {
                      s.items.forEach((it) => {
                        soldMap[it.productId] = (soldMap[it.productId] || 0) + it.quantity
                      })
                    })
                    setProducts((prev) =>
                      prev.map((p) => {
                        const sold = soldMap[p.id] || 0
                        return sold > 0 ? { ...p, stock: p.stock + sold } : p
                      })
                    )
                  }
                  setSales([])
                  setExpenses([])
                  notify(
                    resetFinanceRestoreStock
                      ? 'Seluruh data keuangan berhasil direset dan stok produk dikembalikan ke awal'
                      : 'Seluruh data keuangan (penjualan dan beban) berhasil direset'
                  )
                  setConfirmResetFinance(false)
                }}
              >
                Reset Data Keuangan
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmingPayment && (
        <div className="modal-backdrop-globaliti" role="presentation" onClick={() => setConfirmingPayment(false)}>
          <div className="sale-modal" role="dialog" aria-modal="true" aria-label="Konfirmasi pembayaran" onClick={(event) => event.stopPropagation()}>
            <h2>Konfirmasi pembayaran</h2>
            <p>Periksa kembali pesanan. Transaksi yang sudah dibayar tidak dapat dibatalkan.</p>
            <div className="sale-receipt">
              <div><span>Jumlah barang</span><strong>{cartCount}</strong></div>
              <div><span>Metode</span><strong>{paymentMethod}</strong></div>
              <div><span>Total dibayar</span><strong className="sale-receipt-total">{formatRupiah(cartTotal)}</strong></div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setConfirmingPayment(false)}>Kembali</button>
              <button type="button" className="modal-primary" onClick={confirmPayment}><Check size={17} weight="bold" /> Bayar {formatRupiah(cartTotal)} <kbd className="hotkey-badge">Enter</kbd></button>
            </div>
          </div>
        </div>
      )}

      {saleComplete && (
        <div className="modal-backdrop-globaliti" role="presentation" onClick={startNewSale}>
          <div className="sale-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="success-mark"><Check size={28} weight="bold" /></div>
            <h2>Pembayaran berhasil</h2>
            <p>Stok telah diperbarui dan transaksi masuk ke riwayat hari ini.</p>
            <div className="sale-receipt">
              <div><span>ID transaksi</span><strong>{saleComplete.id}</strong></div>
              <div><span>Total dibayar</span><strong>{formatRupiah(saleComplete.total)}</strong></div>
              <div><span>Metode</span><strong>{saleComplete.payment}</strong></div>
            </div>
            <button className="modal-primary" onClick={startNewSale}>Transaksi baru <kbd className="hotkey-badge">Enter</kbd> <CaretRight size={17} /></button>
          </div>
        </div>
      )}

      {notice && (
        <div
          className="notice-modal-backdrop"
          role="presentation"
          onClick={() => setNotice('')}
        >
          <div
            className="notice-modal-dialog notice-toast"
            role="status"
            aria-live="polite"
            aria-label="Pemberitahuan Sistem"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="notice-icon-circle">
                  <Info size={22} weight="bold" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--gc-text)' }}>Pemberitahuan Sistem</h3>
                  <small style={{ color: 'var(--gc-text-muted)', fontSize: '12px' }}>{profile.unitName}</small>
                </div>
              </div>
              <button
                type="button"
                className="secondary-button icon-only"
                aria-label="Tutup pemberitahuan"
                onClick={() => setNotice('')}
                style={{ padding: '6px', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--gc-text)', marginBottom: '18px' }}>
              {notice}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="primary-action"
                onClick={() => setNotice('')}
                autoFocus
                style={{ minWidth: '90px' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SearchEmpty() {
  return <MagnifyingGlass size={19} />
}

export default GlobalitiApp

