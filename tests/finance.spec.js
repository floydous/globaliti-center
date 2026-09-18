import { test, expect } from '@playwright/test'

test('finance statements balance and reflect payment reality', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173')
  await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
  const parse = (label) =>
    page.locator('.statement-row').filter({ hasText: label }).locator('strong, span').last().innerText()
  const iceCream = Number((await parse('Penjualan Es Krim')).replace(/[^\d]/g, ''))
  const print = Number((await parse('Pendapatan Jasa Print Word')).replace(/[^\d]/g, ''))
  const total = Number((await parse('Total Pendapatan Usaha')).replace(/[^\d]/g, ''))
  expect(iceCream + print).toBe(total)
  await page.getByRole('tab', { name: 'Posisi Keuangan (Neraca)' }).click()
  const kas = Number((await parse('Kas dan Setara Kas')).replace(/[^\d]/g, ''))
  const piutang = Number((await parse('Piutang Jasa Print')).replace(/[^\d]/g, ''))
  const persediaan = Number((await parse('Persediaan Barang Dagang')).replace(/[^\d]/g, ''))
  const aset = Number((await parse('Jumlah Aset')).replace(/[^\d]/g, ''))
  expect(kas + piutang + persediaan).toBe(aset)
  const liabilitasEkuitas = Number((await parse('Jumlah Liabilitas & Ekuitas')).replace(/[^\d]/g, ''))
  expect(liabilitasEkuitas).toBe(aset)
  // PRINT-0002 (Rp 2.000, postpaid, printed) must be receivable, not revenue
  expect(piutang).toBeGreaterThanOrEqual(2000)
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
