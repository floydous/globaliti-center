import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const outputDir = path.resolve('dogfood-output/screenshots')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  })
  const page = await context.newPage()

  console.log('Navigating to http://127.0.0.1:4173...')
  await page.goto('http://127.0.0.1:4173')
  await page.waitForLoadState('networkidle')

  // 1. Trigger "Stok Strawberry Cup tidak mencukupi" in Kasir POS
  console.log('Triggering out-of-stock notice in Kasir POS...')
  const tile = page.locator('.product-tile').filter({ hasText: 'Strawberry Cup' })
  await tile.waitFor({ state: 'visible' })
  for (let i = 0; i < 12; i++) {
    await tile.click()
  }

  const noticeModal = page.locator('.notice-modal-dialog')
  await noticeModal.waitFor({ state: 'visible', timeout: 5000 })

  // Screenshot 1: Notice Modal for Strawberry Cup
  const modalPath = path.join(outputDir, 'notice-modal-strawberry-cup.png')
  await page.screenshot({ path: modalPath })
  console.log('Captured modal screenshot:', modalPath)

  // Close modal via close X icon
  console.log('Closing notice modal via X...')
  await page.locator('.notice-modal-close-icon').click()
  await page.waitForTimeout(300)

  // 2. Go to Katalog & Stok and toggle Aice Choco Meets Oats
  console.log('Opening Katalog & Stok tab...')
  await page.click('button:has-text("Katalog & Stok")')
  await page.waitForTimeout(500)

  const card = page.locator('.catalog-box-card').filter({ hasText: 'Aice Choco Meets Oats' }).first()
  await card.waitFor({ state: 'visible' })

  console.log('Toggling active status...')
  const toggleBtn = card.locator('button[title*="Nonaktifkan"], button[title*="Aktifkan"]').first()
  await toggleBtn.click()

  await noticeModal.waitFor({ state: 'visible', timeout: 5000 })
  const modalTogglePath = path.join(outputDir, 'notice-modal-toggle.png')
  await page.screenshot({ path: modalTogglePath })
  console.log('Captured modal toggle screenshot:', modalTogglePath)

  // Close modal via "Tutup" button
  console.log('Closing notice modal via Tutup button...')
  await page.locator('.notice-modal-btn').click()
  await page.waitForTimeout(300)

  await browser.close()
  console.log('Done.')
}

run().catch((err) => {
  console.error('Error running verification:', err)
  process.exit(1)
})
