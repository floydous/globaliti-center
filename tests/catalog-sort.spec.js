import { test, expect } from '@playwright/test'

test('katalog bisa diurutkan menurut pembeli, terjual, stok, nama, dan harga', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('globaliti_store_v1')) return
    const item = (productId, quantity) => ({ productId, quantity, price: 1000 })
    const sales = [
      { id: 'TRX-0001', date: '2025-03-01', time: '10:00', items: [item('p3', 1)], total: 1000, payment: 'Tunai' },
      { id: 'TRX-0002', date: '2025-03-01', time: '10:05', items: [item('p3', 1), item('p1', 10)], total: 1000, payment: 'Tunai' },
      { id: 'TRX-0003', date: '2025-03-02', time: '10:10', items: [item('p3', 1)], total: 1000, payment: 'Tunai' },
    ]
    localStorage.setItem('globaliti_store_v1', JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data: { products: [], sales, expenses: [], aiMessages: [] } }))
  })
  await page.goto('http://127.0.0.1:4173')
  await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()

  const firstTitle = () => page.locator('.catalog-box-title').first().innerText()
  const sort = page.getByRole('combobox', { name: 'Urutkan produk' })
  expect(await firstTitle()).toBe('Matcha Cup')

  await sort.selectOption({ label: 'Pembeli terbanyak' })
  expect(await firstTitle()).toBe('Cokelat Stick') // 3 nota, walau hanya 3 unit
  await sort.selectOption({ label: 'Terjual terbanyak' })
  expect(await firstTitle()).toBe('Matcha Cup') // 10 unit dalam satu nota
  await sort.selectOption({ label: 'Stok terbanyak' })
  expect(await firstTitle()).toBe('Aice Semangka')
  await sort.selectOption({ label: 'Stok tersedikit' })
  expect(await firstTitle()).toBe('Strawberry Cup')
  await sort.selectOption({ label: 'Nama A-Z' })
  expect(await firstTitle()).toBe('Aice Banana Crispy')
  await sort.selectOption({ label: 'Harga tertinggi' })
  expect(await firstTitle()).toBe('Aice Durian Cup')

  // Urutan di katalog tidak mengubah urutan di kasir
  await page.getByRole('button', { name: 'Kasir POS', exact: true }).click()
  await expect(page.locator('.product-tile strong').first()).toHaveText('Matcha Cup')

  // Tampilan tabel memakai urutan yang sama
  await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()
  await page.getByRole('button', { name: 'Tabel', exact: true }).click()
  await expect(page.locator('.catalog-table tbody tr').first()).toContainText('Aice Durian Cup')
  await expect(sort).toHaveValue('price-high')
})
