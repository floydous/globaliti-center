import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const artifactDir = path.resolve('C:/Users/brat/.gemini/antigravity/brain/bae368b1-7950-4b22-a3e9-ab528fe59e28')

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 860 } })

  console.log('Navigating to http://127.0.0.1:4173...')
  await page.goto('http://127.0.0.1:4173')
  await page.waitForTimeout(500)

  // Open Assistant
  console.log('Opening Assistant...')
  const launcher = page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true })
  await launcher.click()

  const panel = page.locator('#assistant-panel')
  await panel.waitFor({ state: 'visible' })

  const input = page.getByRole('textbox', { name: 'Pesan untuk asisten' })
  const initialBubbleCount = await page.locator('.ai-message-bubble.assistant-side').count()

  const query = 'Tolong perbarui harga jual satuan produk Vanilla Cone menjadi Rp 7.000 di katalog toko.'
  console.log(`Sending: "${query}"`)
  await input.fill(query)
  await input.press('Enter')

  console.log('Waiting for response...')
  await page.waitForFunction(
    ({ count }) => {
      const bubbles = document.querySelectorAll('.ai-message-bubble.assistant-side')
      if (bubbles.length <= count) return false
      const last = bubbles[bubbles.length - 1]
      const thinking = last.querySelector('.ai-thinking')
      return !thinking && (last.textContent || '').trim().length > 0
    },
    { count: initialBubbleCount },
    { timeout: 35000 }
  )

  await page.waitForTimeout(1000)
  const lastBubble = page.locator('.ai-message-bubble.assistant-side').last()
  console.log('Assistant response:\n', await lastBubble.innerText())

  const actionCard = lastBubble.locator('.action-proposal-card.tool-call-card').first()
  await actionCard.waitFor({ state: 'visible', timeout: 10000 })
  console.log('Action card:\n', await actionCard.innerText())

  const screenshot = path.join(artifactDir, 'ai-tool-update-price-verified.png')
  await page.screenshot({ path: screenshot })
  console.log('Saved screenshot:', screenshot)

  // Apply change
  console.log('Applying update_price...')
  await actionCard.locator('.proposal-btn-apply').click()
  await page.waitForTimeout(600)

  const status = await actionCard.locator('.proposal-status-pill').innerText()
  console.log('Status after apply:', status)

  // Check Vanilla Cone price on POS screen
  const vanillaCard = page.locator('.pos-box-card').filter({ hasText: 'Vanilla Cone' }).first()
  console.log('Vanilla Cone card text on POS:', await vanillaCard.innerText())

  const finalScreenshot = path.join(artifactDir, 'ai-tool-update-price-applied.png')
  await page.screenshot({ path: finalScreenshot })
  console.log('Saved final screenshot:', finalScreenshot)

  await browser.close()
  console.log('DONE!')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
