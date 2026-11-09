import { test, expect } from '@playwright/test'

test.describe('POS Enter Bayar Hotkey', () => {
  test('Enter membuka konfirmasi, Enter lagi membayar, Enter lagi menutup struk', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('http://127.0.0.1:4173')

    const tile = page.locator('.product-tile').filter({ hasText: 'Vanilla Cone' })
    await tile.click()
    await tile.click()
    await expect(page.locator('.cart-line')).toHaveCount(1)

    // Fokus ada di tombol produk, tetapi Enter tetap berarti Bayar dan tidak menambah produk lagi
    await page.keyboard.press('Enter')
    const confirm = page.getByRole('dialog', { name: 'Konfirmasi pembayaran' })
    await expect(confirm).toContainText('Rp 12.000')
    await expect(page.locator('.cart-line-copy')).toContainText('2')
    await expect(page.locator('.sale-modal')).toHaveCount(1)

    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toContainText('Pembayaran berhasil')
    await expect(page.getByRole('dialog')).toContainText('Rp 12.000')

    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toHaveCount(0)

    expect(errors).toEqual([])
  })

  test('Enter membayar walau fokus ada di tombol metode pembayaran, dan Escape membatalkan konfirmasi', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    await page.locator('.product-tile').filter({ hasText: 'Vanilla Cone' }).click()

    await page.getByRole('button', { name: /QRIS/ }).click() // tombol ini kini berfokus
    await page.keyboard.press('Enter')
    const confirm = page.getByRole('dialog', { name: 'Konfirmasi pembayaran' })
    await expect(confirm).toContainText('QRIS')

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('.cart-line')).toHaveCount(1) // belum ada yang dibayar

    await page.getByRole('button', { name: /Bayar Rp/ }).click()
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Kembali' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
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

test.describe('POS pintasan cari produk', () => {
  test('"/" memfokuskan kolom cari produk tanpa mengetikkan garis miring', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    const search = page.getByRole('textbox', { name: 'Cari produk', exact: true })
    await page.locator('.pos-summary-bar').click()
    await page.keyboard.press('/')
    await expect(search).toBeFocused()
    await expect(search).toHaveValue('')

    // Di dalam kolom teks, "/" tetap karakter biasa
    await page.keyboard.type('a/b')
    await expect(search).toHaveValue('a/b')
  })
})
