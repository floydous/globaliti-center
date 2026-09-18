import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const OUT = 'dogfood-output/screenshots/responsive'
await fs.mkdir(OUT, { recursive: true })
const viewports = [[320, 568], [768, 1024], [1440, 900]]
const views = ['Kasir POS', 'Katalog & Stok', 'Jasa Print Word', 'Laporan Keuangan', 'Pengaturan']
const browser = await chromium.launch()
const errors = []
for (const [width, height] of viewports) {
  const page = await browser.newPage({ viewport: { width, height } })
  page.on('pageerror', (e) => errors.push(`${width}px pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${width}px console: ${m.text()}`) })
  await page.goto('http://127.0.0.1:4173')
  await page.waitForTimeout(400)
  for (const view of views) {
    await page.getByRole('button', { name: view, exact: true }).click()
    await page.waitForTimeout(350)
    const slug = view.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    await page.screenshot({ path: `${OUT}/${slug}-${width}.png`, fullPage: true })
  }
  // modals at this viewport
  const modalPlans = [
    ['Jasa Print', 'Buat Order Print', 'modal-print'],
    ['Laporan Keuangan', 'Catat Beban', 'modal-beban'],
  ]
  for (const [view, btn, slug] of modalPlans) {
    try {
      await page.getByRole('button', { name: view, exact: true }).click()
      await page.getByRole('button', { name: btn, exact: true }).click()
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${OUT}/${slug}-${width}.png` })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
    } catch { /* modal may not exist at this size */ }
  }
  await page.close()
}
await browser.close()
console.log('console/page errors:', errors.length ? errors.join('\n') : 'none')
console.log('done')
