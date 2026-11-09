import { test, expect } from '@playwright/test'
import { useLocalAssistant } from './helpers/groqKey.js'

test('chatbot full autonomy: handles unrecorded sales, expenses, and price changes', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await useLocalAssistant(page)
  await page.goto('http://127.0.0.1:4173')

  // Initial sales count: 3 nota, Rp 39.000
  await expect(page.locator('.pos-summary-bar')).toContainText('3 nota')
  await expect(page.locator('.pos-summary-bar')).toContainText('Rp 39.000')

  // Open assistant floating launcher
  const launcher = page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true })
  await launcher.click()

  const input = page.getByRole('textbox', { name: 'Pesan untuk asisten' })
  const log = page.getByRole('log')

  // 1. User: "berapa stok matcha cup sekarang?"
  await input.fill('berapa stok matcha cup sekarang?')
  await input.press('Enter')

  await expect(log).toContainText('Sisa stok Matcha Cup saat ini ada 24')
  await expect(log).toContainText('Rp 8.000')
  await expect(log).not.toContainText('Barcode: 8990000000010')

  // 2. User: "seseorang membeli matcha cup tapi saya lupa memasukan datanya ke sini, bisakah kamu melakukannya untuk k"
  await input.fill('seseorang membeli matcha cup tapi saya lupa memasukan datanya ke sini, bisakah kamu melakukannya untuk k')
  await input.press('Enter')

  // Verify assistant prepares a full sale transaction (cuts stock AND adds cash revenue)
  await expect(log).toContainText('pencatatan transaksi penjualan')
  await expect(log).toContainText('Catat transaksi penjualan: Matcha Cup (1) senilai Rp 8.000 via Tunai')

  const applySaleBtn = page.getByRole('button', { name: 'Terapkan Perubahan', exact: true })
  await expect(applySaleBtn).toBeVisible()
  await applySaleBtn.click()
  await expect(log).toContainText('Telah Diterapkan')

  // Close assistant and check POS view: sales now 4 nota, Rp 47.000, Matcha Cup stock 23!
  await page.getByRole('button', { name: 'Tutup asisten', exact: true }).click()
  await expect(page.getByRole('button', { name: '23 Matcha Cup Rp 8.000', exact: true })).toBeVisible()
  await expect(page.locator('.pos-summary-bar')).toContainText('4 nota')
  await expect(page.locator('.pos-summary-bar')).toContainText('Rp 47.000')

  // 3. Record expense via AI: "Catat beban beli kertas 25000"
  await launcher.click()
  await input.fill('Catat beban beli kertas 25000')
  await input.press('Enter')
  await expect(log).toContainText('Catat beban Beli kertas')
  await page.getByRole('button', { name: 'Terapkan Perubahan', exact: true }).click()

  // 4. Change product price via AI: "Ubah harga Vanilla Cone jadi 7000"
  await input.fill('Ubah harga Vanilla Cone jadi 7000')
  await input.press('Enter')
  await expect(log).toContainText('Ubah harga jual Vanilla Cone')
  await page.getByRole('button', { name: 'Terapkan Perubahan', exact: true }).click()

  await page.getByRole('button', { name: 'Tutup asisten', exact: true }).click()

  // Verify Vanilla Cone price changed in POS
  await expect(page.getByRole('button', { name: '18 Vanilla Cone Rp 7.000', exact: true })).toBeVisible()

  // Verify Expense and Revenue reflected in Finance view
  await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
  await expect(page.locator('.finance-page')).toContainText('Beli kertas')
  await expect(page.locator('.finance-page')).toContainText('25.000')

  expect(errors).toEqual([])
})

test('handles physical stock discrepancy (freezer count) and stock opname adjustment card', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await useLocalAssistant(page)
  await page.goto('http://127.0.0.1:4173')

  const launcher = page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true })
  await launcher.click()

  const input = page.getByRole('textbox', { name: 'Pesan untuk asisten' })
  const log = page.getByRole('log')

  // 1. User asks about Vanilla Cone stock
  await input.fill('Berapa stok vanilla cone sekarang?')
  await input.press('Enter')
  await expect(log).toContainText('Sisa stok Vanilla Cone saat ini ada 18')

  // 2. User reports physical count discrepancy: "Tapi di freezer hanya ada 12 cone"
  await input.fill('Tapi di freezer hanya ada 12 cone')
  await input.press('Enter')
  await expect(log).toContainText('selisih fisik')
  await expect(log).toContainText('Fisik di Freezer:')
  await expect(log).toContainText('Fisik di Freezer: 12')
  await expect(log).toContainText('Sesuaikan stok opname Vanilla Cone menjadi 12')

  // 3. User applies stock opname adjustment card
  await page.getByRole('button', { name: 'Terapkan Perubahan', exact: true }).click()
  await expect(log).toContainText('Telah Diterapkan')

  // 4. User asks "Yakin?" to verify polite confirmation
  await input.fill('Yakin?')
  await input.press('Enter')
  await expect(log).toContainText('Berdasarkan catatan sistem kasir saat ini, stok tercatat Vanilla Cone adalah 12')

  // 5. Check in POS that Vanilla Cone stock is now 12 cone
  await page.getByRole('button', { name: 'Tutup asisten', exact: true }).click()
  await expect(page.getByRole('button', { name: /12\s+Vanilla Cone/i })).toBeVisible()

  // 6. Test Clear Chat functionality
  await launcher.click()
  const clearBtn = page.getByRole('button', { name: 'Bersihkan percakapan', exact: true })
  await expect(clearBtn).toBeVisible()
  await clearBtn.click()

  // Verify chat is cleared back to welcome message
  await expect(log).toContainText('Halo! Saya Asisten Globaliti')
  await expect(log).not.toContainText('Tapi di freezer hanya ada 12 cone')

  expect(errors).toEqual([])
})
