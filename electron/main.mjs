import { app, BrowserWindow, Menu, shell, ipcMain, dialog } from 'electron'
import path from 'node:path'
import http from 'node:http'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { startServer } from '../scripts/serve.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = 4173
const HOST = '127.0.0.1'
const APP_URL = `http://${HOST}:${PORT}/`
const APP_ID = 'com.globaliti.center'

// Daftarkan AppUserModelId agar Windows Taskbar Search dan Start Menu mengenalinya
app.setAppUserModelId(APP_ID)

let mainWindow = null
let localServer = null

// Cegah multi-instance kasir berjalan ganda
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

function checkServerReady(url, maxAttempts = 20, delayMs = 150) {
  return new Promise((resolve) => {
    let attempts = 0
    const tryConnect = () => {
      attempts++
      const req = http.get(url, (res) => {
        res.resume()
        resolve(true)
      })
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          resolve(false)
        } else {
          setTimeout(tryConnect, delayMs)
        }
      })
      req.setTimeout(500, () => {
        req.destroy()
        if (attempts >= maxAttempts) resolve(false)
        else setTimeout(tryConnect, delayMs)
      })
    }
    tryConnect()
  })
}

async function ensureServerRunning() {
  const isAlreadyRunning = await checkServerReady(APP_URL, 2, 100)
  if (isAlreadyRunning) return

  try {
    localServer = await startServer(PORT, HOST)
  } catch (err) {
    if (err && err.code === 'EADDRINUSE') {
      // Server sudah berjalan di proses lain, gunakan yang ada
      return
    }
    console.error('Gagal menjalankan server internal Globaliti:', err)
  }

  const isReady = await checkServerReady(APP_URL, 25, 200)
  if (!isReady) {
    console.warn(`Server lokal belum merespons di ${APP_URL}. Memuat tampilan...`)
  }
}

function setupShortcuts(win) {
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return

    // F11: Layar Penuh (Kiosk/POS)
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen())
      event.preventDefault()
      return
    }

    // Ctrl+P / Cmd+P: Cetak Nota
    if ((input.control || input.meta) && (input.key === 'p' || input.key === 'P')) {
      win.webContents.print()
      event.preventDefault()
      return
    }

    // F5 / Ctrl+R: Muat Ulang Halaman
    if (input.key === 'F5' || ((input.control || input.meta) && (input.key === 'r' || input.key === 'R'))) {
      win.reload()
      event.preventDefault()
      return
    }

    // F12 / Ctrl+Shift+I: Developer Tools
    if (input.key === 'F12' || ((input.control || input.meta) && input.shift && (input.key === 'i' || input.key === 'I'))) {
      win.webContents.toggleDevTools()
      event.preventDefault()
      return
    }

    // Alt+F4 / Ctrl+Q: Keluar
    if (((input.control || input.meta) && (input.key === 'q' || input.key === 'Q')) || (input.alt && input.key === 'F4')) {
      app.quit()
      event.preventDefault()
      return
    }
  })
}

async function createWindow() {
  await ensureServerRunning()

  // Hapus menu bar bawaan ("Sistem", "Tampilan") agar tampilan aplikasi bersih dan profesional
  Menu.setApplicationMenu(null)

  const iconPath = process.platform === 'win32' && fs.existsSync(path.resolve(__dirname, '../build/icon.ico'))
    ? path.resolve(__dirname, '../build/icon.ico')
    : path.resolve(__dirname, '../public/globaliti-creative-center-icon.png')

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 980,
    minHeight: 640,
    title: 'Globaliti Creative Center - SMKS TI Bali Global Denpasar',
    icon: iconPath,
    backgroundColor: '#eef1f4',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.resolve(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  })

  setupShortcuts(mainWindow)

  // Buka tautan luar di browser sistem bawaan OS
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://${HOST}:${PORT}`)) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  await mainWindow.loadURL(APP_URL)
}

ipcMain.handle('download-pdf', async (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return { success: false, error: 'Window not found' }

  try {
    const defaultFilename = options.filename || `Laporan-Keuangan-${new Date().toISOString().slice(0, 10)}.pdf`
    let defaultPath = defaultFilename
    try {
      defaultPath = path.join(app.getPath('downloads'), defaultFilename)
    } catch {
      defaultPath = defaultFilename
    }

    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Simpan Laporan Keuangan (PDF)',
      defaultPath,
      filters: [
        { name: 'Dokumen PDF (*.pdf)', extensions: ['pdf'] },
        { name: 'Semua Berkas (*.*)', extensions: ['*'] },
      ],
    })

    if (canceled || !filePath) {
      return { success: false, canceled: true }
    }

    const pdfBuffer = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    })

    await fs.promises.writeFile(filePath, pdfBuffer)
    return { success: true, filePath, filename: path.basename(filePath) }
  } catch (err) {
    console.error('Gagal mengekspor PDF:', err)
    return { success: false, error: err.message }
  }
})

app.whenReady().then(async () => {
  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (localServer) {
    try {
      localServer.close()
    } catch {}
    localServer = null
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
