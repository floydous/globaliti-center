import { test, expect } from '@playwright/test'

test('completing a postpaid print does not invent a payment', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173')
  await page.getByRole('button', { name: 'Jasa Print Word', exact: true }).click()
  const row = page.locator('.print-order-row').filter({ hasText: 'Lampiran_Tugas.docx' })
  await row.getByRole('button', { name: 'Selesai', exact: true }).click()
  await expect(row.locator('.payment-pill')).toHaveText('Bayar di akhir')
  await page.reload()
  await page.getByRole('button', { name: 'Jasa Print Word', exact: true }).click()
  await expect(row.locator('.payment-pill')).toHaveText('Bayar di akhir')
  await row.getByRole('button', { name: 'Tandai lunas', exact: true }).click()
  await expect(row.locator('.payment-pill')).toHaveText('Lunas setelah cetak')
  await page.reload()
  await page.getByRole('button', { name: 'Jasa Print Word', exact: true }).click()
  await expect(row.locator('.payment-pill')).toHaveText('Lunas setelah cetak')
})
