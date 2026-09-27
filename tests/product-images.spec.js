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
})
