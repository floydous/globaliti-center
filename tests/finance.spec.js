import { test, expect } from '@playwright/test'

test('finance statements balance and reflect payment reality', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('globaliti_store_v1', JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      data: {
        products: [],
        sales: [
          { id: 'TRX-0001', sample: true, date: new Date().toISOString().slice(0, 10), time: '08:14', items: [{ productId: 'p1', quantity: 2, price: 8000 }], total: 16000, payment: 'Tunai' },
          { id: 'TRX-0002', sample: true, date: new Date().toISOString().slice(0, 10), time: '09:02', items: [{ productId: 'p3', quantity: 1, price: 5000 }], total: 5000, payment: 'QRIS' },
          { id: 'TRX-0003', sample: true, date: new Date().toISOString().slice(0, 10), time: '10:26', items: [{ productId: 'p2', quantity: 3, price: 6000 }], total: 18000, payment: 'Tunai' },
        ],
        expenses: [
          { id: 'exp-1', sample: true, label: 'Pembelian Kertas HVS A4 2 Rim', amount: 96000, date: new Date().toISOString().slice(0, 10) },
          { id: 'exp-2', sample: true, label: 'Cup dan Sedotan Es Krim', amount: 150000, date: new Date(Date.now() - 86400000).toISOString().slice(0, 10) },
        ],
        aiMessages: [],
      },
    }))
  })
  await page.goto('http://127.0.0.1:4173')
  await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
  const parse = async (label) => {
    const text = await page.locator('.statement-row').filter({ hasText: label }).locator('strong, span').last().innerText()
    const num = Number(text.replace(/[^\d]/g, ''))
    return text.includes('-') ? -num : num
  }
  const iceCream = await parse('Penjualan Es Krim')
  const total = await parse('Total Pendapatan Usaha')
  expect(iceCream).toBe(total)
  // Laba rugi satu langkah: Total Beban Usaha = HPP + beban operasional (22.230 + 246.000), tanpa Laba Bruto
  const totalBeban = await parse('Total Beban Usaha')
  expect(totalBeban).toBe(22230 + 246000)
  await expect(page.locator('.finance-page')).not.toContainText('Laba Bruto')
  await page.locator('.sidebar-subnav').getByRole('button', { name: 'Posisi Keuangan (Neraca)' }).click()
  const kas = await parse('Kas dan Setara Kas')
  const persediaan = await parse('Persediaan Barang Dagang')
  const aset = await parse('Jumlah Aset')
  expect(kas + persediaan).toBe(aset)
  const liabilitasEkuitas = await parse('Jumlah Liabilitas & Ekuitas')
  expect(liabilitasEkuitas).toBe(aset)
  await page.locator('.sidebar-subnav').getByRole('button', { name: 'Beban Operasional', exact: true }).click()
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
