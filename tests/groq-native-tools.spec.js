import { test, expect } from '@playwright/test'

test.describe('Groq Native Tools Live Suite', () => {
  test('handles print orders, sales, stock, and expenses via native tools', async ({ page }) => {
    test.skip(!process.env.GROQ_API_KEY, 'Set GROQ_API_KEY to run live Groq coverage')
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('http://127.0.0.1:4173')

    // Set the Groq Key in localStorage
    await page.evaluate((key) => {
      localStorage.setItem('gc_groq_key', key)
    }, process.env.GROQ_API_KEY)
    await page.reload()

    // Open AI Assistant
    const launcher = page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true })
    await launcher.click()

    const input = page.getByRole('textbox', { name: 'Pesan untuk asisten' })

    // Test 1: Mixed Print Order
    await input.fill('1 orang tdi ngeprint proposal, jumlah 32 halaman, yang berwarna cuma 3 halaman. Sudah lunas.')
    await input.press('Enter')

    const printCard = page.locator('.tool-call-card').first()
    await expect(printCard).toBeVisible({ timeout: 20000 })
    expect(await printCard.textContent()).toContain('Order Cetak Word')

    // Apply the print action
    const applyPrint = printCard.getByRole('button', { name: /Terapkan/i })
    await applyPrint.click()
    await expect(printCard).toContainText('Telah Diterapkan')

    // Test 2: POS Sale Recording
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
