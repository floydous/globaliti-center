import { test, expect } from '@playwright/test'

test.describe('Assistant Full System Control & Transaction Visibility', () => {
  test('Local Engine answers latest customer purchase, stock, and top selling', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('http://127.0.0.1:4173')

    // Ensure no Groq key so local engine is used
    await page.evaluate(() => {
      localStorage.removeItem('gc_groq_key')
    })
    await page.reload()

    // Open assistant
    await page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true }).click()
    const input = page.getByRole('textbox', { name: 'Pesan untuk asisten' })

    // 1. Test query: "pelanggan terakhir ada beli apa ya?"
    await input.fill('pelanggan terakhir ada beli apa ya?')
    await input.press('Enter')

    const bubble1 = page.locator('.ai-bubble-text').last()
    await expect(bubble1).toContainText('TRX-0003')
    await expect(bubble1).toContainText('Vanilla Cone')
    await expect(bubble1).not.toContainText('tidak memiliki akses')

    // 2. Test query: "stok Matcha Cup sekarang berapa?"
    await input.fill('stok Matcha Cup sekarang berapa?')
    await input.press('Enter')

    const bubble2 = page.locator('.ai-bubble-text').last()
    await expect(bubble2).toContainText('Matcha Cup')
    await expect(bubble2).not.toContainText('tidak memiliki akses')

    // 3. Test query: "produk apa yang paling laku hari ini?"
    await input.fill('es krim apa yang paling laku hari ini?')
    await input.press('Enter')

    const bubble3 = page.locator('.ai-bubble-text').last()
    await expect(bubble3).toContainText('Peringkat es krim terlaris')
    await expect(bubble3).toContainText('Vanilla Cone')

    expect(errors).toEqual([])
  })

  test('Groq Qwen model answers latest customer purchase directly with live transaction details', async ({ page }) => {
    test.skip(!process.env.GROQ_API_KEY, 'Set GROQ_API_KEY to run live Groq coverage')
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('http://127.0.0.1:4173')

    // Set valid Groq key
    await page.evaluate((key) => {
      localStorage.setItem('gc_groq_key', key)
    }, process.env.GROQ_API_KEY)
    await page.reload()

    await page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true }).click()
    const input = page.getByRole('textbox', { name: 'Pesan untuk asisten' })

    // Ask about last purchase
    await input.fill('pelanggan terakhir ada beli apa ya?')
    await input.press('Enter')

    // The response must identify Vanilla Cone from TRX-0003
    const assistantBubble = page.locator('.ai-message-bubble.assistant-side').last()
    await expect(assistantBubble).toContainText(/Vanilla Cone/i, { timeout: 15000 })
    await expect(assistantBubble).not.toContainText(/tidak memiliki akses/i)

    expect(errors).toEqual([])
  })
})
