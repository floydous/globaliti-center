import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const artifactDir = path.resolve('C:/Users/brat/.gemini/antigravity/brain/bae368b1-7950-4b22-a3e9-ab528fe59e28')
const keyFile = path.resolve('.globaliti/groq-key.txt')
const GROQ_API_KEY = process.env.GROQ_API_KEY || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, 'utf8').trim() : '')

async function run() {
  console.log('--- STARTING LIVE E2E AI ASSISTANT TEST ---')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1366, height: 860 },
  })
  const page = await context.newPage()

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text())
    }
  })

  // 1. Buka website
  console.log('1. Navigating to http://127.0.0.1:4173 ...')
  await page.goto('http://127.0.0.1:4173')
  await page.waitForTimeout(500)

  // 2. Buka Pengaturan dan masukkan Groq API Key
  console.log('2. Navigating to Pengaturan...')
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click()
  await page.waitForTimeout(400)

  console.log('Filling Groq API Key...')
  const keyInput = page.locator('label:has-text("Groq API Key") input')
  await keyInput.fill(GROQ_API_KEY)

  console.log('Clicking "Uji Koneksi Groq API"...')
  const testBtn = page.getByRole('button', { name: /Uji Koneksi Groq API/i })
  await testBtn.click()

  // Tunggu hasil uji koneksi
  const statusPill = page.locator('.settings-card-body .status-pill')
  await statusPill.waitFor({ state: 'visible', timeout: 20000 })
  const testMessage = await statusPill.innerText()
  console.log('Uji Koneksi Result:', testMessage)

  // Simpan pengaturan
  const saveBtn = page.getByRole('button', { name: /Simpan Pengaturan/i })
  if (await saveBtn.isVisible()) {
    await saveBtn.click()
  }
  await page.waitForTimeout(600)

  const settingsScreenshot = path.join(artifactDir, 'ai-settings-key-active.png')
  await page.screenshot({ path: settingsScreenshot })
  console.log('Captured settings screenshot:', settingsScreenshot)

  // 3. Kembali ke Kasir POS dan Buka Asisten AI
  console.log('3. Navigating to Kasir POS...')
  await page.getByRole('button', { name: 'Kasir POS', exact: true }).click()
  await page.waitForTimeout(400)

  console.log('Opening Asisten AI panel...')
  const launcher = page.getByRole('button', { name: 'Buka asisten Globaliti', exact: true })
  await launcher.waitFor({ state: 'visible' })
  await launcher.click()

  const assistantPanel = page.locator('#assistant-panel')
  await assistantPanel.waitFor({ state: 'visible' })
  console.log('Assistant panel is open and visible!')

  const chatInput = page.getByRole('textbox', { name: 'Pesan untuk asisten' })

  // Helper untuk mengirim pesan dan menunggu respon assistant
  async function sendAndReceive(promptText, expectedToolOrText, timeout = 30000) {
    console.log(`\n>> Sending: "${promptText}"`)
    const initialBubbleCount = await page.locator('.ai-message-bubble.assistant-side').count()
    await chatInput.fill(promptText)
    await chatInput.press('Enter')

    // Tunggu bubble baru dari assistant muncul dan selesai mengetik
    console.log('Waiting for assistant response...')
    await page.waitForFunction(
      ({ count }) => {
        const bubbles = document.querySelectorAll('.ai-message-bubble.assistant-side')
        if (bubbles.length <= count) return false
        const lastBubble = bubbles[bubbles.length - 1]
        const isThinking = lastBubble.querySelector('.ai-thinking')
        return !isThinking && (lastBubble.textContent || '').trim().length > 0
      },
      { count: initialBubbleCount },
      { timeout }
    )
    await page.waitForTimeout(800)

    const lastBubble = page.locator('.ai-message-bubble.assistant-side').last()
    const responseText = await lastBubble.locator('.ai-bubble-text').innerText()
    console.log(`<< Assistant Answer:\n${responseText.slice(0, 300)}...`)
    return lastBubble
  }

  // --- TEST TOOL 1: adjust_stock ---
  console.log('\n--- TESTING TOOL 1: adjust_stock ---')
  const bubble1 = await sendAndReceive('Halo! Saya baru saja restok freezer, tolong tambahkan stok Vanilla Cone sebanyak 10 ya.')
  const actionCard1 = bubble1.locator('.action-proposal-card.tool-call-card').first()
  await actionCard1.waitFor({ state: 'visible', timeout: 15000 })
  console.log('Proposal Card 1 text:', await actionCard1.innerText())

  const screenshot1 = path.join(artifactDir, 'ai-tool-adjust-stock.png')
  await page.screenshot({ path: screenshot1 })
  console.log('Saved screenshot 1:', screenshot1)

  // Klik Terapkan Perubahan
  console.log('Applying adjust_stock proposal...')
  await actionCard1.locator('.proposal-btn-apply').click()
  await page.waitForTimeout(600)
  const status1 = await actionCard1.locator('.proposal-status-pill').innerText()
  console.log('Status after apply:', status1)

  // --- TEST TOOL 2: record_sale ---
  console.log('\n--- TESTING TOOL 2: record_sale ---')
  const bubble2 = await sendAndReceive('Tadi ada pembeli beli 2 Matcha Cup dibayar Tunai tapi belum sempat diinput kasir, tolong catatkan ya.')
  const actionCard2 = bubble2.locator('.action-proposal-card.tool-call-card').first()
  await actionCard2.waitFor({ state: 'visible', timeout: 15000 })
  console.log('Proposal Card 2 text:', await actionCard2.innerText())

  const screenshot2 = path.join(artifactDir, 'ai-tool-record-sale.png')
  await page.screenshot({ path: screenshot2 })
  console.log('Saved screenshot 2:', screenshot2)

  // Klik Terapkan Perubahan
  console.log('Applying record_sale proposal...')
  await actionCard2.locator('.proposal-btn-apply').click()
  await page.waitForTimeout(600)
  const status2 = await actionCard2.locator('.proposal-status-pill').innerText()
  console.log('Status after apply:', status2)

  // --- TEST TOOL 3: record_expense ---
  console.log('\n--- TESTING TOOL 3: record_expense ---')
  const bubble3 = await sendAndReceive('Catatkan pengeluaran operasional toko 25000 untuk beli kantong kresek.')
  const actionCard3 = bubble3.locator('.action-proposal-card.tool-call-card').first()
  await actionCard3.waitFor({ state: 'visible', timeout: 15000 })
  console.log('Proposal Card 3 text:', await actionCard3.innerText())

  const screenshot3 = path.join(artifactDir, 'ai-tool-record-expense.png')
  await page.screenshot({ path: screenshot3 })
  console.log('Saved screenshot 3:', screenshot3)

  // Klik Terapkan Perubahan
  console.log('Applying record_expense proposal...')
  await actionCard3.locator('.proposal-btn-apply').click()
  await page.waitForTimeout(600)
  const status3 = await actionCard3.locator('.proposal-status-pill').innerText()
  console.log('Status after apply:', status3)

  // --- TEST TOOL 4: update_price ---
  console.log('\n--- TESTING TOOL 4: update_price ---')
  const bubble4 = await sendAndReceive('Ubah harga jual Cokelat Stick menjadi 6000.')
  const actionCard4 = bubble4.locator('.action-proposal-card.tool-call-card').first()
  await actionCard4.waitFor({ state: 'visible', timeout: 15000 })
  console.log('Proposal Card 4 text:', await actionCard4.innerText())

  const screenshot4 = path.join(artifactDir, 'ai-tool-update-price.png')
  await page.screenshot({ path: screenshot4 })
  console.log('Saved screenshot 4:', screenshot4)

  // Klik Terapkan Perubahan
  console.log('Applying update_price proposal...')
  await actionCard4.locator('.proposal-btn-apply').click()
  await page.waitForTimeout(600)
  const status4 = await actionCard4.locator('.proposal-status-pill').innerText()
  console.log('Status after apply:', status4)

  // --- TEST TOOL 5: update_payment_hotkeys ---
  console.log('\n--- TESTING TOOL 5: update_payment_hotkeys ---')
  const bubble5 = await sendAndReceive('Ganti shortcut pembayaran kasir: Tunai jadi T dan QRIS jadi Q.')
  const actionCard5 = bubble5.locator('.action-proposal-card.tool-call-card').first()
  await actionCard5.waitFor({ state: 'visible', timeout: 15000 })
  console.log('Proposal Card 5 text:', await actionCard5.innerText())

  const screenshot5 = path.join(artifactDir, 'ai-tool-update-hotkeys.png')
  await page.screenshot({ path: screenshot5 })
  console.log('Saved screenshot 5:', screenshot5)

  // Klik Terapkan Perubahan
  console.log('Applying update_payment_hotkeys proposal...')
  await actionCard5.locator('.proposal-btn-apply').click()
  await page.waitForTimeout(600)
  const status5 = await actionCard5.locator('.proposal-status-pill').innerText()
  console.log('Status after apply:', status5)

  // --- TEST 6: Real-time context inquiry ---
  console.log('\n--- TESTING 6: Context Awareness Query ---')
  const bubble6 = await sendAndReceive('Berapa sisa stok Vanilla Cone sekarang dan apa transaksi kasir yang paling terakhir dicatat?')
  const answer6 = await bubble6.locator('.ai-bubble-text').innerText()
  console.log('Answer 6:', answer6)

  const screenshot6 = path.join(artifactDir, 'ai-context-query.png')
  await page.screenshot({ path: screenshot6 })
  console.log('Saved screenshot 6:', screenshot6)

  await browser.close()
  console.log('\n--- ALL E2E LIVE AI ASSISTANT TESTS COMPLETED SUCCESSFULLY! ---')
}

run().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
