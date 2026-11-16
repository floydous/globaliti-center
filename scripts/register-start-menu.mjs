import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

if (process.platform !== 'win32') {
  console.log('Pendaftaran pintasan Start Menu hanya didukung pada sistem operasi Windows.')
  process.exit(0)
}

const appData = process.env.APPDATA
if (!appData) {
  console.error('Variabel lingkungan APPDATA tidak ditemukan.')
  process.exit(1)
}

const startMenuDir = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs')
const shortcutPath = path.join(startMenuDir, 'Globaliti Creative Center.lnk')

const isRemove = process.argv.includes('--remove') || process.argv.includes('-r')

if (isRemove) {
  if (fs.existsSync(shortcutPath)) {
    fs.unlinkSync(shortcutPath)
    console.log(`Pintasan berhasil dihapus dari Start Menu:\n${shortcutPath}`)
  } else {
    console.log('Pintasan belum terdaftar di Start Menu.')
  }
  process.exit(0)
}

// Cari target executable: rilis paket .exe bila ada, atau start-app.vbs via wscript.exe
const releaseExe = path.join(rootDir, 'release', 'win-unpacked', 'globaliti-center.exe')
const vbsTarget = path.join(rootDir, 'start-app.vbs')

let targetPath = ''
let targetArgs = ''

if (fs.existsSync(releaseExe)) {
  targetPath = releaseExe
  targetArgs = ''
} else {
  // Gunakan wscript.exe untuk menjalankan aplikasi tanpa memunculkan jendela terminal
  targetPath = 'wscript.exe'
  targetArgs = `"${vbsTarget}"`
}

const iconPath = path.join(rootDir, 'build', 'icon.ico')
const workingDir = rootDir
const description = 'Sistem Kasir POS & Laporan Keuangan SAK EMKM Globaliti Creative Center'

const psScript = `
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')
$sc.TargetPath = '${targetPath.replace(/'/g, "''")}'
$sc.Arguments = '${targetArgs.replace(/'/g, "''")}'
$sc.WorkingDirectory = '${workingDir.replace(/'/g, "''")}'
$sc.Description = '${description.replace(/'/g, "''")}'
$sc.WindowStyle = 7
if (Test-Path '${iconPath.replace(/'/g, "''")}') {
    $sc.IconLocation = '${iconPath.replace(/'/g, "''")},0'
}
$sc.Save()
`

try {
  execFileSync('powershell.exe', ['-NoProfile', '-Command', psScript], { stdio: 'inherit' })
  console.log('----------------------------------------------------')
  console.log('Aplikasi berhasil didaftarkan ke Windows Start Menu & Taskbar Search!')
  console.log(`Lokasi pintasan: ${shortcutPath}`)
  console.log(`Target: ${targetPath}`)
  console.log(`Icon:   ${iconPath}`)
  console.log('Sekarang Anda dapat menekan tombol Windows dan mengetik "Globaliti" di bilah pencarian.')
  console.log('----------------------------------------------------')
} catch (err) {
  console.error('Gagal membuat pintasan Start Menu:', err)
  process.exit(1)
}
