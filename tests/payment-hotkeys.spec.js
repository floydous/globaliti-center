import { test, expect } from '@playwright/test'

test.describe('Payment Hotkeys & AI Agent Customization', () => {
  test('default hotkeys 1 and 2 switch payment, and AI agent can customize them', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('http://127.0.0.1:4173')

    const tunaiBtn = page.locator('.payment-option', { hasText: 'Tunai' })
    const qrisBtn = page.locator('.payment-option', { hasText: 'QRIS' })

    // 1. Check default button hints
    await expect(tunaiBtn.locator('.hotkey-badge')).toHaveText('1')
    await expect(qrisBtn.locator('.hotkey-badge')).toHaveText('2')

    // Tunai is active by default
    await expect(tunaiBtn).toHaveClass(/active/)
    await expect(qrisBtn).not.toHaveClass(/active/)

    // Click background area to blur any inputs
    await page.locator('.pos-summary-bar').click()

    // Press hotkey '2': should activate QRIS
    await page.keyboard.press('2')
    await expect(qrisBtn).toHaveClass(/active/)
    await expect(tunaiBtn).not.toHaveClass(/active/)

    // Press hotkey '1': should activate Tunai
    await page.keyboard.press('1')
    await expect(tunaiBtn).toHaveClass(/active/)
    await expect(qrisBtn).not.toHaveClass(/active/)

    // 2. Open AI Assistant and ask to change hotkeys to T and Q
    await page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true }).click()
    const input = page.getByRole('textbox', { name: 'Pesan untuk asisten' })

    await input.fill('Tolong ubah hotkey tunai jadi T dan qris jadi Q')
    await input.press('Enter')

    // Find proposal card
    const card = page.locator('.action-proposal-card', { hasText: 'Pintasan Hotkey Kasir' })
    await expect(card).toBeVisible()
    await expect(card).toContainText('Tunai [T]')
    await expect(card).toContainText('QRIS [Q]')

    // Apply the proposal
    await card.getByRole('button', { name: 'Terapkan Perubahan' }).click()
    await expect(card).toContainText('Telah Diterapkan')

    // Close assistant
    await page.getByRole('button', { name: 'Tutup asisten' }).click()

    // 3. Verify updated button hints
    await expect(tunaiBtn.locator('.hotkey-badge')).toHaveText('T')
    await expect(qrisBtn.locator('.hotkey-badge')).toHaveText('Q')

    // Click background
    await page.locator('.pos-summary-bar').click()

    // Press 'Q' -> switches to QRIS
    await page.keyboard.press('q')
    await expect(qrisBtn).toHaveClass(/active/)
    await expect(tunaiBtn).not.toHaveClass(/active/)

    // Press 'T' -> switches to Tunai
    await page.keyboard.press('t')
    await expect(tunaiBtn).toHaveClass(/active/)
    await expect(qrisBtn).not.toHaveClass(/active/)

    // 4. Verify that numbers now route to barcode input box
    const barcodeInput = page.getByRole('textbox', { name: 'Input barcode produk' })
    await page.locator('.pos-summary-bar').click()
    await page.keyboard.type('123')
    await expect(barcodeInput).toHaveValue('123')

    expect(errors).toEqual([])
  })

  test('hotkey is NOT triggered when user is focusing on an input box', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('http://127.0.0.1:4173')

    const tunaiBtn = page.locator('.payment-option', { hasText: 'Tunai' })
    const qrisBtn = page.locator('.payment-option', { hasText: 'QRIS' })
    const barcodeInput = page.getByRole('textbox', { name: 'Input barcode produk' })
    const searchInput = page.getByRole('textbox', { name: 'Cari produk' })

    // Tunai is active initially
    await expect(tunaiBtn).toHaveClass(/active/)
    await expect(qrisBtn).not.toHaveClass(/active/)

    // 1. Focus on the barcode input box
    await barcodeInput.click()
    await expect(barcodeInput).toBeFocused()

    // Type '2': since focus is inside an input box, hotkey '2' (QRIS) MUST NOT be triggered!
    // Instead, '2' should simply appear inside barcodeInput!
    await page.keyboard.type('2')
    await expect(barcodeInput).toHaveValue('2')
    // Tunai MUST STILL be active, QRIS must NOT be triggered
    await expect(tunaiBtn).toHaveClass(/active/)
    await expect(qrisBtn).not.toHaveClass(/active/)

    // Type '1': hotkey '1' (Tunai) MUST NOT be triggered as an action, '1' must just append
    await page.keyboard.type('1')
    await expect(barcodeInput).toHaveValue('21')

    // 2. Focus on the search input box
    await searchInput.click()
    await expect(searchInput).toBeFocused()

    // Type letters into search input
    await page.keyboard.type('aice')
    await expect(searchInput).toHaveValue('aice')

    expect(errors).toEqual([])
  })

  test('Groq model can dynamically adjust payment hotkeys via native tool calling', async ({ page }) => {
    test.skip(!process.env.GROQ_API_KEY, 'Set GROQ_API_KEY to run live Groq coverage')
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('http://127.0.0.1:4173')

    await page.evaluate((key) => {
      localStorage.setItem('gc_groq_key', key)
    }, process.env.GROQ_API_KEY)
    await page.reload()

    await page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true }).click()
    const input = page.getByRole('textbox', { name: 'Pesan untuk asisten' })

    await input.fill('Tolong ganti hotkey tunai ke F1 dan qris ke F2')
    await input.press('Enter')

    // Expect action card
    const card = page.locator('.action-proposal-card', { hasText: 'Pintasan Hotkey Kasir' })
    await expect(card).toBeVisible({ timeout: 15000 })
    await expect(card).toContainText('F1')
    await expect(card).toContainText('F2')

    // Apply
    await card.getByRole('button', { name: 'Terapkan Perubahan' }).click()
    await expect(card).toContainText('Telah Diterapkan')

    // Close assistant and check buttons
    await page.getByRole('button', { name: 'Tutup asisten' }).click()
    const tunaiBtn = page.locator('.payment-option', { hasText: 'Tunai' })
    const qrisBtn = page.locator('.payment-option', { hasText: 'QRIS' })
    await expect(tunaiBtn.locator('.hotkey-badge')).toHaveText('F1')
    await expect(qrisBtn.locator('.hotkey-badge')).toHaveText('F2')

    expect(errors).toEqual([])
  })
})
