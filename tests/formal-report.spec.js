import { test, expect } from '@playwright/test'

test('formal financial report preview displays authentic SAK EMKM statements and signatures', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173')
  await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()

  // Verify buttons in finance header
  const cetakBtn = page.getByRole('button', { name: 'Cetak Laporan', exact: true })
  const pratinjauBtn = page.getByRole('button', { name: 'Pratinjau Dokumen', exact: true })
  await expect(cetakBtn).toBeVisible()
  await expect(pratinjauBtn).toBeVisible()

  // Open Preview Modal
  await pratinjauBtn.click()
  const modal = page.getByRole('dialog', { name: 'Pratinjau Dokumen Laporan Keuangan' })
  await expect(modal).toBeVisible()

  // Check Kop Surat
  await expect(modal.locator('.formal-kop-school')).toHaveText('SMKS TI BALI GLOBAL DENPASAR')
  await expect(modal.locator('.formal-kop-unit')).toContainText('GLOBALITI CREATIVE CENTER')
  const logo = modal.locator('.formal-kop-logo img')
  await expect(logo).toBeVisible()
  expect(await logo.getAttribute('src')).toBe('/globaliti-creative-center-icon.png')

  // Check Table Headers alignment matching values below
  const thCat = modal.locator('.formal-accounting-table th.text-center').first()
  const tdCat = modal.locator('.formal-accounting-table td.text-center').first()
  expect(await thCat.evaluate((el) => window.getComputedStyle(el).textAlign)).toBe('center')
  expect(await tdCat.evaluate((el) => window.getComputedStyle(el).textAlign)).toBe('center')

  const thRincian = modal.locator('.formal-accounting-table th.text-right').first()
  const tdRincian = modal.locator('.formal-accounting-table td.text-right').first()
  expect(await thRincian.evaluate((el) => window.getComputedStyle(el).textAlign)).toBe('right')
  expect(await tdRincian.evaluate((el) => window.getComputedStyle(el).textAlign)).toBe('right')

  const thJumlah = modal.locator('.formal-accounting-table th.text-right').nth(1)
  expect(await thJumlah.evaluate((el) => window.getComputedStyle(el).textAlign)).toBe('right')

  // Check Document Title & Metadata
  await expect(modal.locator('.formal-doc-main-title')).toHaveText('LAPORAN KEUANGAN PERTANGGUNGJAWABAN')
  await expect(modal.locator('.formal-doc-subtitle')).toContainText('SAK EMKM')

  // Check Laporan Laba Rugi
  await expect(modal.locator('.formal-statement-heading h3').first()).toHaveText('I. LAPORAN LABA RUGI')
  await expect(modal).toContainText('A. PENDAPATAN USAHA')
  await expect(modal).toContainText('B. BEBAN POKOK PENJUALAN (HPP)')
  await expect(modal).toContainText('C. BEBAN OPERASIONAL TOKO')
  await expect(modal).toContainText('LABA BERSIH TAHUN / PERIODE BERJALAN')

  // Check Neraca (Posisi Keuangan)
  await expect(modal.locator('.formal-statement-heading h3').nth(1)).toHaveText('II. LAPORAN POSISI KEUANGAN (NERACA)')
  await expect(modal).toContainText('ASET (AKTIVA)')
  await expect(modal).toContainText('LIABILITAS & EKUITAS (PASIVA)')
  await expect(modal).toContainText('Kas dan Setara Kas')
  await expect(modal).toContainText('Persediaan Barang Dagangan (Stok Es Krim)')
  await expect(modal).toContainText('JUMLAH ASET')
  await expect(modal).toContainText('JUMLAH LIABILITAS & EKUITAS')
  await expect(modal.locator('.formal-balance-validation')).toContainText('SEIMBANG (BALANCED)')

  // Check Catatan Ringkas (CALK)
  await expect(modal).toContainText('III. CATATAN RINGKAS OPERASIONAL (CALK EMKM)')

  // Signatures should be removed completely as requested
  await expect(modal).not.toContainText('Dibuat oleh')
  await expect(modal).not.toContainText('Diperiksa oleh')
  await expect(modal).not.toContainText('Mengetahui & Menyetujui')
  await expect(modal).not.toContainText('Drs. I Ketut Supardi, M.Pd.')
  await expect(modal).not.toContainText('I Made Arisutha, S.Pd., M.Kom.')

  // Verify Kop Surat body is centered identically to the title block
  const kopBox = await modal.locator('.formal-kop-body').boundingBox()
  const titleBox = await modal.locator('.formal-title-block').boundingBox()
  if (kopBox && titleBox) {
    const kopCenter = kopBox.x + kopBox.width / 2
    const titleCenter = titleBox.x + titleBox.width / 2
    expect(Math.abs(kopCenter - titleCenter)).toBeLessThan(1.0)
  }

  // Close modal
  await modal.getByRole('button', { name: 'Tutup' }).click()
  await expect(modal).toBeHidden()
})

test('print media emulates clean formal document without web application UI', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173')
  await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()

  // Emulate print media
  await page.emulateMedia({ media: 'print' })

  // Web application UI must be hidden
  await expect(page.locator('.sidebar')).toBeHidden()
  await expect(page.locator('.topbar-globaliti')).toBeHidden()
  await expect(page.locator('.finance-header')).toBeHidden()
  await expect(page.locator('.finance-tabs')).toBeHidden()
  await expect(page.locator('.finance-card')).toBeHidden()

  // The formal document must be visible
  const printDoc = page.locator('.formal-report-print-target .formal-report-document')
  await expect(printDoc).toBeVisible()
  await expect(printDoc.locator('.formal-kop-school')).toHaveText('SMKS TI BALI GLOBAL DENPASAR')
  await expect(printDoc.locator('.formal-doc-main-title')).toHaveText('LAPORAN KEUANGAN PERTANGGUNGJAWABAN')
  await expect(printDoc).toContainText('I. LAPORAN LABA RUGI')
  await expect(printDoc).toContainText('II. LAPORAN POSISI KEUANGAN (NERACA)')
  await expect(printDoc).toContainText('SEIMBANG (BALANCED)')
  await expect(printDoc).not.toContainText('Mengetahui & Menyetujui')

  // Switch back to screen
  await page.emulateMedia({ media: 'screen' })
  await expect(page.locator('.sidebar')).toBeVisible()
  await expect(page.locator('.finance-header')).toBeVisible()
})
