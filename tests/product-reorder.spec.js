import { test, expect } from '@playwright/test'

const names = (page) => page.locator('.product-tile strong').allTextContents()

test.describe('Urutan produk di kasir', () => {
  test('tombol memindahkan produk ke awal dan urutan tetap setelah reload', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    expect((await names(page))[0]).toBe('Matcha Cup')

    await page.getByRole('button', { name: 'Atur urutan', exact: true }).click()
    // Saat mengatur, mengetuk produk tidak memasukkannya ke keranjang
    await page.locator('.product-tile.reordering').filter({ hasText: 'Vanilla Cone' }).locator('.product-image').click()
    await expect(page.locator('.cart-line')).toHaveCount(0)
    await expect(page.getByRole('textbox', { name: 'Cari produk' })).toBeDisabled()

    await page.getByRole('button', { name: 'Pindahkan Aice Choco Crispy Stick ke paling awal' }).click()
    await page.getByRole('button', { name: 'Geser Vanilla Cone maju' }).click()
    await page.getByRole('button', { name: 'Selesai', exact: true }).click()

    expect((await names(page)).slice(0, 3)).toEqual(['Aice Choco Crispy Stick', 'Vanilla Cone', 'Matcha Cup'])

    // Produk di posisi baru bisa langsung diketuk
    await page.locator('.product-tile').first().click()
    await expect(page.locator('.cart-line-copy strong')).toHaveText('Aice Choco Crispy Stick')

    await page.reload()
    expect((await names(page)).slice(0, 3)).toEqual(['Aice Choco Crispy Stick', 'Vanilla Cone', 'Matcha Cup'])
  })

  test('produk bisa diseret ke posisi lain dan dipindah ke akhir', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Atur urutan', exact: true }).click()

    const tiles = page.locator('.product-tile.reordering')
    await tiles.filter({ hasText: 'Cokelat Stick' }).dragTo(tiles.filter({ hasText: 'Matcha Cup' }))
    await page.getByRole('button', { name: 'Pindahkan Matcha Cup ke paling akhir' }).click()
    await page.getByRole('button', { name: 'Selesai', exact: true }).click()

    const order = await names(page)
    expect(order[0]).toBe('Cokelat Stick')
    expect(order.at(-1)).toBe('Matcha Cup')
    expect(order).toHaveLength(36)
  })
})

test('menyeret produk dari paling bawah ke atas menggulir daftar otomatis', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('http://127.0.0.1:4173')
  await page.getByRole('button', { name: 'Atur urutan', exact: true }).click()

  const grid = page.locator('.product-grid')
  await grid.evaluate((el) => { el.scrollTop = el.scrollHeight })
  const bottomScroll = await grid.evaluate((el) => el.scrollTop)
  expect(bottomScroll).toBeGreaterThan(300)

  const tile = page.locator('.product-tile.reordering').filter({ hasText: 'Aice Choco Crispy Stick' })
  const tileBox = await tile.boundingBox()
  const gridBox = await grid.boundingBox()

  // Seret ke tepi atas daftar dan tahan di sana: daftar harus menggulir sendiri ke atas
  await page.mouse.move(tileBox.x + tileBox.width / 2, tileBox.y + tileBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(gridBox.x + gridBox.width / 2, gridBox.y + 120, { steps: 8 })
  await page.mouse.move(gridBox.x + gridBox.width / 2, gridBox.y + 20, { steps: 8 })
  await expect.poll(() => grid.evaluate((el) => el.scrollTop), { timeout: 5000 }).toBe(0)

  // Lepas di atas tile pertama yang sekarang terlihat
  const first = await page.locator('.product-tile.reordering').first().boundingBox()
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2, { steps: 5 })
  await page.mouse.up()
  await page.getByRole('button', { name: 'Selesai', exact: true }).click()

  expect((await names(page))[0]).toBe('Aice Choco Crispy Stick')
})
