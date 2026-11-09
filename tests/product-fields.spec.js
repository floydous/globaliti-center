import { test, expect } from '@playwright/test'

test.describe('Konsep kategori, unit, dan harga modal dihapus', () => {
  test('form produk tidak punya field Kategori, Unit, atau Harga modal', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()
    await page.getByRole('button', { name: 'Tambah Produk', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).not.toContainText('Kategori')
    await expect(dialog).not.toContainText('Unit')
    await expect(dialog).not.toContainText('Harga modal')

    // Yang tersisa memang masih ada.
    await expect(dialog).toContainText('Barcode produk')
    await expect(dialog).toContainText('Nama produk')
    await expect(dialog).toContainText('Harga jual')
    await expect(dialog).toContainText('Stok awal')
  })

  test('kartu katalog tidak menampilkan badge kategori, modal, atau margin', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()

    const card = page.locator('.catalog-box-card').filter({ hasText: 'Matcha Cup' })
    await expect(card).toBeVisible()
    await expect(card.locator('.box-category-badge')).toHaveCount(0)
    await expect(card.locator('.box-cost-val')).toHaveCount(0)
    await expect(card.locator('.box-margin-val')).toHaveCount(0)
    await expect(card).not.toContainText('Es krim')
    await expect(card).not.toContainText('Modal')
  })

  test('catatan beban tidak memakai kategori, kolomnya dihapus dari tabel', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
    await page.getByRole('tab', { name: 'Beban Operasional' }).click()

    await expect(page.locator('.finance-simple-table thead')).not.toContainText('Kategori')
  })

  test('modal Catat Beban tidak punya pilihan kategori', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
    await page.getByRole('button', { name: 'Catat Beban', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).not.toContainText('Kategori')
  })

  test('produk tersimpan tanpa field kategori, unit, dan harga modal', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()
    await page.getByRole('button', { name: 'Tambah Produk', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await dialog.locator('input[name="barcode"]').fill('8991111222333')
    await dialog.locator('input[name="name"]').fill('Uji Produk')
    await dialog.getByRole('button', { name: 'Simpan produk' }).click()

    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('globaliti_store_v1')).data.products
    )
    const created = stored.find((p) => p.name === 'Uji Produk')
    expect(created).toBeTruthy()
    expect(created).not.toHaveProperty('category')
    expect(created).not.toHaveProperty('unit')
    expect(created).not.toHaveProperty('cost')
  })

  test('data lama dengan field yang dihapus tetap dimuat dan dibersihkan', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('globaliti_store_v1', JSON.stringify({
        version: 1,
        savedAt: '2026-10-01T00:00:00.000Z',
        data: {
          products: [{
            id: 'p1', barcode: '8990000000010', name: 'Matcha Cup',
            category: 'Es krim', unit: 'cup', price: 8000, cost: 4500,
            stock: 24, reorderPoint: 8, active: true,
          }],
          sales: [],
          expenses: [{
            id: 'exp-1', label: 'Beli Kertas', category: 'Bahan Habis Pakai',
            amount: 96000, date: '2026-09-17',
          }],
          aiMessages: [],
        },
      }))
    })
    await page.goto('http://127.0.0.1:4173')

    // Tidak ada error penyimpanan dan produk tetap tampil.
    await expect(page.locator('.storage-warning')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Matcha Cup/ }).first()).toBeVisible()

    // Field yang sudah dihapus dibuang saat disimpan ulang.
    await page.waitForTimeout(300)
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('globaliti_store_v1')).data
    )
    expect(stored.products[0]).not.toHaveProperty('category')
    expect(stored.products[0]).not.toHaveProperty('unit')
    expect(stored.products[0]).not.toHaveProperty('cost')
    expect(stored.expenses[0]).not.toHaveProperty('category')
  })
})
