import { test, expect } from '@playwright/test'

// Riwayat penjualan tersimpan lokal; tes ini memakai tanggal lampau yang tetap supaya
// hasilnya tidak bergantung pada hari tes dijalankan.
const seedStore = (page) =>
  page.addInitScript(() => {
    if (localStorage.getItem('globaliti_store_v1')) return
    const sales = [
      { id: 'TRX-0004', date: '2025-03-25', time: '14:05', items: [{ productId: 'p2', quantity: 3, price: 6000, stockAfter: 15 }], total: 18000, payment: 'QRIS' },
      { id: 'TRX-0003', date: '2025-03-20', time: '10:26', items: [{ productId: 'p1', quantity: 1, price: 8000, stockAfter: 21 }], total: 8000, payment: 'Tunai' },
      { id: 'TRX-0002', date: '2025-03-20', time: '09:02', items: [{ productId: 'p1', quantity: 2, price: 8000, stockAfter: 22 }, { productId: 'p3', quantity: 1, price: 5000, stockAfter: 31 }], total: 21000, payment: 'QRIS' },
      { id: 'TRX-0001', time: '08:14', items: [{ productId: 'p1', quantity: 1, price: 8000 }], total: 8000, payment: 'Tunai' },
    ]
    localStorage.setItem('globaliti_store_v1', JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data: { products: [], sales, expenses: [], aiMessages: [] } }))
  })

// Menyeret dari satu tanggal ke tanggal lain di kalender, seperti pengguna sungguhan
const dragDays = async (page, fromDate, toDate) => {
  const start = await page.locator(`[data-date="${fromDate}"]`).boundingBox()
  const end = await page.locator(`[data-date="${toDate}"]`).boundingBox()
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 6 })
  await page.mouse.up()
}

const openDaily = async (page) => {
  await page.goto('http://127.0.0.1:4173')
  await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
  await page.getByRole('tab', { name: 'Penjualan Harian' }).click()
}

test.describe('Penjualan Harian', () => {
  test('menampilkan rekap per hari, produk terjual, dan sisa stok dari data lokal', async ({ page }) => {
    await seedStore(page)
    await openDaily(page)

    // Filter tanggal bawaan (default) adalah Hari ini
    await expect(page.getByRole('button', { name: 'Hari ini', exact: true })).toHaveAttribute('aria-pressed', 'true')

    // Buka filter Semua untuk melihat seluruh data historis contoh
    await page.getByRole('button', { name: 'Semua', exact: true }).click()

    const table = page.locator('.daily-days')
    await expect(table).toContainText('25 Maret 2025')
    await expect(table).toContainText('20 Maret 2025')
    await expect(table).toContainText('Tanpa tanggal')
    await expect(page.locator('.daily-summary')).toContainText('Rp 55.000')

    // Hari terbaru langsung terbuka: produk, jumlah, dan stok yang tersisa
    const newest = page.locator('.daily-day-body').first()
    await expect(newest).toContainText('Vanilla Cone')
    // Stok awal -> stok akhir hari: 18 sebelum penjualan, 15 sesudahnya
    await expect(newest.locator('.daily-product', { hasText: 'Vanilla Cone' }).locator('.daily-stock')).toHaveText('18 → 15')
    await expect(newest.locator('.daily-product', { hasText: 'Vanilla Cone' })).toContainText('Terjual 3')

    // Hari lain dibuka sendiri; sisa stok diambil dari penjualan terakhir hari itu
    await page.getByRole('button', { name: /20 Maret 2025/ }).click()
    // Dua nota Matcha Cup di hari itu: 24 sebelum nota pertama, 21 setelah nota terakhir
    const matcha = page.locator('.daily-product', { hasText: 'Matcha Cup' })
    await expect(matcha).toContainText('Terjual 3')
    await expect(matcha.locator('.daily-stock')).toHaveText('24 → 21')
    await expect(page.locator('.daily-product', { hasText: 'Cokelat Stick' }).locator('.daily-stock')).toHaveText('32 → 31')
    // Nota lama tidak mencatat stok: hari itu menjelaskannya, tanpa tanda strip kosong
    await page.getByRole('button', { name: /Tanpa tanggal/ }).click()
    const legacy = page.locator('.daily-day', { hasText: 'Tanpa tanggal' })
    await expect(legacy).toContainText('Stok tidak tercatat pada nota lama')
    await expect(legacy.locator('.daily-stock')).toHaveCount(0)
    // Laba kotor 20 Maret: 29.000 dikurangi HPP estimasi 16.530
    await expect(table.locator('.daily-day', { hasText: '20 Maret 2025' })).toContainText('Rp 12.470')
  })

  test('rentang tanggal menyaring hari yang ditampilkan', async ({ page }) => {
    await seedStore(page)
    await openDaily(page)

    // Kalender terbuka di bulan penjualan terbaru; seret 25 sampai 31 Maret
    await page.getByRole('button', { name: 'Pilih tanggal' }).click()
    await dragDays(page, '2025-03-25', '2025-03-31')
    await expect(page.locator('.date-range-trigger')).toHaveText(/25 Mar.*31 Mar 2025/)
    await expect(page.locator('.daily-days')).toContainText('25 Maret 2025')
    await expect(page.locator('.daily-days')).not.toContainText('20 Maret 2025')
    await expect(page.locator('.daily-days')).not.toContainText('Tanpa tanggal')
    await expect(page.locator('.daily-summary')).toContainText('Rp 18.000')

    await page.getByRole('button', { name: 'Hari ini', exact: true }).click()
    await expect(page.getByText('Tidak ada penjualan pada rentang tanggal ini.')).toBeVisible()

    await page.getByRole('button', { name: 'Semua', exact: true }).click()
    await expect(page.locator('.daily-days')).toContainText('20 Maret 2025')
  })

  test('penjualan baru dicatat per hari dengan sisa stok dan tetap ada setelah reload', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    const tile = page.locator('.product-tile').filter({ hasText: 'Vanilla Cone' })
    await tile.click()
    await tile.click()
    await page.getByRole('button', { name: /Bayar Rp/ }).click()
    await page.getByRole('dialog', { name: 'Konfirmasi pembayaran' }).getByRole('button', { name: /Bayar Rp/ }).click()
    await page.getByRole('button', { name: /^Transaksi baru/ }).click()

    await page.reload()
    await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
    await page.getByRole('tab', { name: 'Penjualan Harian' }).click()
    await page.getByRole('button', { name: 'Hari ini', exact: true }).click()

    const rows = page.locator('.daily-day')
    await expect(rows).toHaveCount(1)
    const vanilla = page.locator('.daily-product', { hasText: 'Vanilla Cone' })
    // 2 Vanilla Cone yang baru dijual; stok 18 -> 16
    await expect(vanilla).toContainText(/Terjual (2|5)/)
    await expect(vanilla.locator('.daily-stock')).toHaveText('18 → 16')
  })
  test('seret tanggal memilih rentang, klik satu tanggal memilih laporan satu hari', async ({ page }) => {
    await seedStore(page)
    await openDaily(page)

    await page.getByRole('button', { name: 'Pilih tanggal' }).click()
    await expect(page.getByRole('dialog', { name: 'Pilih rentang tanggal' })).toContainText('Maret 2025')

    // Penanda hari: ada penjualan, tidak ada catatan (sejak penjualan pertama), dan sebelum aplikasi dipakai
    await expect(page.locator('[data-date="2025-03-20"]')).toHaveClass(/marked/)
    await expect(page.locator('[data-date="2025-03-22"]')).toHaveClass(/empty/)
    await expect(page.locator('[data-date="2025-03-22"]')).toHaveAttribute('aria-label', /tidak ada catatan penjualan/)
    await expect(page.locator('[data-date="2025-03-19"]')).not.toHaveClass(/empty|marked/)
    await expect(page.getByRole('dialog', { name: 'Pilih rentang tanggal' })).toContainText('Tidak ada catatan')

    // Seret dari 20 sampai 25 Maret (arah mundur juga sama): kedua hari tampil
    await dragDays(page, '2025-03-25', '2025-03-20')
    await expect(page.locator('.date-range-trigger')).toHaveText(/20 Mar.*25 Mar 2025/)
    await expect(page.getByRole('dialog', { name: 'Pilih rentang tanggal' })).toBeHidden()
    await expect(page.locator('.daily-days')).toContainText('20 Maret 2025')
    await expect(page.locator('.daily-days')).toContainText('25 Maret 2025')
    await expect(page.locator('.daily-summary')).toContainText('Rp 47.000')

    // Satu klik pada satu tanggal: laporan satu hari
    await page.locator('.date-range-trigger').click()
    await dragDays(page, '2025-03-20', '2025-03-20')
    await expect(page.locator('.date-range-trigger')).toHaveText('20 Mar 2025')
    await expect(page.locator('.daily-days')).not.toContainText('25 Maret 2025')
    await expect(page.locator('.daily-summary')).toContainText('Rp 29.000')
  })

  test('kalender bisa dioperasikan dengan keyboard dan ditutup dengan Escape', async ({ page }) => {
    await seedStore(page)
    await openDaily(page)

    await page.getByRole('button', { name: 'Pilih tanggal' }).click()
    await page.locator('[data-date="2025-03-24"]').focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('[data-date="2025-03-25"]')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('.date-range-trigger')).toHaveText('25 Mar 2025')

    await page.locator('.date-range-trigger').click()
    await expect(page.getByRole('dialog', { name: 'Pilih rentang tanggal' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Pilih rentang tanggal' })).toBeHidden()
    await expect(page.locator('.date-range-trigger')).toBeFocused()
  })

  test('mencetak dokumen penjualan harian untuk rentang yang dipilih', async ({ page }) => {
    await seedStore(page)
    // Pencetakan sebenarnya tidak berjalan di tes; isi dokumen dibaca saat window.print() dipanggil
    await page.addInitScript(() => {
      window.print = () => {
        const root = document.querySelector('#daily-print-root')
        window.__printed = { text: root ? root.innerText : null, printing: document.body.classList.contains('printing-daily') }
      }
    })
    await openDaily(page)

    await expect(page.locator('#daily-print-root')).toHaveCount(0)
    await page.locator('.date-range-trigger').click()
    await dragDays(page, '2025-03-20', '2025-03-20')
    await page.keyboard.press('Escape')
    await page.locator('.daily-sales').getByRole('button', { name: 'Cetak Laporan' }).click()

    const printed = await page.evaluate(() => window.__printed)
    expect(printed.printing).toBe(true)
    expect(printed.text).toContain('LAPORAN PENJUALAN HARIAN')
    expect(printed.text).toContain('20 Maret 2025')
    expect(printed.text).toContain('29.000') // pendapatan 20 Maret
    expect(printed.text).not.toContain('25 Maret 2025') // di luar rentang
    expect(printed.text).not.toContain('TRX-') // daftar nota tidak dicetak
    // Dokumen dilepas lagi setelah dicetak
    await expect(page.locator('#daily-print-root')).toHaveCount(0)
    expect(await page.evaluate(() => document.body.classList.contains('printing-daily'))).toBe(false)
  })

  test('mencetak laporan umum tidak ikut mencetak tab Penjualan Harian yang sedang terbuka', async ({ page }) => {
    await seedStore(page)
    await openDaily(page)
    await expect(page.locator('.daily-sales')).toBeVisible()
    await page.emulateMedia({ media: 'print' })
    await expect(page.locator('.daily-sales')).toBeHidden()
    await expect(page.locator('.formal-report-print-target')).toBeVisible()
  })

  test('membatalkan item pembelian mengembalikan stok dan mengurangi kas/pendapatan', async ({ page }) => {
    await seedStore(page)
    await openDaily(page)

    // Buka filter Semua untuk melihat transaksi historis 20 Maret 2025
    await page.getByRole('button', { name: 'Semua', exact: true }).click()

    // Buka 20 Maret 2025 yang memiliki TRX-0002
    await page.getByRole('button', { name: /20 Maret 2025/ }).click()

    const trx2 = page.locator('.daily-sale-card', { hasText: 'TRX-0002' })
    await trx2.locator('.daily-sale-summary').click()

    // Batalkan Matcha Cup
    const matchaEntry = trx2.locator('.daily-sale-item-entry', { hasText: 'Matcha Cup' })
    await matchaEntry.locator('.daily-sale-cancel-btn').click()

    // Konfirmasi modal terbuka
    const modal = page.locator('.cancel-sale-modal')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('Matcha Cup')
    await expect(modal).toContainText('TRX-0002')

    // Konfirmasi pembatalan
    await modal.getByRole('button', { name: 'Konfirmasi Batalkan' }).click()

    // Notice toast muncul
    await expect(page.locator('.notice-toast')).toContainText('Pembelian Matcha Cup (1 unit) berhasil dibatalkan')
    await page.locator('.notice-modal-btn').click()

    // TRX-0002 masih ada karena masih memiliki sisa item
    await expect(trx2).toBeVisible()
    const daySection = page.locator('.daily-day', { hasText: '20 Maret 2025' })
    await expect(daySection.locator('.daily-revenue')).toContainText('21.000')
  })
})
