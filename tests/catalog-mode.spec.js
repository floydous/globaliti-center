import { test, expect } from '@playwright/test'

test.describe('Katalog: mode kartu dan tabel', () => {
  test('tombol mode berganti antara kartu besar dan tabel dengan aksi yang sama', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()

    // Bawaan: kartu besar
    await expect(page.locator('.catalog-boxes-grid')).toBeVisible()
    await expect(page.locator('.catalog-table')).toBeHidden()
    await expect(page.getByRole('button', { name: 'Kartu', exact: true })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Tabel', exact: true }).click()
    await expect(page.locator('.catalog-table')).toBeVisible()
    await expect(page.locator('.catalog-boxes-grid')).toBeHidden()
    await expect(page.locator('.catalog-table tbody tr')).toHaveCount(36)
    await expect(page.getByRole('button', { name: 'Tabel', exact: true })).toHaveAttribute('aria-pressed', 'true')

    // Pencarian tetap berlaku di tabel
    await page.getByRole('textbox', { name: 'Cari produk katalog' }).fill('Durian')
    await expect(page.locator('.catalog-table tbody tr')).toHaveCount(3)

    // Aksi baris membuka dialog yang sama dengan kartu
    await page.locator('.catalog-table tbody tr').first().getByRole('button', { name: 'Sesuaikan stok' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Batal' }).click()

    await page.getByRole('button', { name: 'Kartu', exact: true }).click()
    await expect(page.locator('.catalog-boxes-grid')).toBeVisible()
    await expect(page.locator('.catalog-box-card')).toHaveCount(3)
  })
})
