import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const OUT = 'dogfood-output/screenshots/responsive'
await fs.mkdir(OUT, { recursive: true })
const views = ['Kasir POS', 'Katalog & Stok', 'Jasa Print Word', 'Laporan Keuangan', 'Pengaturan']
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 320, height: 568 } })
await page.goto('http://127.0.0.1:4173')
await page.waitForTimeout(400)
for (const view of views) {
  await page.getByRole('button', { name: view, exact: true }).click()
  await page.waitForTimeout(350)
  const m = await page.evaluate(() => {
    const d = document.documentElement
    const wide = []
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.right > d.clientWidth + 1 && r.width > 8) {
        const cls = (el.className && typeof el.className === 'string') ? el.className.split(' ')[0] : el.tagName
        wide.push(`${el.tagName.toLowerCase()}.${cls} right=${Math.round(r.right)} w=${Math.round(r.width)}`)
      }
    })
    return { scrollW: d.scrollWidth, clientW: d.clientWidth, wide: wide.slice(0, 6) }
  })
  const slug = view.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  await page.screenshot({ path: `${OUT}/${slug}-320-v2.png`, fullPage: true })
  console.log(`${view}: scroll=${m.scrollW} client=${m.clientW} overflow=${m.scrollW > m.clientW ? 'YES' : 'no'}`)
  if (m.wide.length) console.log('  offenders:', m.wide.join(' | '))
}
await browser.close()
