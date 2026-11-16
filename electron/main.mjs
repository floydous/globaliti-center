import { app, BrowserWindow, Menu, shell } from 'electron'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { startServer } from '../scripts/serve.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = 4173
const HOST = '127.0.0.1'
const APP_URL = `http://${HOST}:${PORT}/`

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

function createMenu() {
  const isMac = process.platform === 'darwin'
  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about', label: 'Tentang Globaliti' },
            { type: 'separator' },
            { role: 'quit', label: 'Keluar' },
          ],
        }]
      : []),
    {
      label: 'Sistem',
      submenu: [
        {
          label: 'Cetak Nota (Print)',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            mainWindow?.webContents.print()
          },
        },
        {
          label: 'Muat Ulang Halaman',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow?.reload()
          },
        },
        {
          label: 'Layar Penuh (Kiosk/POS)',
          accelerator: 'F11',
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen())
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Keluar',
          accelerator: isMac ? 'Cmd+Q' : 'Alt+F4',
          click: () => {
            app.quit()
          },
        },
      ],
    },
    {
      label: 'Tampilan',
      submenu: [
        { role: 'resetZoom', label: 'Ukuran Normal' },
        { role: 'zoomIn', label: 'Perbesar (+)' },
        { role: 'zoomOut', label: 'Perkecil (-)' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Buka Developer Tools (F12)', accelerator: 'F12' },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

async function createWindow() {
  await ensureServerRunning()

  const iconPath = path.resolve(__dirname, '../public/globaliti-creative-center-icon.png')

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 980,
    minHeight: 640,
    title: 'Globaliti Creative Center - SMKS TI Bali Global Denpasar',
    icon: iconPath,
    backgroundColor: '#eef1f4',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  createMenu()

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
