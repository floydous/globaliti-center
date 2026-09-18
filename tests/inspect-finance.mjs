import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 320, height: 568 } })
await page.goto('http://127.0.0.1:4173')
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
await page.waitForTimeout(350)
const info = await page.evaluate(() => {
  const rows = []
  document.querySelectorAll('.finance-page, .finance-page *').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.width > 321) {
      const cs = getComputedStyle(el)
      const cls = (el.className && typeof el.className === 'string') ? el.className.split(' ')[0] : el.tagName
      rows.push({
        sel: `${el.tagName.toLowerCase()}.${cls}`,
        w: Math.round(r.width),
        display: cs.display,
        cols: cs.gridTemplateColumns,
        ws: cs.whiteSpace,
        minW: cs.minWidth,
        text: (el.textContent || '').slice(0, 40),
      })
    }
  })
  rows.sort((a, b) => b.w - a.w)
  return rows.slice(0, 12)
})
for (const r of info) console.log(JSON.stringify(r))
await browser.close()
