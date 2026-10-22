import { test, expect } from '@playwright/test'

// Kontrol yang tidak boleh tertutup oleh lapisan apa pun yang melayang di atas konten.
const coveredBy = (page, selector) =>
  page.evaluate((sel) => {
    const layers = [...document.querySelectorAll('.assistant-launcher, .assistant-panel, .notice-toast')]
    const hits = []
    for (const el of document.querySelectorAll(sel)) {
      if (layers.some(l => l === el || l.contains(el) || el.contains(l))) continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (r.bottom < 0 || r.top > innerHeight) continue
      for (const layer of layers) {
        const l = layer.getBoundingClientRect()
        if (l.width === 0 || l.height === 0) continue
        const area = Math.max(0, Math.min(r.right, l.right) - Math.max(r.left, l.left)) *
                     Math.max(0, Math.min(r.bottom, l.bottom) - Math.max(r.top, l.top))
        if (area / (r.width * r.height) > 0.2) {
          hits.push({ text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40), layer: layer.className })
        }
      }
    }
    return hits
  }, selector)

for (const [width, height] of [[1440, 900], [768, 1024], [390, 844]]) {
  test(`no overlay covers a control at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('http://127.0.0.1:4173')
    await page.waitForTimeout(400)

    for (const view of ['Kasir POS', 'Katalog & Stok', 'Laporan Keuangan', 'Pengaturan']) {
      await page.getByRole('button', { name: view, exact: true }).click()
      await page.waitForTimeout(300)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(300)
      expect(await coveredBy(page, 'button, a, input, select, [role="tab"]'), `${view} @ ${width}`).toEqual([])
    }
  })
}

test('the page title stays visible when scrolled on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://127.0.0.1:4173')
  await page.evaluate(() => window.scrollTo(0, 900))
  await page.waitForTimeout(400)
  const title = await page.locator('.topbar-globaliti h1').boundingBox()
  const nav = await page.locator('.sidebar').boundingBox()
  expect(title.y, 'judul harus di bawah nav, bukan tertutup').toBeGreaterThanOrEqual(nav.y + nav.height - 1)
  expect(title.y, 'judul harus tetap terlihat di layar').toBeLessThan(844)
})

test('the formal report preview closes on Escape', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173')
  await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
  await page.getByRole('button', { name: 'Pratinjau Dokumen', exact: true }).click()
  await expect(page.locator('.preview-modal-overlay')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.preview-modal-overlay')).toHaveCount(0)
})
