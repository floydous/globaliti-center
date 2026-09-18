import { chromium } from 'playwright'

const browser = await chromium.launch()
for (const width of [320, 375]) {
  const page = await browser.newPage({ viewport: { width, height: 667 } })
  await page.goto('http://127.0.0.1:4173')
  await page.waitForTimeout(400)
  for (const view of ['Kasir POS', 'Katalog & Stok', 'Jasa Print Word', 'Laporan Keuangan', 'Pengaturan']) {
    await page.getByRole('button', { name: view, exact: true }).click()
    await page.waitForTimeout(300)
    const m = await page.evaluate(() => {
      const d = document.documentElement
      const clipped = []
      document.querySelectorAll('.statement-row').forEach((row) => {
        const label = row.querySelector('span')
        const val = row.querySelector('strong')
        if (label && val) {
          const lr = label.getBoundingClientRect()
          const vr = val.getBoundingClientRect()
          const vOverlap = Math.min(lr.bottom, vr.bottom) - Math.max(lr.top, vr.top)
          if (vOverlap > 4 && vr.left < lr.right + 2) clipped.push(`"${(label.textContent || '').slice(0, 24)}" overlaps value`)
        }
      })
      const nav = [...document.querySelectorAll('.nav-item')].map((b) => Math.round(b.getBoundingClientRect().width))
      return { scrollW: d.scrollWidth, clientW: d.clientWidth, clipped: clipped.slice(0, 4), navW: nav.slice(0, 6) }
    })
    const flag = m.scrollW > m.clientW ? 'OVERFLOW' : 'ok'
    console.log(`${width}px ${view}: ${flag} scroll=${m.scrollW} navW=[${m.navW.join(',')}] ${m.clipped.join(' | ')}`)
  }
  await page.close()
}
await browser.close()
