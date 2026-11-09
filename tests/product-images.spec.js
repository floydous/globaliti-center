import { test, expect } from '@playwright/test'

test.describe('Aice Product Catalog & Images', () => {
  test('POS grid renders authentic Aice products and images load successfully', async ({ page }) => {
    const failedUrls = []
    page.on('response', (res) => {
      if (res.url().includes('/products/') && !res.ok()) {
        failedUrls.push(res.url())
      }
    })

    await page.goto('http://127.0.0.1:4173')

    const tiles = page.locator('.product-tile')
    await expect(tiles).toHaveCount(36)

    // Check specific popular Aice products
    await expect(page.locator('.product-tile').filter({ hasText: 'Matcha Cup' })).toBeVisible()
    await expect(page.locator('.product-tile').filter({ hasText: 'Vanilla Cone' })).toBeVisible()
    await expect(page.locator('.product-tile').filter({ hasText: 'Aice Jagung Sweet Corn' })).toBeVisible()
    await expect(page.locator('.product-tile').filter({ hasText: 'Aice Mochi Milk Tea' })).toBeVisible()
    await expect(page.locator('.product-tile').filter({ hasText: 'Aice Durian Asli' })).toBeVisible()

    // Test search filter in POS
    const searchInput = page.getByRole('textbox', { name: 'Cari produk' })
    await searchInput.fill('Durian')
    const durianTiles = page.locator('.product-tile')
    await expect(durianTiles).toHaveCount(3) // Aice Durian Asli, Aice Durian Cup, Aice Durian Crispy

    // Clear search
    await searchInput.fill('')
    await expect(tiles).toHaveCount(36)

    // Verify no 404 image requests
    expect(failedUrls).toEqual([])
  })

  test('Catalog view displays all 36 Aice products in card boxes with images and barcodes', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()

    const cards = page.locator('.catalog-box-card')
    await expect(cards).toHaveCount(36)

    // Verify image backgrounds are populated
    const firstCardImage = cards.first().locator('.catalog-box-image')
    const bgStyle = await firstCardImage.getAttribute('style')
    expect(bgStyle).toContain('background-image: url(')
    expect(bgStyle).not.toContain('default-icecream.svg')
  })

  test('uploaded product image shows in catalog and POS, survives reload, and can be removed', async ({ page }) => {
    // PNG 2x2
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGP4z8AARAwQCgAf7gP9i18U1AAAAABJRU5ErkJggg==', 'base64')
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()
    await page.getByRole('button', { name: 'Tambah Produk', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input[name="barcode"]').fill('8990000009999')
    await dialog.locator('input[name="name"]').fill('Es Uji Gambar')

    // File selain gambar ditolak dan tidak mengubah pratinjau
    await dialog.getByLabel('Berkas gambar produk').setInputFiles({ name: 'catatan.txt', mimeType: 'text/plain', buffer: Buffer.from('bukan gambar') })
    await expect(page.locator('.notice-toast')).toContainText('Format gambar harus PNG, JPG, atau WebP')
    await expect(dialog.locator('.image-field-preview')).toHaveAttribute('style', /default-icecream\.svg/)

    await dialog.getByLabel('Berkas gambar produk').setInputFiles({ name: 'es.png', mimeType: 'image/png', buffer: png })
    await expect(dialog.locator('.image-field-preview')).toHaveAttribute('style', /data:image\//)
    await dialog.getByRole('button', { name: 'Simpan produk' }).click()

    const card = page.locator('.catalog-box-card').filter({ hasText: 'Es Uji Gambar' })
    await expect(card.locator('.catalog-box-image')).toHaveAttribute('style', /data:image\//)

    await page.reload()
    await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()
    await expect(page.locator('.catalog-box-card').filter({ hasText: 'Es Uji Gambar' }).locator('.catalog-box-image')).toHaveAttribute('style', /data:image\//)
    await page.getByRole('button', { name: 'Kasir POS', exact: true }).click()
    await expect(page.locator('.product-tile').filter({ hasText: 'Es Uji Gambar' }).locator('.product-image')).toHaveAttribute('style', /data:image\//)

    // Hapus gambar mengembalikan gambar bawaan
    await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()
    await page.locator('.catalog-box-card').filter({ hasText: 'Es Uji Gambar' }).getByRole('button', { name: 'Edit' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Hapus gambar' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Simpan produk' }).click()
    await expect(page.locator('.catalog-box-card').filter({ hasText: 'Es Uji Gambar' }).locator('.catalog-box-image')).toHaveAttribute('style', /default-icecream\.svg/)
  })
})
