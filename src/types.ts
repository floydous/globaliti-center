export type Product = {
  id: string
  barcode: string
  name: string
  category: 'Es krim' | 'Minuman' | 'Snack'
  unit: string
  price: number
  cost: number
  stock: number
  reorderPoint: number
  active: boolean
  image?: string
}

export type SaleItem = {
  productId: string
  quantity: number
  price: number
}

export type Sale = {
  id: string
  time: string
  operator: string
  items: SaleItem[]
  total: number
  payment: 'Tunai' | 'QRIS'
}

export type PrintOrder = {
  id: string
  time: string
  fileName: string
  mode: 'Hitam putih' | 'Berwarna'
  quantity: number
  basis: 'Halaman' | 'Kertas'
  total: number
  payment: 'Lunas di muka' | 'Bayar di akhir' | 'Lunas setelah cetak'
  status: 'Menunggu cetak' | 'Dicetak' | 'Selesai'
}

export type Expense = {
  id: string
  label: string
  category: string
  amount: number
  date: string
}

export type PrintSettings = {
  bwRate: number
  colorRate: number
  basis: 'Halaman' | 'Kertas'
}

export type PaymentHotkeys = {
  tunai: string
  qris: string
}

export type AiActionType =
  | 'adjust_stock'
  | 'record_sale'
  | 'record_expense'
  | 'create_print_order'
  | 'update_print_order'
  | 'add_product'
  | 'update_price'
  | 'update_payment_hotkeys'

export type AiAction = {
  id: string
  action: AiActionType
  description: string
  params: Record<string, any>
  status: 'pending' | 'applied' | 'rejected'
}

export type AiMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  time: string
  action?: AiAction
  actions?: AiAction[]
  streaming?: boolean
}

export type Status = 'locked' | 'available' | 'in-progress' | 'mastered'

export type Progress = {
  schemaVersion: number
  currentLesson: string
  completedLessons: string[]
  masteredSkills: string[]
  questionAttempts: Record<string, { correct: boolean; answer: string; topicId?: string; attemptedAt?: string }>
  practiceSessions?: Array<{ id: string; mode: 'diagnostic' | 'simulation' | 'topic' | 'mixed' | 'mistakes'; topicId: string; questionCount: number; correct: number; completedAt: string }>
  topicStats?: Record<string, { attempts: number; correct: number }>
  streak: number
  lastSavedAt: string
  profile: string
}

export type Skill = {
  id: string
  title: string
  group: string
  description: string
  status: Status
  lessons: number
  completed: number
  color?: string
}

export type Difficulty = 'Mudah' | 'Sedang' | 'Sulit'
export type CognitiveLevel = 'Pemahaman' | 'Aplikasi' | 'Penalaran'

export type Question = {
  id: string
  prompt: string
  answer: string
  answerIndex?: number
  explanation: string
  misconception?: string
  options: string[]
  skill: string
  topicId?: string
  concept?: string
  cognitiveLevel?: CognitiveLevel
  difficulty: Difficulty
}

export type AuthUser = { id: string; email?: string }

