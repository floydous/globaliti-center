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

  // Click on "Katalog & Stok" tab
  console.log('Opening Katalog & Stok tab...')
  await page.click('button:has-text("Katalog & Stok")')
  await page.waitForTimeout(600)

  // Find Aice Choco Meets Oats toggle button
  const card = page.locator('.catalog-box-card:has-text("Aice Choco Meets Oats")')
  await card.waitFor({ state: 'visible' })

  // Toggle active/inactive via the power button inside the card
  console.log('Toggling active status...')
  const toggleBtn = card.locator('button[title*="Nonaktifkan"], button[title*="Aktifkan"]').first()
  await toggleBtn.click()

  // Wait for notice modal to appear
  console.log('Waiting for notice modal...')
  const noticeModal = page.locator('.notice-modal-dialog')
  await noticeModal.waitFor({ state: 'visible', timeout: 5000 })

  // Screenshot 1: Notice Modal
  const modalPath = path.join(outputDir, 'notice-modal-verified.png')
  await page.screenshot({ path: modalPath })
  console.log('Captured modal screenshot:', modalPath)

  // Close notice modal
  console.log('Closing notice modal...')
  await page.locator('.notice-modal-btn').click()
  await page.locator('.notice-modal-backdrop').waitFor({ state: 'detached', timeout: 3000 }).catch(() => {})
  await page.waitForTimeout(500)

  // Screenshot 2: Inactive Card Grid
  const cardGrid = page.locator('.catalog-boxes-grid')
  const catalogGridPath = path.join(outputDir, 'catalog-inactive-card-verified.png')
  await cardGrid.screenshot({ path: catalogGridPath })
  console.log('Captured catalog grid screenshot:', catalogGridPath)

  // Screenshot 3: Full Page
  const fullPagePath = path.join(outputDir, 'katalog-full-page-verified.png')
  await page.screenshot({ path: fullPagePath })
  console.log('Captured full page screenshot:', fullPagePath)

  await browser.close()
  console.log('All visual verification screenshots captured successfully.')
}

run().catch((err) => {
  console.error('Error running verification:', err)
  process.exit(1)
})
