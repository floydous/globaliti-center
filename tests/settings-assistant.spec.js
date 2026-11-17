import { test, expect } from '@playwright/test'
import { mockGroqStatus, useLocalAssistant } from './helpers/groqKey.js'

test.describe('Pengaturan dan activations asistentes', () => {
  test('konsep operator kasir dihapus seluruhnya dari aplikasi', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('globaliti_store_v1', JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        data: {
          products: [],
          sales: [
            { id: 'TRX-0001', date: new Date().toISOString().slice(0, 10), time: '08:14', items: [{ productId: 'p1', quantity: 1, price: 8000 }], total: 8000, payment: 'Tunai' },
          ],
          expenses: [],
          aiMessages: [],
        },
      }))
    })
    await page.goto('http://127.0.0.1:4173')

    // Tidak ada lagi kartu operator di Pengaturan.
    await page.getByRole('button', { name: 'Pengaturan', exact: true }).click()
    await expect(page.getByText('Operator Kasir Aktif')).toHaveCount(0)
    await expect(page.locator('.operator-chip')).toHaveCount(0)

    // Tidak ada lagi chip operator di bilah atas maupun kartu di sidebar.
    await page.getByRole('button', { name: 'Kasir POS', exact: true }).click()
    await expect(page.locator('.manager-chip')).toHaveCount(0)
    await expect(page.locator('.operator-mini-card')).toHaveCount(0)
    await expect(page.getByRole('combobox', { name: 'Operator kasir aktif' })).toHaveCount(0)

    // Rekap penjualan harian di Laporan Keuangan tidak punya kolom atau label Kasir.
    await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
    await page.locator('.sidebar-subnav').getByRole('button', { name: 'Penjualan Harian' }).click()
    await expect(page.locator('.daily-day-head').first()).toBeVisible()
    await expect(page.locator('.daily-sales')).not.toContainText('Kasir')
  })

  test('nota penjualan tidak menyimpan identitas operator', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')

    const tile = page.locator('.product-tile').filter({ hasText: 'Vanilla Cone' })
    await tile.click()
    await page.getByRole('button', { name: /Bayar Rp/ }).click()
    await page.getByRole('dialog', { name: 'Konfirmasi pembayaran' }).getByRole('button', { name: /Bayar Rp/ }).click()
    await page.getByRole('button', { name: /^Transaksi baru/ }).click()

    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('globaliti_store_v1')).data.sales
    )
    expect(stored.length).toBeGreaterThan(0)
    for (const sale of stored) {
      expect(sale).not.toHaveProperty('operator')
    }
  })

  test('asisten AI dimatikan saat kunci API Groq belum diatur', async ({ page }) => {
    await mockGroqStatus(page, { enabled: false })
    await page.goto('http://127.0.0.1:4173')

    const launcher = page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true })
    await expect(launcher).toBeDisabled()
    await expect(page.locator('#assistant-panel')).toBeHidden()
  })

  test('asisten AI aktif saat kunci API Groq sudah diatur', async ({ page }) => {
    await useLocalAssistant(page)
    await page.goto('http://127.0.0.1:4173')

    const launcher = page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true })
    await expect(launcher).toBeEnabled()
    await launcher.click()
    await expect(page.locator('#assistant-panel')).toBeVisible()
  })

  test('kunci Groq disimpan sebagai file lokal, bukan di localStorage', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Pengaturan', exact: true }).click()

    // Kunci disimulasikan lewat endpoint lokal server.
    const save = await page.request.post('http://127.0.0.1:4173/api/groq-key', {
      data: { key: 'gsk_localfile_test_key' },
    })
    expect(save.ok()).toBe(true)
    await page.reload()

    // Setelah muat ulang, kunci tetap terkonfigurasi (berkas di server).
    const status = await page.request.get('http://127.0.0.1:4173/api/groq-key')
    expect((await status.json()).configured).toBe(true)

    // Tapi browser tidak pernah memegang kuncinya.
    const inBrowser = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
    expect(inBrowser).not.toContain('gsk_')

    // Kunci dibersihkan supaya berkas server tidak tertinggal.
    await page.request.post('http://127.0.0.1:4173/api/groq-key', { data: { key: '' } })
  })
})

test.describe('Panel asisten', () => {
  test('kolom input menempel di dasar panel walau obrolan masih kosong', async ({ page }) => {
    await useLocalAssistant(page)
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true }).click()

    const panel = page.locator('#assistant-panel')
    const inputBar = page.locator('.assistant-panel .ai-input-bar')
    const panelBox = await panel.boundingBox()
    const inputBox = await inputBar.boundingBox()

    expect(inputBox.y).toBeGreaterThan(panelBox.y)
    // Jarak input ke dasar panel paling besar satu baris, bukan ruang kosong utuh.
    expect(panelBox.y + panelBox.height - (inputBox.y + inputBox.height)).toBeLessThan(24)
  })

  test('kolom input tetap di dasar panel saat obrolan panjang', async ({ page }) => {
    await useLocalAssistant(page)
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true }).click()

    const input = page.getByRole('textbox', { name: 'Pesan untuk asisten' })
    for (let i = 0; i < 6; i++) {
      await input.fill(`stok Matcha Cup ${i}`)
      await input.press('Enter')
      await page.waitForTimeout(150)
    }

    const panelBox = await page.locator('#assistant-panel').boundingBox()
    const inputBox = await page.locator('.assistant-panel .ai-input-bar').boundingBox()
    expect(panelBox.y + panelBox.height - (inputBox.y + inputBox.height)).toBeLessThan(24)
  })
})

test.describe('Transaksi terakhir', () => {
  test('menampilkan barang yang terjual, bukan hanya nomor nota', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('globaliti_store_v1', JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        data: {
          products: [],
          sales: [
            { id: 'TRX-0001', date: new Date().toISOString().slice(0, 10), time: '08:14', items: [{ productId: 'p1', quantity: 2, price: 8000 }], total: 16000, payment: 'Tunai' },
          ],
          expenses: [],
          aiMessages: [],
        },
      }))
    })
    await page.goto('http://127.0.0.1:4173')

    const row = page.locator('.recent-row').first()
    await expect(row).toContainText('2x Matcha Cup')
    await expect(row).toContainText('Rp 16.000')
    await expect(row).toContainText('08:14')
    await expect(row).toContainText('Tunai')
  })

  test('transaksi baru langsung tampil dengan barangnya', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')

    const tile = page.locator('.product-tile').filter({ hasText: 'Vanilla Cone' })
    await tile.click()
    await page.getByRole('button', { name: /Bayar Rp/ }).click()
    await page.getByRole('dialog', { name: 'Konfirmasi pembayaran' }).getByRole('button', { name: /Bayar Rp/ }).click()
    await page.getByRole('button', { name: /^Transaksi baru/ }).click()

    const row = page.locator('.recent-row').first()
    await expect(row).toContainText('1x Vanilla Cone')
    await expect(row).toContainText('Rp 6.000')
  })
})
