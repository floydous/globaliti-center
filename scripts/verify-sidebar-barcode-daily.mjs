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

  console.log('1. Navigating to http://127.0.0.1:4173...')
  await page.goto('http://127.0.0.1:4173')
  await page.waitForLoadState('networkidle')

  // --- Requirement 1: Sidebar subpages for Laporan Keuangan ---
  console.log('2. Verifying sidebar subpages for Laporan Keuangan...')
  const financeParent = page.getByRole('button', { name: 'Laporan Keuangan', exact: true })
  await expectVisible(financeParent, 'Finance parent button')

  const subnav = page.locator('.sidebar-subnav')
  await expectVisible(subnav, 'Sidebar subnav container')

  const labaRugiSub = subnav.locator('.nav-subitem', { hasText: 'Laba Rugi' })
  const neracaSub = subnav.locator('.nav-subitem', { hasText: 'Posisi Keuangan (Neraca)' })
  const penjualanSub = subnav.locator('.nav-subitem', { hasText: 'Penjualan Harian' })
  const bebanSub = subnav.locator('.nav-subitem', { hasText: 'Beban Operasional' })

  await expectVisible(labaRugiSub, 'Laba Rugi subitem')
  await expectVisible(neracaSub, 'Neraca subitem')
  await expectVisible(penjualanSub, 'Penjualan Harian subitem')
  await expectVisible(bebanSub, 'Beban Operasional subitem')

  // Click Posisi Keuangan (Neraca) from sidebar
  console.log('Clicking Posisi Keuangan (Neraca) from sidebar...')
  await neracaSub.click()
  await page.waitForTimeout(300)

  // Verify Neraca is displayed and neraca subitem has active class
  const isNeracaActive = await neracaSub.evaluate((el) => el.classList.contains('active'))
  console.log('Is Neraca subitem active?', isNeracaActive)
  if (!isNeracaActive) throw new Error('Neraca subitem should have active class')

  const sidebarScreenshot = path.join(outputDir, 'sidebar-finance-children.png')
  await page.screenshot({ path: sidebarScreenshot })
  console.log('Captured sidebar screenshot:', sidebarScreenshot)

  // --- Requirement 2: Penjualan Harian default filter is "Hari Ini" ---
  console.log('3. Navigating to Penjualan Harian via sidebar subitem...')
  await penjualanSub.click()
  await page.waitForTimeout(300)

  // Verify that "Hari ini" button is active by default
  const todayBtn = page.getByRole('button', { name: 'Hari ini', exact: true })
  await expectVisible(todayBtn, 'Hari ini button')
  const isTodayActive = await todayBtn.evaluate((el) => el.classList.contains('active') && el.getAttribute('aria-pressed') === 'true')
  console.log('Is "Hari ini" filter active by default?', isTodayActive)
  if (!isTodayActive) throw new Error('Default date filter in Penjualan Harian must be "Hari ini"')

  const dailyScreenshot = path.join(outputDir, 'daily-sales-default-today.png')
  await page.screenshot({ path: dailyScreenshot })
  console.log('Captured Daily Sales screenshot:', dailyScreenshot)

  // --- Requirement 3: Barcode dialog has preview and download, NO direct print ---
  console.log('4. Navigating to Katalog & Stok...')
  await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()
  await page.waitForTimeout(300)

  // Ensure at least one product has a generated valid EAN-13 barcode
  console.log('Creating a product with generated EAN-13 barcode...')
  await page.getByRole('button', { name: 'Tambah Produk', exact: true }).click()
  const formModal = page.getByRole('dialog')
  await formModal.getByRole('button', { name: 'Buat barcode' }).click()
  await formModal.locator('input[name="name"]').fill('Es Lilin Pelangi')
  await formModal.locator('input[name="price"]').fill('3000')
  await formModal.locator('input[name="stock"]').fill('50')
  await formModal.getByRole('button', { name: 'Simpan produk' }).click()
  await page.waitForTimeout(300)

  console.log('Opening Cetak Barcode dialog...')
  await page.getByRole('button', { name: 'Cetak barcode' }).click()
  const barcodeDialog = page.getByRole('dialog', { name: 'Cetak barcode kasir' })
  await expectVisible(barcodeDialog, 'Barcode dialog')

  // Switch to Pratinjau Lembar
  console.log('Switching to Pratinjau Lembar tab...')
  const previewTab = barcodeDialog.getByRole('tab', { name: /Pratinjau Lembar/ })
  await previewTab.click()
  await page.waitForTimeout(400)

  // Verify preview sheet is visible
  const previewSheet = barcodeDialog.locator('.barcode-preview-sheet')
  await expectVisible(previewSheet, 'Barcode preview sheet')

  // Verify only image download button exists (NO PDF download, NO direct print)
  const downloadPngBtn = barcodeDialog.getByRole('button', { name: /Unduh Gambar \(PNG\)/ })
  await expectVisible(downloadPngBtn, 'Unduh Gambar PNG button')

  const pdfBtnCount = await barcodeDialog.locator('button:has-text("PDF")').count()
  console.log('PDF download button count:', pdfBtnCount)
  if (pdfBtnCount > 0) throw new Error('PDF download button should NOT exist')

  // Verify NO direct "Cetak" button exists
  const directPrintBtn = barcodeDialog.locator('button:has-text("Cetak (")')
  const printBtnCount = await directPrintBtn.count()
  console.log('Direct print button count:', printBtnCount)
  if (printBtnCount > 0) throw new Error('Direct print button should NOT exist in barcode dialog')

  const barcodeScreenshot = path.join(outputDir, 'barcode-preview-and-download.png')
  await page.screenshot({ path: barcodeScreenshot })
  console.log('Captured Barcode Preview screenshot:', barcodeScreenshot)

  await barcodeDialog.getByRole('button', { name: 'Tutup' }).click()
  await page.waitForTimeout(300)

  // Clean up: delete test product
  const createdCard = page.locator('.catalog-box-card').filter({ hasText: 'Es Lilin Pelangi' }).first()
  if (await createdCard.isVisible()) {
    await createdCard.locator('.box-btn-delete').click()
    const deleteModal = page.getByRole('dialog', { name: /Hapus produk/ })
    await deleteModal.getByRole('button', { name: 'Hapus produk', exact: true }).click()
    await page.waitForTimeout(300)
  }

  await browser.close()
  console.log('All verifications completed successfully!')
}

async function expectVisible(locator, desc) {
  const visible = await locator.isVisible()
  if (!visible) throw new Error(`Expected ${desc} to be visible`)
}

run().catch((err) => {
  console.error('Error running verification:', err)
  process.exit(1)
})
