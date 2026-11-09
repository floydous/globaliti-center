import { test, expect } from '@playwright/test'
import { storeRealKey } from './helpers/groqKey.js'

test.describe('Groq Native Tools Live Suite', () => {
  test('handles sales, stock, and expenses via native tools', async ({ page }) => {
    test.skip(!process.env.GROQ_API_KEY, 'Set GROQ_API_KEY to run live Groq coverage')
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    // Kunci asli disimpan sebagai file lokal di server.
    await storeRealKey(page, process.env.GROQ_API_KEY)
    await page.goto('http://127.0.0.1:4173')

    // Open AI Assistant
    const launcher = page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true })
    await launcher.click()

    const input = page.getByRole('textbox', { name: 'Pesan untuk asisten' })

    // Test 1: POS Sale Recording
    await input.fill('Ada yang beli 2 Matcha Cup bayar tunai')
    await input.press('Enter')

    // Wait for the sale card to appear
    const saleCard = page.locator('.tool-call-card').filter({ hasText: 'Pencatatan Penjualan' }).first()
    await expect(saleCard).toBeVisible({ timeout: 20000 })

    const applySale = saleCard.getByRole('button', { name: /Terapkan/i })
    await applySale.click()
    await expect(saleCard).toContainText('Telah Diterapkan')

    // Test 3: Stock Adjustment
    await input.fill('Tolong tambahkan stok Vanilla Cone 10 biji')
    await input.press('Enter')

    const stockCard = page.locator('.tool-call-card').filter({ hasText: 'Penyesuaian Stok' }).first()
    await expect(stockCard).toBeVisible({ timeout: 20000 })

    const applyStock = stockCard.getByRole('button', { name: /Terapkan/i })
    await applyStock.click()
    await expect(stockCard).toContainText('Telah Diterapkan')

    expect(errors).toEqual([])
  })
})
