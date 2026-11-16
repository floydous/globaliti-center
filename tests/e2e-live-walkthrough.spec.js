import { test, expect } from '@playwright/test'

test('Comprehensive E2E interactive walkthrough across all features', async ({ page }) => {
  // 1. POS Kasir
  console.log('1. Loading application at http://127.0.0.1:4173/ ...')
  await page.goto('http://127.0.0.1:4173')
  await expect(page.getByRole('heading', { name: 'Kasir Toko' })).toBeVisible()

  console.log('   - Adding Vanilla Cone to cart...')
  const productTile = page.locator('.product-tile').filter({ hasText: 'Vanilla Cone' })
  await expect(productTile).toBeVisible()
  await productTile.click()

  console.log('   - Increasing quantity in cart...')
  await page.getByRole('button', { name: 'Tambah Vanilla Cone' }).click()

  const cartItem = page.locator('.cart-line').first()
  await expect(cartItem).toBeVisible()
  await expect(cartItem).toContainText('Vanilla Cone')

  console.log('   - Selecting payment method and completing checkout...')
  await page.getByRole('button', { name: /Bayar Rp/ }).click()
  const confirmDialog = page.getByRole('dialog', { name: 'Konfirmasi pembayaran' })
  await expect(confirmDialog).toBeVisible()
  await confirmDialog.getByRole('button', { name: /Bayar Rp/ }).click()

  console.log('   - Verifying receipt dialog...')
  await expect(page.getByRole('dialog')).toContainText('Pembayaran berhasil')
  await page.getByRole('button', { name: /^Transaksi baru/ }).click()

  // 2. Katalog & Stok
  console.log('2. Navigating to Katalog & Stok...')
  await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()
  await expect(page.locator('.catalog-boxes-grid')).toBeVisible()

  console.log('   - Testing view mode switch (Table vs Card)...')
  await page.getByRole('button', { name: 'Tabel', exact: true }).click()
  await expect(page.locator('.catalog-table')).toBeVisible()
  await expect(page.locator('.catalog-boxes-grid')).toBeHidden()

  await page.getByRole('button', { name: 'Kartu', exact: true }).click()
  await expect(page.locator('.catalog-boxes-grid')).toBeVisible()

  console.log('   - Testing sorting by active and inactive products...')
  const sortSelect = page.getByRole('combobox', { name: 'Urutkan produk' })
  await sortSelect.selectOption({ label: 'Produk nonaktif di atas' })
  await page.waitForTimeout(200)
  await sortSelect.selectOption({ label: 'Produk aktif di atas' })
  await page.waitForTimeout(200)

  console.log('   - Opening and closing Cetak Barcode dialog...')
  const barcodeBtn = page.getByRole('button', { name: 'Cetak barcode' })
  if (await barcodeBtn.count() > 0) {
    await barcodeBtn.click()
    const printDialog = page.getByRole('dialog', { name: 'Cetak barcode kasir' })
    await expect(printDialog).toBeVisible()
    await printDialog.getByRole('button', { name: 'Tutup' }).click()
    await expect(printDialog).toHaveCount(0)
  }

  // 3. Laporan Keuangan SAK EMKM
  console.log('3. Navigating to Laporan Keuangan SAK EMKM...')
  await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
  await expect(page.locator('.finance-page')).toBeVisible()

  console.log('   - Verifying Laba Rugi tab statement table...')
  await expect(page.locator('.statement-table')).toBeVisible()

  console.log('   - Navigating to Posisi Keuangan (Neraca) tab...')
  await page.getByRole('tab', { name: 'Posisi Keuangan (Neraca)' }).click()
  await expect(page.locator('.finance-page')).toContainText('Kas dan Setara Kas')

  console.log('   - Navigating to Penjualan Harian tab...')
  await page.getByRole('tab', { name: 'Penjualan Harian' }).click()
  await expect(page.locator('.daily-summary')).toBeVisible()

  // 4. Pengaturan, 7-Day Rolling Backups & Zona Berbahaya
  console.log('4. Navigating to Pengaturan...')
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click()
  await expect(page.locator('.settings-page')).toBeVisible()

  console.log('   - Verifying 7-Day Rolling Backup slots in Settings...')
  const backupBox = page.locator('.backup-rotation-box')
  await expect(backupBox).toBeVisible()
  const slotCards = backupBox.locator('.backup-slot-card')
  expect(await slotCards.count()).toBe(7)

  console.log('   - Clicking "Cadangkan Hari Ini Sekarang"...')
  const backupNowBtn = page.getByRole('button', { name: 'Cadangkan Hari Ini Sekarang' })
  await backupNowBtn.click()
  await expect(page.locator('.save-toast')).toContainText('berhasil')

  console.log('   - Verifying Zona Berbahaya and cancellation safety...')
  const dangerZone = page.locator('.settings-danger-card')
  await expect(dangerZone).toBeVisible()
  await dangerZone.getByRole('button', { name: 'Reset Data Keuangan' }).click()

  const modal = page.getByRole('dialog', { name: 'Reset seluruh data keuangan' })
  await expect(modal).toBeVisible()
  await modal.getByRole('button', { name: 'Batal' }).click()
  await expect(modal).toHaveCount(0)

  console.log('>> ALL END-TO-END INTERACTIVE ACTIONS COMPLETED SUCCESSFULLY!')
})
