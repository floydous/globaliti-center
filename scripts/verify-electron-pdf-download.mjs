import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const targetPdfPath = path.resolve('dogfood-output/e2e-downloaded-report.pdf')
if (fs.existsSync(targetPdfPath)) {
  fs.unlinkSync(targetPdfPath)
}

// Override showSaveDialog to simulate user choosing a file location without blocking
dialog.showSaveDialog = async () => {
  return { canceled: false, filePath: targetPdfPath }
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.resolve(__dirname, '../electron/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Register the real IPC handler
  ipcMain.handle('download-pdf', async (event, options = {}) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender)
    const { canceled, filePath } = await dialog.showSaveDialog(senderWin, {
      defaultPath: options.filename,
    })
    if (canceled || !filePath) return { success: false, canceled: true }

    const pdfBuffer = await senderWin.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    })

    await fs.promises.writeFile(filePath, pdfBuffer)
    return { success: true, filePath, filename: path.basename(filePath) }
  })

  console.log('Loading app at http://127.0.0.1:4173/ ...')
  await win.loadURL('http://127.0.0.1:4173/')

  // Open Laporan Keuangan
  console.log('Opening Laporan Keuangan...')
  await win.webContents.executeJavaScript(`
    const financeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Laporan Keuangan'));
    if (financeBtn) financeBtn.click();
  `)
  await new Promise((r) => setTimeout(r, 600))

  // Open Preview Modal
  console.log('Opening Pratinjau Dokumen modal...')
  await win.webContents.executeJavaScript(`
    const previewBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Pratinjau Dokumen'));
    if (previewBtn) previewBtn.click();
  `)
  await new Promise((r) => setTimeout(r, 600))

  // Verify modal is open and click "Unduh (PDF)"
  console.log('Clicking Unduh (PDF)...')
  const downloadResult = await win.webContents.executeJavaScript(`
    (async () => {
      const downloadBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Unduh (PDF)'));
      if (!downloadBtn) throw new Error('Unduh (PDF) button not found in modal');
      downloadBtn.click();
      // Wait for IPC promise to resolve
      await new Promise(r => setTimeout(r, 1200));
      return true;
    })()
  `)

  console.log('Download trigger completed:', downloadResult)

  if (!fs.existsSync(targetPdfPath)) {
    throw new Error('Target PDF file was NOT created on disk!')
  }

  const stat = fs.statSync(targetPdfPath)
  console.log('SUCCESS! Real PDF created on disk. Size:', stat.size, 'bytes at:', targetPdfPath)

  const header = fs.readFileSync(targetPdfPath).slice(0, 5).toString()
  if (header !== '%PDF-') {
    throw new Error('File is not a valid PDF header: ' + header)
  }
  console.log('PDF Header verified:', header)

  app.quit()
})
