import { test, expect } from '@playwright/test'

test('web icon and brand icon load properly', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173')

  // Verify head link icon
  const iconHref = await page.locator('link[rel="icon"]').getAttribute('href')
  expect(iconHref).toBe('/globaliti-creative-center-icon.png')

  // Verify response for icon
  const iconRes = await page.request.get('http://127.0.0.1:4173/globaliti-creative-center-icon.png')
  expect(iconRes.status()).toBe(200)

  // Verify brand tile img
  const brandImg = page.locator('.brand-tile img')
  await expect(brandImg).toBeVisible()
  const src = await brandImg.getAttribute('src')
  expect(src).toBe('/globaliti-creative-center-icon.png')

  // Verify brand-tile has transparent background (no black background)
  const brandTileBg = await page.locator('.brand-tile').evaluate((el) => window.getComputedStyle(el).backgroundColor)
  expect(brandTileBg).toBe('rgba(0, 0, 0, 0)')
})
