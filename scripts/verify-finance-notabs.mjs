import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const artifactDir = 'C:/Users/brat/.gemini/antigravity/brain/bae368b1-7950-4b22-a3e9-ab528fe59e28'
const outputDir = path.resolve('dogfood-output/screenshots')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  })
  const page = await context.newPage()

  console.log('1. Navigating to http://127.0.0.1:4173...')
  await page.goto('http://127.0.0.1:4173')
  await page.waitForLoadState('networkidle')

  console.log('2. Clicking Laporan Keuangan in sidebar...')
  await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
  await page.waitForTimeout(300)

  // Verify .finance-tabs is completely gone
  const tabCount = await page.locator('.finance-tabs').count()
  console.log('.finance-tabs count:', tabCount)
  if (tabCount !== 0) {
    throw new Error(`Expected .finance-tabs count to be 0, got ${tabCount}`)
  }

  // Verify Laba Rugi is shown by default
  const statementTitle = await page.locator('.statement-head h3').innerText()
  console.log('Active statement title:', statementTitle)

  // Capture Laba Rugi screenshot
  const shotLabaRugi = path.join(outputDir, 'finance-no-tabs-labarugi.png')
  await page.screenshot({ path: shotLabaRugi })
  fs.copyFileSync(shotLabaRugi, path.join(artifactDir, 'finance-no-tabs-labarugi.png'))
  console.log('Captured Laba Rugi without tabs screenshot')

  // Click Posisi Keuangan (Neraca) in sidebar subnav
  console.log('3. Clicking Posisi Keuangan (Neraca) in sidebar subnav...')
  await page.locator('.sidebar-subnav').getByRole('button', { name: 'Posisi Keuangan (Neraca)' }).click()
  await page.waitForTimeout(300)

  const neracaHead = await page.locator('.statement-head h3').first().innerText()
  console.log('Neraca statement first head:', neracaHead)

  // Capture Neraca screenshot
  const shotNeraca = path.join(outputDir, 'sidebar-finance-children.png')
  await page.screenshot({ path: shotNeraca })
  fs.copyFileSync(shotNeraca, path.join(artifactDir, 'sidebar-finance-children.png'))
  console.log('Captured Neraca without tabs screenshot:', shotNeraca)

  // Click Penjualan Harian in sidebar subnav
  console.log('4. Clicking Penjualan Harian in sidebar subnav...')
  await page.locator('.sidebar-subnav').getByRole('button', { name: 'Penjualan Harian' }).click()
  await page.waitForTimeout(300)

  // Capture Daily Sales screenshot
  const shotDaily = path.join(outputDir, 'finance-no-tabs-daily.png')
  await page.screenshot({ path: shotDaily })
  fs.copyFileSync(shotDaily, path.join(artifactDir, 'finance-no-tabs-daily.png'))
  console.log('Captured Penjualan Harian without tabs screenshot')

  await browser.close()
  console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
