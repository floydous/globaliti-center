import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'

test('backup contains data, not credentials', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173')
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Unduh Cadangan', exact: true }).click()
  const file = await download
  const text = await fs.readFile(await file.path(), 'utf8')
  const backup = JSON.parse(text)
  expect(backup.version).toBe(1)
  expect(backup.data.products.length).toBe(36)
  expect(text).not.toMatch(/gsk_|gc_groq_key/)
})

test('corrupt stored data is preserved and transactions blocked', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('globaliti_store_v1', '{broken'))
  await page.goto('http://127.0.0.1:4173')
  await expect(page.getByRole('alert')).toContainText('Data lokal tidak dapat dibaca')
  expect(await page.evaluate(() => localStorage.getItem('globaliti_store_v1'))).toBe('{broken')
  await expect(page.getByRole('button', { name: 'Kasir POS', exact: true })).toHaveCount(0)
})
