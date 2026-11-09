import { test, expect } from '@playwright/test'

const openFinance = async (page) => {
  await page.goto('http://127.0.0.1:4173')
  await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
}

// Penyimpanan lokal awal untuk tes yang membutuhkan data tertentu
const seedStore = (page, data) =>
  page.addInitScript((payload) => {
    if (localStorage.getItem('globaliti_store_v1')) return
    localStorage.setItem('globaliti_store_v1', JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data: { products: [], sales: [], expenses: [], aiMessages: [], ...payload } }))
  }, data)

test.describe('Profil unit usaha dan laporan', () => {
  test('identitas dan modal kas awal dari Pengaturan dipakai di dokumen laporan', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Pengaturan', exact: true }).click()
    await page.locator('input[name="unitName"]').fill('Toko Uji Mandiri')
    await page.locator('input[name="openingCash"]').fill('2000000')
    await page.getByRole('button', { name: 'Simpan Pengaturan' }).click()
    await expect(page.getByText('Pengaturan berhasil disimpan')).toBeVisible()

    await page.reload()
    await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
    await expect(page.locator('.finance-sub')).toContainText('Toko Uji Mandiri')
    await page.getByRole('button', { name: 'Pratinjau Dokumen', exact: true }).click()
    const doc = page.locator('.preview-modal-shell')
    await expect(doc).toContainText('UNIT USAHA KREATIF: TOKO UJI MANDIRI')
    // Kas = modal awal 2.000.000 + penjualan 39.000 - beban operasional 246.000
    await expect(doc).toContainText('Rp 1.793.000')
    // Periode dibentuk dari tanggal, bukan teks tetap
    await expect(doc).not.toContainText('17 September 2026')
    await expect(doc).toContainText('s.d.')
  })

  test('nilai tidak valid pada profil diganti nilai bawaan, bukan disimpan', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Pengaturan', exact: true }).click()
    await page.locator('input[name="unitName"]').fill('   ')
    await page.locator('input[name="openingCash"]').fill('9999999999999')
    await page.getByRole('button', { name: 'Simpan Pengaturan' }).click()
    await expect(page.locator('input[name="unitName"]')).toHaveValue('Globaliti Creative Center')
    await expect(page.locator('input[name="openingCash"]')).toHaveValue('1500000')
  })

  test('saldo laba berjalan di neraca sama dengan laba bersih', async ({ page }) => {
    await openFinance(page)
    await page.getByRole('tab', { name: 'Posisi Keuangan (Neraca)' }).click()
    // 39.000 pendapatan - 22.230 HPP - 246.000 beban operasional
    await expect(page.locator('.statement-row').filter({ hasText: 'Saldo Laba Berjalan' })).toContainText('229.230')
  })
})

test.describe('Data contoh', () => {
  test('bisa dihapus dengan konfirmasi, dan nomor nota berikutnya tidak bentrok', async ({ page }) => {
    await openFinance(page)
    await expect(page.getByRole('status')).toContainText('nota dan beban contoh')
    await page.getByRole('button', { name: 'Hapus data contoh', exact: true }).click()
    // Batal tidak menghapus apa pun
    await page.getByRole('dialog').getByRole('button', { name: 'Batal' }).click()
    await expect(page.getByRole('status')).toBeVisible()
    await page.getByRole('button', { name: 'Hapus data contoh', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Hapus data contoh' }).click()
    await expect(page.getByRole('status')).toHaveCount(0)

    await page.getByRole('button', { name: 'Kasir POS', exact: true }).click()
    await expect(page.locator('.pos-summary-bar')).toContainText('0 nota')
    for (let i = 0; i < 2; i++) {
      await page.locator('.product-tile').filter({ hasText: 'Matcha Cup' }).click()
      await page.getByRole('button', { name: /Bayar Rp/ }).click()
      await page.getByRole('dialog', { name: 'Konfirmasi pembayaran' }).getByRole('button', { name: /Bayar Rp/ }).click()
      await page.getByRole('button', { name: /^Transaksi baru/ }).click()
    }
    await expect(page.locator('.recent-row')).toHaveCount(2)
    await page.reload()
    await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
    await expect(page.getByRole('status')).toHaveCount(0)
    await page.getByRole('tab', { name: 'Penjualan Harian' }).click()
    await expect(page.locator('.daily-sales')).toContainText('TRX-0001')
    await expect(page.locator('.daily-sales')).toContainText('TRX-0002')
  })

  test('nota contoh dari penyimpanan lama (tanpa penanda) ikut dikenali', async ({ page }) => {
    await seedStore(page, {
      sales: [
        { id: 'TRX-0001', time: '08:14', items: [{ productId: 'p1', quantity: 2, price: 8000 }], total: 16000, payment: 'Tunai' },
        { id: 'TRX-0002', time: '09:02', items: [{ productId: 'p3', quantity: 1, price: 5000 }], total: 5000, payment: 'QRIS' },
        { id: 'TRX-0003', time: '10:26', items: [{ productId: 'p2', quantity: 3, price: 6000 }], total: 18000, payment: 'Tunai' },
        { id: 'TRX-0004', date: '2025-03-01', time: '11:00', items: [{ productId: 'p1', quantity: 1, price: 8000 }], total: 8000, payment: 'Tunai' },
      ],
    })
    await openFinance(page)
    await page.getByRole('button', { name: 'Hapus data contoh', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Hapus data contoh' }).click()
    await page.getByRole('tab', { name: 'Penjualan Harian' }).click()
    // Nota asli bertanggal tetap ada; tiga nota contoh hilang
    await expect(page.locator('.daily-sales')).toContainText('TRX-0004')
    await expect(page.locator('.daily-sales')).not.toContainText('TRX-0001')
  })
})

test.describe('Ringkasan hari ini dan data tidak tepercaya', () => {
  test('hari ini hanya menghitung nota bertanggal hari ini', async ({ page }) => {
    await seedStore(page, {
      sales: [{ id: 'TRX-0001', date: '2025-03-01', time: '11:00', items: [{ productId: 'p1', quantity: 1, price: 8000 }], total: 8000, payment: 'Tunai' }],
    })
    await page.goto('http://127.0.0.1:4173')
    await expect(page.locator('.pos-summary-bar')).toContainText('0 nota')
    await expect(page.locator('.pos-summary-bar')).toContainText('Rp 0')
  })

  test('gambar produk dari data tersimpan hanya dimuat bila berasal dari aplikasi', async ({ page }) => {
    const external = []
    page.on('request', (request) => { if (request.url().includes('evil.example')) external.push(request.url()) })
    await seedStore(page, {
      products: [{ id: 'p1', barcode: '8990000000010', name: 'Matcha Cup', price: 8000, stock: 24, reorderPoint: 8, active: true, image: 'https://evil.example/pixel.png' }],
    })
    await page.goto('http://127.0.0.1:4173')
    const style = await page.locator('.product-tile').filter({ hasText: 'Matcha Cup' }).locator('.product-image').getAttribute('style')
    expect(style).not.toContain('evil.example')
    expect(external).toEqual([])
  })
})
