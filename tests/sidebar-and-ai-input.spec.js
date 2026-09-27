import { test, expect } from '@playwright/test'

test.describe('Sidebar UI/UX (taste-skill) & AI Agent Input Isolation', () => {
  test('typing numbers in AI Agent input box never leaks into POS barcode input box', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('http://127.0.0.1:4173')

    const barcodeInput = page.getByRole('textbox', { name: 'Input barcode produk' })
    await expect(barcodeInput).toHaveValue('')

    // Open the floating assistant
    await page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true }).click()
    const aiInput = page.getByRole('textbox', { name: 'Pesan untuk asisten' })
    await expect(aiInput).toBeVisible()

    // Focus inside the AI input box and type digits and text containing numbers
    await aiInput.click()
    await expect(aiInput).toBeFocused()

    await page.keyboard.type('Restock matcha 5 box dan 10 cone')

    // AI input must retain the full string including numbers
    await expect(aiInput).toHaveValue('Restock matcha 5 box dan 10 cone')

    // Barcode input MUST REMAIN EMPTY!
    await expect(barcodeInput).toHaveValue('')

    expect(errors).toEqual([])
  })

  test('sidebar renders with taste-skill brand card, active indicators, and operator card', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')

    // Check brand card
    const brandCard = page.locator('.brand-card')
    await expect(brandCard).toBeVisible()
    await expect(brandCard).toContainText('SMKS TI BALI GLOBAL')
    await expect(brandCard).toContainText('Globaliti')
    await expect(brandCard).toContainText('Creative Center')

    // Check brand tile and icon
    const brandImg = page.locator('.brand-tile img')
    await expect(brandImg).toBeVisible()

    // Check active nav item has indicator
    const activeNav = page.locator('.nav-item.active')
    await expect(activeNav).toContainText('Kasir POS')
    await expect(activeNav.locator('.nav-indicator')).toBeVisible()

    // Check operator footer mini card
    const operatorCard = page.locator('.operator-mini-card')
    await expect(operatorCard).toBeVisible()
    await expect(operatorCard.locator('.operator-name')).toContainText('Pengelola 1')
    await expect(operatorCard.locator('.status-beacon')).toBeVisible()
  })
})
