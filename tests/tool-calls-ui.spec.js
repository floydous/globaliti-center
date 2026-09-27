import { test, expect } from '@playwright/test'

test('multiple tool calls render dedicated UI and do not leak raw markdown into chat bubble', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173')

  // Set Groq key in localStorage
  await page.evaluate(() => {
    localStorage.setItem('gc_groq_key', 'gsk_mock_test_key_for_ui')
  })

  // Mock Groq API response with the exact 3 tool calls from user transcript
  await page.route('https://api.groq.com/openai/v1/chat/completions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [
          {
            message: {
              content: `Baik, saya akan memproses transaksi penjualan tersebut. Berikut rinciannya:

Matcha Cup: 2 cup x Rp 8.000 = Rp 16.000
Vanilla Cone: 5 cone x Rp 6.000 = Rp 30.000
Strawberry Cup: 3 cup x Rp 8.000 = Rp 24.000
Total Tagihan: Rp 70.000

Semua stok masih di atas batas minimum, jadi aman.

\`\`\`action
{
  "type": "record_sale",
  "productId": "p1",
  "quantity": 2,
  "payment": "Tunai",
  "description": "Penjualan Matcha Cup (2 cup)"
}
\`\`\`

\`\`\`action
{
  "type": "record_sale",
  "productId": "p2",
  "quantity": 5,
  "payment": "Tunai",
  "description": "Penjualan Vanilla Cone (5 cone)"
}
\`

\`\`\`action
{
  "type": "record_sale",
  "productId": "p4",
  "quantity": 3,
  "payment": "Tunai",
  "description": "Penjualan Strawberry Cup (3 cup)"
}
\`
`,
            },
          },
        ],
      }),
    })
  })

  // Open AI Assistant
  const launcher = page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true })
  await launcher.click()

  const input = page.getByRole('textbox', { name: 'Pesan untuk asisten' })
  const log = page.getByRole('log')

  await input.fill('ada orng yg beli matcha cup 2, vanilla cone 5, strawbeery cup 3. tolong proses dong, mereka udh bayar')
  await input.press('Enter')

  // 1. Text bubble must contain conversational text
  await expect(log).toContainText('Berikut rinciannya:')
  await expect(log).toContainText('Total Tagihan: Rp 70.000')

  // 2. Text bubble must NOT leak raw action JSON code or backticks
  const bubbleText = await page.locator('.ai-bubble-text').last().textContent()
  expect(bubbleText).not.toContain('```action')
  expect(bubbleText).not.toContain('"productId": "p1"')
  expect(bubbleText).not.toContain('"type": "record_sale"')

  // 3. Dedicated Tool Call UI must render for each of the 3 actions
  const toolCards = page.locator('.tool-call-card')
  await expect(toolCards).toHaveCount(3)

  // Verify cards contain proper tool call labels and descriptions
  await expect(toolCards.nth(0)).toContainText('Pencatatan Penjualan')
  await expect(toolCards.nth(0)).toContainText('Penjualan Matcha Cup (2 cup)')

  await expect(toolCards.nth(1)).toContainText('Pencatatan Penjualan')
  await expect(toolCards.nth(1)).toContainText('Penjualan Vanilla Cone (5 cone)')

  await expect(toolCards.nth(2)).toContainText('Pencatatan Penjualan')
  await expect(toolCards.nth(2)).toContainText('Penjualan Strawberry Cup (3 cup)')

  // 4. Batch actions bar appears
  const batchBar = page.locator('.ai-batch-actions-bar')
  await expect(batchBar).toBeVisible()
  await expect(batchBar).toContainText('3 Tindakan')

  // 5. Test "Terapkan Semua" button
  const batchBtn = page.getByRole('button', { name: /Terapkan Semua/i })
  await expect(batchBtn).toBeVisible()
  await batchBtn.click()

  // All 3 cards should now show "Telah Diterapkan"
  await expect(toolCards.nth(0)).toContainText('Telah Diterapkan')
  await expect(toolCards.nth(1)).toContainText('Telah Diterapkan')
  await expect(toolCards.nth(2)).toContainText('Telah Diterapkan')

  // Close assistant and verify POS stocks updated
  await page.getByRole('button', { name: 'Tutup asisten', exact: true }).click()

  // Matcha Cup initially 24 - 2 = 22
  await expect(page.getByRole('button', { name: /22 cup Matcha Cup/i })).toBeVisible()
  // Vanilla Cone initially 18 - 5 = 13
  await expect(page.getByRole('button', { name: /13 cone Vanilla Cone/i })).toBeVisible()
  // Strawberry Cup initially 11 - 3 = 8
  await expect(page.getByRole('button', { name: /8 cup Strawberry Cup/i })).toBeVisible()
})
