import { test, expect } from '@playwright/test'

test('product-grid has height limit and recent-sales is easily reachable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('http://127.0.0.1:4173')

  const grid = page.locator('.product-grid')
  await expect(grid).toBeVisible()

  // Verify bounding box height is capped around 415px
  const gridBox = await grid.boundingBox()
  expect(gridBox.height).toBeLessThanOrEqual(416)
  expect(gridBox.height).toBeGreaterThan(300)

  // Verify recent sales is visible without scrolling down thousands of pixels
  const recentSales = page.locator('.recent-sales')
  await expect(recentSales).toBeVisible()
  const salesBox = await recentSales.boundingBox()
  // Since total viewport is 900px, recent-sales top should be within reachable distance
  expect(salesBox.y).toBeLessThan(1000)

  // Verify grid has internal scrollability
  const scrollHeight = await grid.evaluate((el) => el.scrollHeight)
  const clientHeight = await grid.evaluate((el) => el.clientHeight)
  expect(scrollHeight).toBeGreaterThan(clientHeight)
})
