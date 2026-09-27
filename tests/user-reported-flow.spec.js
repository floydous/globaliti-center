import { test, expect } from '@playwright/test'

test('user conversation flow: restock recognition, conversation memory, and large catalog boxes', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('http://127.0.0.1:4173')

  // Open AI Assistant launcher
  const launcher = page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true })
  await launcher.click()

  const input = page.getByRole('textbox', { name: 'Pesan untuk asisten' })
  const log = page.getByRole('log')

  // 1. User: "Berapa stok strawberry cup skrng?"
  await input.fill('Berapa stok strawberry cup skrng?')
  await input.press('Enter')
  await expect(log).toContainText('Sisa stok Strawberry Cup saat ini ada')
  await expect(log).toContainText('cup di toko dengan harga jual Rp 8.000')

  // 2. User: "Aku baru aja restok dan sekarang nambah 50"
  await input.fill('Aku baru aja restok dan sekarang nambah 50')
  await input.press('Enter')

  // Must prepare restock action card +50 cup
  await expect(log).toContainText('penambahan stok untuk Strawberry Cup sebanyak +50 cup')
  await expect(log).toContainText('Tambah stok Strawberry Cup sebanyak 50 cup')

  // 3. User applies action
  const applyBtn = page.getByRole('button', { name: 'Terapkan Perubahan', exact: true })
  await expect(applyBtn).toBeVisible()
  await applyBtn.click()
  await expect(log).toContainText('Telah Diterapkan')

  // 4. User: "apakah kamu ingat hal2 yang aku bicarakan sebelumnya"
  await input.fill('apakah kamu ingat hal2 yang aku bicarakan sebelumnya')
  await input.press('Enter')

  // Must recall conversation and NOT produce a false-positive physical stock discrepancy card (-58 cup / 2 cup)
  await expect(log).toContainText('mengingat')
  await expect(log).not.toContainText('Selisih:')
  await expect(log).not.toContainText('Fisik di Freezer:')

  // Close assistant
  await page.getByRole('button', { name: 'Tutup asisten', exact: true }).click()

  // 5. Navigate to "Katalog & Stok"
  await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()

  // Verify it is displayed as large boxes (NOT a table)
  await expect(page.locator('.catalog-boxes-grid')).toBeVisible()
  await expect(page.locator('.catalog-table')).toBeHidden()

  // Verify large boxes exist and have rich product information
  const cards = page.locator('.catalog-box-card')
  await expect(cards).toHaveCount(36)

  const strawberryBox = cards.filter({ hasText: 'Strawberry Cup' })
  await expect(strawberryBox).toBeVisible()
  await expect(strawberryBox.locator('.catalog-box-title')).toHaveText('Strawberry Cup')
  await expect(strawberryBox.locator('.box-category-badge')).toHaveText('Es krim')
  await expect(strawberryBox.locator('.box-price-val')).toHaveText('Rp 8.000')
  // After +50 restock from 11 initial, Strawberry Cup stock should be 61
  await expect(strawberryBox.locator('.box-stock-amount strong')).toHaveText('61')
  await expect(strawberryBox.locator('.box-stock-pill')).toContainText('Aman')

  // Test "Sesuaikan stok" button on the large box
  const adjustBtn = strawberryBox.getByRole('button', { name: 'Sesuaikan stok' })
  await expect(adjustBtn).toBeVisible()
  await adjustBtn.click()

  const modal = page.getByRole('dialog', { name: /Penyesuaian Stok Strawberry Cup/i })
  await expect(modal).toBeVisible()
  await expect(modal).toContainText('61 cup')

  await modal.getByRole('button', { name: 'Batal' }).click()
  await expect(modal).toBeHidden()

  expect(errors).toEqual([])
})

test('colloquial restock phrase "Tambahin stok vanilla cone 4 dong" triggers restock confirmation', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173')
  const launcher = page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true })
  await launcher.click()

  const input = page.getByRole('textbox', { name: 'Pesan untuk asisten' })
  const log = page.getByRole('log')

  await input.fill('Tambahin stok vanilla cone 4 dong')
  await input.press('Enter')

  // Verify assistant produces restock confirmation action card
  await expect(log).toContainText('penambahan stok untuk Vanilla Cone sebanyak +4 cone')
  await expect(log).toContainText('Tambah stok Vanilla Cone sebanyak 4 cone')

  // Apply change
  const applyBtn = page.getByRole('button', { name: 'Terapkan Perubahan', exact: true })
  await expect(applyBtn).toBeVisible()
  await applyBtn.click()
  await expect(log).toContainText('Telah Diterapkan')
})
