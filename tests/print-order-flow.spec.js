import { test, expect } from '@playwright/test'

test('user reported print order: mixed color and black-white pages automatically produces 2 action cards', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('http://127.0.0.1:4173')

  // Open AI Assistant
  const launcher = page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true })
  await launcher.click()

  const input = page.getByRole('textbox', { name: 'Pesan untuk asisten' })
  const log = page.getByRole('log')

  // 1. User submits the exact query reported by user
  await input.fill('1 orang tdi ngeprint proposal, jumlah 32 halaman, yang berwarna cuma 3 halaman. Sudah lunas.')
  await input.press('Enter')

  // 2. Chat bubble must contain detailed breakdown
  await expect(log).toContainText('Halaman Berwarna')
  await expect(log).toContainText('Halaman Hitam-Putih')
  await expect(log).toContainText('17.500')

  // 3. Two separate Action Cards MUST appear (not missing or zero cards)
  const cards = page.locator('.tool-call-card')
  await expect(cards).toHaveCount(2)

  await expect(cards.nth(0)).toContainText('Order Cetak Word')
  await expect(cards.nth(0)).toContainText('Berwarna')
  await expect(cards.nth(0)).toContainText('3 hal')

  await expect(cards.nth(1)).toContainText('Order Cetak Word')
  await expect(cards.nth(1)).toContainText('Hitam putih')
  await expect(cards.nth(1)).toContainText('29 hal')

  // 4. Batch banner appears
  const batchBtn = page.getByRole('button', { name: /Terapkan Semua/i })
  await expect(batchBtn).toBeVisible()
  await batchBtn.click()

  // Verify both cards marked as applied
  await expect(cards.nth(0)).toContainText('Telah Diterapkan')
  await expect(cards.nth(1)).toContainText('Telah Diterapkan')

  // Close assistant and check Print queue
  await page.getByRole('button', { name: 'Tutup asisten', exact: true }).click()
  await page.getByRole('button', { name: 'Jasa Print Word', exact: true }).click()

  await expect(page.locator('.print-list')).toContainText('proposal_Warna.docx')
  await expect(page.locator('.print-list')).toContainText('3 halaman')
  await expect(page.locator('.print-list')).toContainText('proposal_Teks.docx')
  await expect(page.locator('.print-list')).toContainText('29 halaman')

  expect(errors).toEqual([])
})
