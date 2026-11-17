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
    viewport: { width: 1280, height: 850 },
  })
  const page = await context.newPage()

  console.log('1. Loading application...')
  await page.goto('http://127.0.0.1:4173')
  await page.waitForLoadState('networkidle')

  console.log('2. Adding Matcha Cup and Vanilla Cone to cart in Kasir POS...')
  const matchaTile = page.locator('.product-tile').filter({ hasText: 'Matcha Cup' })
  await matchaTile.waitFor({ state: 'visible' })
  await matchaTile.click()

  const vanillaTile = page.locator('.product-tile').filter({ hasText: 'Vanilla Cone' })
  await vanillaTile.waitFor({ state: 'visible' })
  await vanillaTile.click()

  console.log('3. Completing checkout...')
  const payBtn = page.locator('.complete-sale-button')
  await payBtn.click()

  const confirmDialog = page.locator('.sale-modal')
  await confirmDialog.waitFor({ state: 'visible' })
  await confirmDialog.locator('.modal-primary').click()

  console.log('4. Closing receipt dialog...')
  const newSaleBtn = page.locator('button:has-text("Transaksi baru")')
  await newSaleBtn.waitFor({ state: 'visible' })
  await newSaleBtn.click()
  await page.waitForTimeout(300)

  console.log('5. Navigating to Laporan Keuangan > Penjualan Harian...')
  await page.click('button:has-text("Laporan Keuangan")')
  await page.waitForTimeout(300)
  await page.click('button[role="tab"]:has-text("Penjualan Harian")')
  await page.waitForTimeout(400)

  // Expand the first sale row
  console.log('6. Expanding transaction row in Daily Sales...')
  const saleSummary = page.locator('.daily-sale-summary').first()
  await saleSummary.waitFor({ state: 'visible' })

  // Screenshot: Before expand
  await page.screenshot({ path: path.join(outputDir, 'daily-sales-collapsed.png') })

  await saleSummary.click()
  await page.waitForTimeout(300)

  // Screenshot: Expanded sale showing items and cancel buttons
  const expandedDropdown = page.locator('.daily-sale-items-dropdown').first()
  await expandedDropdown.waitFor({ state: 'visible' })
  await page.screenshot({ path: path.join(outputDir, 'daily-sales-expanded-items.png') })
  console.log('Captured expanded items screenshot.')

  // Click cancel on Matcha Cup
  console.log('7. Clicking Batalkan on Matcha Cup...')
  const matchaEntry = page.locator('.daily-sale-item-entry').filter({ hasText: 'Matcha Cup' })
  const cancelBtn = matchaEntry.locator('.daily-sale-cancel-btn')
  await cancelBtn.click()

  // Wait for cancel modal
  const cancelModal = page.locator('.cancel-sale-modal')
  await cancelModal.waitFor({ state: 'visible' })
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(outputDir, 'cancel-sale-modal.png') })
  console.log('Captured cancel confirmation modal screenshot.')

  // Confirm cancellation
  console.log('8. Confirming cancellation...')
  const confirmCancelBtn = cancelModal.locator('button:has-text("Konfirmasi Batalkan")')
  await confirmCancelBtn.click()

  // Wait for notice toast
  const noticeToast = page.locator('.notice-toast')
  await noticeToast.waitFor({ state: 'visible', timeout: 3000 })
  await page.screenshot({ path: path.join(outputDir, 'cancel-sale-success-toast.png') })
  console.log('Captured cancel success toast screenshot.')

  // Close notice
  await page.locator('.notice-modal-btn').click()
  await page.waitForTimeout(300)

  // Screenshot: Daily sales after cancellation (only Vanilla Cone remains)
  await page.screenshot({ path: path.join(outputDir, 'daily-sales-after-cancellation.png') })
  console.log('Captured daily sales after cancellation screenshot.')

  // 9. Navigate to Katalog & Stok to verify stock
  console.log('9. Checking restored stock in Katalog & Stok...')
  await page.click('button:has-text("Katalog & Stok")')
  await page.waitForTimeout(400)
  const matchaCard = page.locator('.catalog-box-card').filter({ hasText: 'Matcha Cup' }).first()
  await matchaCard.waitFor({ state: 'visible' })
  await page.screenshot({ path: path.join(outputDir, 'catalog-stock-restored.png') })
  console.log('Captured catalog stock restored screenshot.')

  await browser.close()
  console.log('All end-to-end verification steps completed successfully!')
}

run().catch((err) => {
  console.error('Error in verification:', err)
  process.exit(1)
})
