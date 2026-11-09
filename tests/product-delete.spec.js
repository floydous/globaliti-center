import { test, expect } from '@playwright/test'

test.describe('Hapus produk dari katalog', () => {
  test('produk bawaan dihapus setelah konfirmasi dan tetap hilang setelah reload', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    // Produk masuk keranjang lebih dulu: ikut hilang dari keranjang saat dihapus
    await page.locator('.product-tile').filter({ hasText: 'Vanilla Cone' }).click()
    await expect(page.locator('.cart-line')).toHaveCount(1)

    await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()
    await page.getByRole('button', { name: 'Hapus produk Vanilla Cone dari katalog' }).click()
    // Batal tidak menghapus apa pun
    await page.getByRole('dialog').getByRole('button', { name: 'Batal' }).click()
    await expect(page.locator('.catalog-box-card')).toHaveCount(36)

    await page.getByRole('button', { name: 'Hapus produk Vanilla Cone dari katalog' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Hapus produk', exact: true }).click()
    await expect(page.locator('.catalog-box-card')).toHaveCount(35)
    await expect(page.locator('.catalog-box-card').filter({ hasText: 'Vanilla Cone' })).toHaveCount(0)

    await page.reload()
    await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()
    await expect(page.locator('.catalog-box-card')).toHaveCount(35)
    await page.getByRole('button', { name: 'Kasir POS', exact: true }).click()
    await expect(page.locator('.product-tile').filter({ hasText: 'Vanilla Cone' })).toHaveCount(0)
    await expect(page.locator('.cart-line')).toHaveCount(0)
  })

  test('riwayat penjualan tetap ada dan menandai produk yang sudah dihapus', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()
    await page.getByRole('button', { name: 'Hapus produk Vanilla Cone dari katalog' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Hapus produk', exact: true }).click()

    await page.getByRole('button', { name: 'Kasir POS', exact: true }).click()
    await expect(page.locator('.recent-sales')).toContainText('3x Produk dihapus')
    await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
    await page.getByRole('tab', { name: 'Penjualan Harian' }).click()
    await expect(page.locator('.daily-sales')).toContainText('Produk dihapus')
  })

  test('tombol hapus juga tersedia di tampilan tabel', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()
    await page.getByRole('button', { name: 'Tabel', exact: true }).click()
    await page.getByRole('button', { name: 'Hapus produk Matcha Cup dari katalog' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Hapus produk', exact: true }).click()
    await expect(page.locator('.catalog-table tbody tr')).toHaveCount(35)
  })
})
