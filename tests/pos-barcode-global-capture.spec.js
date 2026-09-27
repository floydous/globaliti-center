import { test, expect } from '@playwright/test'

test.describe('POS Barcode Global Numeric Capture', () => {
  test('typing numbers anywhere in Kasir POS directs them into Barcode input', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')

    const barcodeInput = page.getByRole('textbox', { name: 'Input barcode produk' })
    const searchInput = page.getByRole('textbox', { name: 'Cari produk' })

    // Initially barcode input is empty
    await expect(barcodeInput).toHaveValue('')

    // 1. Click on page background / summary bar (focus is not on barcode)
    await page.locator('.pos-summary-bar').click()
    await expect(barcodeInput).not.toBeFocused()

    // Type digits
    await page.keyboard.type('8990000000010')

    // Expect barcode input to have received the digits and to be focused
    await expect(barcodeInput).toBeFocused()
    await expect(barcodeInput).toHaveValue('8990000000010')

    // Press Enter to add Matcha Cup
    await page.keyboard.press('Enter')

    // Expect cart to have Matcha Cup
    await expect(page.locator('.cart-line strong').first()).toHaveText('Matcha Cup')
    await expect(barcodeInput).toHaveValue('')

    // 2. Click inside the search input box
    await searchInput.click()
    await expect(searchInput).toBeFocused()

    // Type text into search box: letters should stay in search box
    await page.keyboard.type('cone')
    await expect(searchInput).toHaveValue('cone')

    // Now type digits (barcode for Vanilla Cone: 8990000000027)
    await page.keyboard.type('8990000000027')

    // Search input should STILL only have 'cone', the numbers went to barcode input!
    await expect(searchInput).toHaveValue('cone')
    await expect(barcodeInput).toBeFocused()
    await expect(barcodeInput).toHaveValue('8990000000027')

    // Press Enter to submit
    await page.keyboard.press('Enter')

    // Vanilla Cone should now be in cart
    await expect(page.locator('.cart-line strong')).toContainText(['Matcha Cup', 'Vanilla Cone'])
    await expect(barcodeInput).toHaveValue('')
  })
})
