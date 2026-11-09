import { test, expect } from '@playwright/test'

test('checkout updates stock, receipt, and finance revenue', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173')
  const tile = page.locator('.product-tile').filter({ hasText: 'Vanilla Cone' })
  await tile.click()
  await tile.click()
  await page.getByRole('button', { name: /Bayar Rp/ }).click()
  await page.getByRole('dialog', { name: 'Konfirmasi pembayaran' }).getByRole('button', { name: /Bayar Rp/ }).click()
  await expect(page.getByRole('dialog')).toContainText('Pembayaran berhasil')
  await expect(page.getByRole('dialog')).toContainText('Rp 12.000')
  await page.getByRole('button', { name: /^Transaksi baru/ }).click()
  await expect(page.locator('.product-tile').filter({ hasText: 'Vanilla Cone' }).locator('.stock-chip')).toHaveText('16')
  await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
  await expect(page.locator('.finance-page')).toContainText('Rp 51.000')
  await page.reload()
  await page.getByRole('button', { name: 'Kasir POS', exact: true }).click()
  await expect(page.locator('.product-tile').filter({ hasText: 'Vanilla Cone' }).locator('.stock-chip')).toHaveText('16')
})

test('cart cannot exceed physical stock', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173')
  const tile = page.locator('.product-tile').filter({ hasText: 'Strawberry Cup' })
  for (let i = 0; i < 12; i++) await tile.click()
  await expect(page.locator('.cart-line')).toHaveCount(1)
  await expect(page.locator('.notice-toast')).toContainText('Stok Strawberry Cup tidak mencukupi')
  await expect(page.locator('.cart-line .quantity-control b')).toHaveText('11')
})
