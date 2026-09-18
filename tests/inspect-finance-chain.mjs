import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 320, height: 568 } })
await page.goto('http://127.0.0.1:4173')
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
await page.waitForTimeout(350)
const chain = await page.evaluate(() => {
  let el = document.querySelector('.finance-page')
  const out = []
  while (el && el !== document.body) {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    const cls = (el.className && typeof el.className === 'string') ? el.className.split(' ')[0] : el.tagName
    out.push(`${el.tagName.toLowerCase()}.${cls} w=${Math.round(r.width)} display=${cs.display} minW=${cs.minWidth} overflow=${cs.overflowX}`)
    el = el.parentElement
  }
  return out
})
chain.forEach((l) => console.log(l))
await browser.close()
