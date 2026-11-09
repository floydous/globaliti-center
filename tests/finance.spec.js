import { test, expect } from '@playwright/test'

test('finance statements balance and reflect payment reality', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173')
  await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
  const parse = (label) =>
    page.locator('.statement-row').filter({ hasText: label }).locator('strong, span').last().innerText()
  const iceCream = Number((await parse('Penjualan Es Krim')).replace(/[^\d]/g, ''))
  const total = Number((await parse('Total Pendapatan Usaha')).replace(/[^\d]/g, ''))
  expect(iceCream).toBe(total)
  // Laba rugi satu langkah: Total Beban Usaha = HPP + beban operasional (22.230 + 246.000), tanpa Laba Bruto
  const totalBeban = Number((await parse('Total Beban Usaha')).replace(/[^\d]/g, ''))
  expect(totalBeban).toBe(22230 + 246000)
  await expect(page.locator('.finance-page')).not.toContainText('Laba Bruto')
  await page.getByRole('tab', { name: 'Posisi Keuangan (Neraca)' }).click()
  const kas = Number((await parse('Kas dan Setara Kas')).replace(/[^\d]/g, ''))
  const persediaan = Number((await parse('Persediaan Barang Dagang')).replace(/[^\d]/g, ''))
  const aset = Number((await parse('Jumlah Aset')).replace(/[^\d]/g, ''))
  expect(kas + persediaan).toBe(aset)
  const liabilitasEkuitas = Number((await parse('Jumlah Liabilitas & Ekuitas')).replace(/[^\d]/g, ''))
  expect(liabilitasEkuitas).toBe(aset)
  await page.getByRole('tab', { name: 'Beban Operasional', exact: true }).click()
  await expect(page.locator('.finance-simple-table')).toContainText('Pembelian Kertas HVS A4 2 Rim')
})

test('recording an expense updates the income statement', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173')
  await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
  await page.getByRole('button', { name: 'Catat Beban', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Keperluan Beban').fill('Tes Beban Playwright')
  await dialog.getByLabel('Nominal (Rp)').fill('2500')
  await dialog.getByRole('button', { name: 'Simpan Beban', exact: true }).click()
  await expect(page.locator('.finance-page')).toContainText('Tes Beban Playwright')
  await page.reload()
  await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
  await expect(page.locator('.finance-page')).toContainText('Tes Beban Playwright')
})
