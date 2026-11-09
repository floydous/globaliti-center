import { test, expect } from '@playwright/test'
import { ean13CheckDigit, ean13Modules, generateEan13, isValidEan13 } from '../src/lib/barcode.ts'

test.describe('Pembuat barcode EAN-13', () => {
  test('digit pemeriksa mengikuti standar EAN-13', () => {
    // Kode produk nyata yang valid
    expect(isValidEan13('4006381333931')).toBe(true)
    expect(isValidEan13('5901234123457')).toBe(true)
    expect(isValidEan13('4006381333932')).toBe(false)
    expect(isValidEan13('12345')).toBe(false)
    expect(ean13CheckDigit('400638133393')).toBe(1)
  })

  test('kode buatan valid, berawalan 2 (pemakaian internal), dan tidak bentrok', () => {
    const existing = new Set()
    for (let i = 0; i < 200; i++) {
      const code = generateEan13(existing)
      expect(isValidEan13(code)).toBe(true)
      expect(code.startsWith('2')).toBe(true)
      expect(existing.has(code)).toBe(false)
      existing.add(code)
    }
  })

  test('susunan garis: 95 modul dengan pelindung awal, tengah, dan akhir', () => {
    for (const code of ['4006381333931', '5901234123457', '2000000000008']) {
      const bits = ean13Modules(code)
      expect(bits).toHaveLength(95)
      expect(bits.slice(0, 3)).toBe('101')
      expect(bits.slice(45, 50)).toBe('01010')
      expect(bits.slice(92)).toBe('101')
      const ones = (segment) => [...segment].filter((bit) => bit === '1').length
      // Digit kanan: mulai 1, akhir 0, jumlah garis genap. Digit kiri: mulai 0, akhir 1.
      for (let i = 0; i < 6; i++) {
        const left = bits.slice(3 + i * 7, 10 + i * 7)
        const right = bits.slice(50 + i * 7, 57 + i * 7)
        expect(left[0] + left[6]).toBe('01')
        expect(right[0] + right[6]).toBe('10')
        expect(ones(right) % 2).toBe(0)
      }
    }
    expect(() => ean13Modules('4006381333932')).toThrow()
  })
})

test.describe('Barcode untuk produk tanpa barcode pabrik', () => {
  const openForm = async (page) => {
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Katalog & Stok', exact: true }).click()
    await page.getByRole('button', { name: 'Tambah Produk', exact: true }).click()
    return page.getByRole('dialog')
  }

  test('membuat barcode, menampilkan gambarnya, dan produk bisa dipindai di kasir', async ({ page }) => {
    const dialog = await openForm(page)
    await dialog.getByRole('button', { name: 'Buat barcode' }).click()
    const first = await dialog.locator('input[name="barcode"]').inputValue()
    expect(first).toMatch(/^2\d{12}$/)

    // Tampilkan: jendela pratinjau menumpuk di atas formulir, dan menutup tanpa menutup formulir
    await dialog.getByRole('button', { name: 'Tampilkan' }).click()
    const preview = page.getByRole('dialog', { name: 'Pratinjau barcode' })
    await expect(preview.getByRole('img', { name: `Barcode ${first}` })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(preview).toBeHidden()
    await expect(page.getByRole('dialog', { name: /produk/i }).or(dialog).first()).toBeVisible()

    // Membuat lagi menghasilkan kode lain
    await dialog.getByRole('button', { name: 'Buat barcode' }).click()
    expect(await dialog.locator('input[name="barcode"]').inputValue()).not.toBe(first)
    const code = await dialog.locator('input[name="barcode"]').inputValue()

    await dialog.locator('input[name="name"]').fill('Es Lilin Tanpa Barcode')
    await dialog.getByRole('button', { name: 'Simpan produk' }).click()
    await expect(page.locator('.catalog-box-card').filter({ hasText: code })).toContainText('Es Lilin Tanpa Barcode')

    // Dipindai di kasir: scanner mengetik kode lalu Enter
    await page.getByRole('button', { name: 'Kasir POS', exact: true }).click()
    await page.getByRole('textbox', { name: 'Input barcode produk' }).fill(code)
    await page.keyboard.press('Enter')
    await expect(page.locator('.cart-line-copy strong')).toHaveText('Es Lilin Tanpa Barcode')
  })

  test('mengetik barcode sendiri melepas tanda barcode buatan', async ({ page }) => {
    const dialog = await openForm(page)
    await dialog.getByRole('button', { name: 'Buat barcode' }).click()
    await dialog.locator('input[name="barcode"]').fill('1234567')
    await expect(dialog.getByRole('button', { name: 'Tampilkan' })).toBeDisabled()
    await dialog.locator('input[name="name"]').fill('Produk Manual')
    await dialog.getByRole('button', { name: 'Simpan produk' }).click()

    await page.getByRole('button', { name: 'Cetak barcode' }).click()
    // Barcode 7 digit bukan EAN-13, jadi tidak ikut daftar cetak
    await expect(page.getByRole('dialog')).not.toContainText('Produk Manual')
  })

  test('dialog cetak memilih barcode buatan, mengisi lembar cetak, dan menyembunyikan aplikasi saat dicetak', async ({ page }) => {
    const dialog = await openForm(page)
    await dialog.getByRole('button', { name: 'Buat barcode' }).click()
    const code = await dialog.locator('input[name="barcode"]').inputValue()
    await dialog.locator('input[name="name"]').fill('Es Lilin Tanpa Barcode')
    await dialog.getByRole('button', { name: 'Simpan produk' }).click()

    await page.getByRole('button', { name: 'Cetak barcode' }).click()
    const print = page.getByRole('dialog', { name: 'Cetak barcode kasir' })
    // Hanya barcode buatan yang terpilih sejak awal
    await expect(print.getByRole('checkbox', { name: /Es Lilin Tanpa Barcode/ })).toBeChecked()
    await expect(print.getByRole('button', { name: 'Cetak (1)' })).toBeEnabled()
    const sheet = page.locator('#barcode-print-root .barcode-label')
    await expect(sheet).toHaveCount(1)
    await expect(sheet).toContainText('Es Lilin Tanpa Barcode')
    await expect(sheet.locator(`svg[aria-label="Barcode ${code}"]`)).toBeAttached()

    // Di luar mode cetak lembar disembunyikan; saat mencetak hanya lembar yang tampil
    await expect(page.locator('#barcode-print-root')).toBeHidden()
    await page.emulateMedia({ media: 'print' })
    await page.evaluate(() => document.body.classList.add('printing-barcodes'))
    await expect(page.locator('#barcode-print-root')).toBeVisible()
    await expect(page.locator('#root')).toBeHidden()
    await page.emulateMedia({ media: 'screen' })
    await page.evaluate(() => document.body.classList.remove('printing-barcodes'))

    await page.keyboard.press('Escape')
    await expect(print).toBeHidden()
    await expect(page.locator('#barcode-print-root')).toHaveCount(0)
  })
})
