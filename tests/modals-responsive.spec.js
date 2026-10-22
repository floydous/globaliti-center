import { test, expect } from '@playwright/test'

for (const [width, height] of [[320,568], [390,844], [768,1024], [1440,900]]) {
  test(`operational modal boundaries ${width}x${height}`, async ({ page }) => {
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.setViewportSize({ width, height })
    await page.goto('http://127.0.0.1:4173')
    const plans = [
      ['Katalog & Stok', 'Tambah Produk', 'product'],
      ['Katalog & Stok', 'Sesuaikan stok', 'stock'],
      ['Laporan Keuangan', 'Catat Beban', 'expense'],
    ]
    for (const [view, action, slug] of plans) {
      await page.getByRole('button', { name: view, exact: true }).click()
      if (slug === 'stock') await page.getByTitle(action, { exact: true }).first().click()
      else await page.getByRole('button', { name: action, exact: true }).click()
      const dialog = page.getByRole('dialog').filter({ visible: true })
      await expect(dialog).toBeVisible()
      const box = await dialog.boundingBox()
      expect(box.x, slug).toBeGreaterThanOrEqual(0)
      expect(box.y, slug).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, slug).toBeLessThanOrEqual(width + 1)
      expect(box.y + box.height, slug).toBeLessThanOrEqual(height + 1)
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1), slug).toBe(true)
      await page.screenshot({ path: `dogfood-output/screenshots/modal-${slug}-${width}.png` })
      const submit = dialog.locator('button[type="submit"]')
      await submit.scrollIntoViewIfNeeded()
      await expect(submit).toBeInViewport()
      await dialog.getByRole('button', { name: 'Batal', exact: true }).click()
      await expect(dialog).toHaveCount(0)
    }
    expect(errors).toEqual([])
  })
}
