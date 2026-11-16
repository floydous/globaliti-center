import { test, expect } from '@playwright/test'

test.describe('Settings Zona Berbahaya', () => {
  test('danger zone renders warning container and can reset financial data', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173')

    // Navigate to Pengaturan
    await page.getByRole('button', { name: 'Pengaturan', exact: true }).click()

    // Verify Zona Berbahaya container exists
    const dangerZone = page.locator('.settings-danger-card')
    await expect(dangerZone).toBeVisible()
    await expect(dangerZone).toContainText('Zona Berbahaya')
    await expect(dangerZone).toContainText('Nolkan Semua Stok Produk')
    await expect(dangerZone).toContainText('Reset Data Keuangan')

    // Click Reset Data Keuangan
    await dangerZone.getByRole('button', { name: 'Reset Data Keuangan' }).click()

    // Verify confirmation modal
    const modal = page.getByRole('dialog', { name: 'Reset seluruh data keuangan' })
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('Reset seluruh data keuangan?')

    // Cancel first
    await modal.getByRole('button', { name: 'Batal' }).click()
    await expect(modal).toHaveCount(0)

    // Click again and confirm
    await dangerZone.getByRole('button', { name: 'Reset Data Keuangan' }).click()
    await modal.getByRole('button', { name: 'Reset Data Keuangan' }).click()

    // Notification toast appears
    await expect(page.locator('.notice-toast')).toContainText('berhasil direset')

    // Check Laporan Keuangan
    await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
    await expect(page.locator('.finance-page')).toContainText('Laporan Keuangan SAK EMKM')

    // Tab Laba Rugi should show Rp 0 revenue and Rp 0 net income
    await expect(page.locator('.finance-page')).toContainText('Rp 0')

    // Tab Posisi Keuangan (Neraca)
    await page.getByRole('tab', { name: 'Posisi Keuangan (Neraca)' }).click()
    const retainedRow = page.locator('.statement-row').filter({ hasText: 'Saldo Laba Berjalan' })
    await expect(retainedRow).toContainText('Rp 0')

    // Kas dan Setara Kas should equal opening cash (1.500.000)
    const cashRow = page.locator('.statement-row').filter({ hasText: 'Kas dan Setara Kas' })
    await expect(cashRow).toContainText('Rp 1.500.000')

    // Riwayat Penjualan Harian should have 0 days
    await page.getByRole('tab', { name: 'Penjualan Harian' }).click()
    await expect(page.locator('.daily-sales')).toContainText('0 hari')

    // Verify persistence across reload
    await page.reload()
    await page.getByRole('button', { name: 'Laporan Keuangan', exact: true }).click()
    await page.getByRole('tab', { name: 'Posisi Keuangan (Neraca)' }).click()
    await expect(page.locator('.statement-row').filter({ hasText: 'Saldo Laba Berjalan' })).toContainText('Rp 0')
  })
})
