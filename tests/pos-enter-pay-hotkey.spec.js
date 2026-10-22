import { test, expect } from '@playwright/test'

test.describe('POS Enter Bayar Hotkey', () => {
  test('Enter pays the cart when focus is not in a text field', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('http://127.0.0.1:4173')

    const tile = page.locator('.product-tile').filter({ hasText: 'Vanilla Cone' })
    await tile.click()
    await tile.click()
    await expect(page.locator('.cart-line')).toHaveCount(1)

    // Click a neutral area so focus is on the body, not an input
    await page.locator('.pos-summary-bar').click()

    await page.keyboard.press('Enter')

    await expect(page.getByRole('dialog')).toContainText('Pembayaran berhasil')
    await expect(page.getByRole('dialog')).toContainText('Rp 12.000')

    expect(errors).toEqual([])
  })

  test('Enter in the barcode input adds the product instead of paying', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('http://127.0.0.1:4173')

    const barcodeInput = page.getByRole('textbox', { name: 'Input barcode produk' })
    await barcodeInput.click()
    await page.keyboard.type('8990000000010')
    await page.keyboard.press('Enter')

    // Product added to cart, no payment dialog
    await expect(page.locator('.cart-line strong').first()).toHaveText('Matcha Cup')
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // Now Enter with a product in the cart but focus in the barcode field
    // must NOT pay: the barcode field owns Enter while focused.
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toHaveCount(0)

    expect(errors).toEqual([])
  })

  test('Enter does not pay when the cart is empty', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('http://127.0.0.1:4173')
    await page.locator('.pos-summary-bar').click()

    await page.keyboard.press('Enter')

    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('Bayar button shows the Enter hotkey badge', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')

    const bayarBtn = page.getByRole('button', { name: /Bayar Rp/ })
    await expect(bayarBtn.locator('.hotkey-badge')).toHaveText('Enter')
  })
})
