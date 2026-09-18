import { test, expect } from '@playwright/test'

test('stock correction and chat action survive reload', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173')
  await page.route('https://api.groq.com/**', route => route.abort())
  await page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true }).click()
  const input = page.getByRole('textbox', { name: 'Pesan untuk asisten' })
  await input.fill('Tambah stok Matcha Cup 2')
  await input.press('Enter')
  await page.getByRole('button', { name: 'Terapkan Perubahan', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: '26 cup Matcha Cup cup Rp 8.000', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true }).click()
  await expect(page.getByRole('log')).toContainText('Telah Diterapkan')
  await expect(page.getByRole('button', { name: 'Terapkan Perubahan', exact: true })).toHaveCount(0)
})
