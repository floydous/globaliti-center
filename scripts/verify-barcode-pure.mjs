import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const artifactDir = path.resolve('C:/Users/brat/.gemini/antigravity/brain/bae368b1-7950-4b22-a3e9-ab528fe59e28')

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
  })
  const page = await context.newPage()

  console.log('Navigating to http://127.0.0.1:4173...')
  await page.goto('http://127.0.0.1:4173')

  console.log('Navigating to Katalog & Stok...')
  await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()

  // Add Matcha Cup with generated barcode
  console.log('Adding product with generated barcode: Matcha Cup...')
  await page.getByRole('button', { name: 'Tambah Produk', exact: true }).click()
  const formModal = page.getByRole('dialog')
  await formModal.getByRole('button', { name: 'Buat barcode' }).click()
  const generatedCode = await formModal.locator('input[name="barcode"]').inputValue()
  await formModal.locator('input[name="name"]').fill('Matcha Cup')
  await formModal.locator('input[name="price"]').fill('8000')
  await formModal.locator('input[name="stock"]').fill('24')
  await formModal.getByRole('button', { name: 'Simpan produk' }).click()

  // Open Cetak Barcode dialog
  console.log('Opening Cetak barcode dialog...')
  await page.getByRole('button', { name: 'Cetak barcode', exact: true }).click()
  const barcodeDialog = page.getByRole('dialog', { name: 'Cetak barcode kasir' })
  await barcodeDialog.waitFor({ state: 'visible' })

  // Verify Matcha Cup is selected
  const matchaCheckbox = barcodeDialog.getByRole('checkbox', { name: /Matcha Cup/i })
  const isChecked = await matchaCheckbox.isChecked()
  console.log('Is Matcha Cup checkbox checked by default?', isChecked)
  if (!isChecked) {
    await matchaCheckbox.check()
  }

  // Switch to Pratinjau Lembar
  console.log('Switching to Pratinjau Lembar tab...')
  await barcodeDialog.getByRole('tab', { name: /Pratinjau Lembar/ }).click()

  // Verify preview sheet has no text whatsoever
  const previewSheet = barcodeDialog.locator('.barcode-preview-sheet')
  await previewSheet.waitFor({ state: 'visible' })
  const sheetText = (await previewSheet.innerText()).trim()
  console.log(`Sheet inner text: "${sheetText}"`)
  if (sheetText.length > 0) {
    throw new Error(`Expected preview sheet to have NO text, but found: "${sheetText}"`)
  }

  const svgCount = await previewSheet.locator(`svg[aria-label="Barcode ${generatedCode}"]`).count()
  console.log(`Barcode SVG count in preview: ${svgCount}`)
  if (svgCount === 0) {
    throw new Error('Expected barcode SVG to be rendered in preview')
  }

  const svgTextCount = await previewSheet.locator('svg text').count()
  console.log(`SVG <text> element count in preview: ${svgTextCount}`)
  if (svgTextCount > 0) {
    throw new Error(`Expected 0 <text> tags in barcode SVG, but found ${svgTextCount}`)
  }

  // Take screenshot of preview sheet
  const previewScreenshotPath = path.join(artifactDir, 'barcode-preview-pure.png')
  await page.screenshot({ path: previewScreenshotPath })
  console.log('Saved preview screenshot to:', previewScreenshotPath)

  // Test Download PNG
  console.log('Testing PNG Download...')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    barcodeDialog.getByRole('button', { name: /Unduh Gambar \(PNG\)/ }).click(),
  ])

  const downloadedFilename = download.suggestedFilename()
  console.log(`Downloaded filename: ${downloadedFilename}`)
  const expectedFilename = 'barcode-Matcha Cup.png'
  if (downloadedFilename !== expectedFilename) {
    throw new Error(`Expected filename "${expectedFilename}", but got "${downloadedFilename}"`)
  }

  const downloadPath = path.join(artifactDir, downloadedFilename)
  await download.saveAs(downloadPath)
  console.log(`Saved downloaded barcode image to: ${downloadPath}`)

  // Clean up
  await barcodeDialog.getByRole('button', { name: 'Tutup' }).click()
  const createdCard = page.locator('.catalog-box-card').filter({ hasText: 'Matcha Cup' }).first()
  if (await createdCard.isVisible()) {
    await createdCard.locator('.box-btn-delete').click()
    const deleteModal = page.getByRole('dialog', { name: /Hapus produk/ })
    await deleteModal.getByRole('button', { name: 'Hapus produk', exact: true }).click()
  }

  await browser.close()
  console.log('Verification script completed successfully!')
}

run().catch((err) => {
  console.error('Verification failed:', err)
  process.exit(1)
})
