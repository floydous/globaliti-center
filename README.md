# Globaliti Creative Center

[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D20.3-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite_(node:sqlite)-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Playwright](https://img.shields.io/badge/Tested_with-Playwright-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)

Aplikasi kasir (Point of Sale), manajemen inventori & katalog stok, serta pembukuan laporan keuangan berstandar **SAK EMKM** untuk unit usaha sekolah **Globaliti Creative Center, SMKS TI Bali Global Denpasar**. 

Aplikasi dirancang untuk bekerja secara lokal (offline-first) dengan keandalan database **SQLite lokal server** (`.globaliti/store.db`), sinkronisasi instan ke browser kasir, pengamanan transaksi atomik, dan asisten AI toko berbasis Groq API.

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
  - [1. Kasir POS (Point of Sale)](#1-kasir-pos-point-of-sale)
  - [2. Katalog Stok & Barcode](#2-katalog-stok--barcode)
  - [3. Laporan Keuangan SAK EMKM](#3-laporan-keuangan-sak-emkm)
  - [4. Asisten AI Toko (Groq)](#4-asisten-ai-toko-groq)
  - [5. Zona Berbahaya & Manajemen Data](#5-zona-berbahaya--manajemen-data)
- [Arsitektur Data & Keamanan](#arsitektur-data--keamanan)
- [Prasyarat & Cara Menjalankan](#prasyarat--cara-menjalankan)
- [Konfigurasi Lingkungan (.env)](#konfigurasi-lingkungan-env)
- [Prinsip & Catatan Pembukuan](#prinsip--catatan-pembukuan)
- [Pengemasan Aplikasi Desktop (Electron)](#pengemasan-aplikasi-desktop-electron)
- [Struktur Proyek](#struktur-proyek)

---

## Fitur Utama

### 1. Kasir POS (Point of Sale)
- **Pemindai Barcode**: Mendukung USB Barcode Scanner fisik (mode keyboard wedge) dengan tangkapan barcode global (`global barcode capture`).
- **Antarmuka Responsif & Cepat**: Pemilihan produk instan via sentuhan/klik, penyesuaian kuantitas produk, dan urutan produk manual (drag-and-drop atau tombol panah) agar produk terlaris atau yang sulit dipindai berada di baris teratas.
- **Metode Pembayaran**: Mendukung pembayaran **Tunai** (dengan kalkulator kembalian otomatis dan pilihan nominal cepat) serta **QRIS**.
- **Keyboard Shortcuts (Hotkeys)**: Tombol `Enter` untuk menyelesaikan pembayaran secara instan, serta pemetaan hotkey cepat yang dapat dikonfigurasi.
- **Cetak Nota Kasir**: Format nota struk belanja siap cetak melalui dialog cetak sistem browser (`window.print()`).

### 2. Katalog Stok & Barcode
- **Dual Mode Tampilan**: Mode Grid Kartu (dengan pratinjau gambar) dan Mode Tabel Ringkas untuk pemantauan stok massal.
- **Pengurutan Fleksibel**: Urutkan berdasarkan Pembeli Terbanyak, Unit Terjual, Stok Tertinggi/Terendah, Nama Produk, Harga Jual, serta Status Produk Aktif/Nonaktif.
- **Penyesuaian Stok (Stock Opname)**: Catat kulakan stok masuk, barang rusak/kedaluwarsa, atau penyesuaian fisik opname dengan riwayat pencatatan.
- **Peringatan Reorder Point**: Penanda visual otomatis saat stok produk menyentuh atau berada di bawah batas minimum pemesanan kembali (*reorder threshold*).
- **Generator Barcode EAN-13**: Pembuatan barcode standar EAN-13 otomatis yang valid, dilengkapi lembar cetak stiker barcode siap tempel.
- **Optimalisasi Foto Produk**: Unggah gambar (PNG/JPG/WebP) dengan kompresi otomatis di sisi browser tanpa membebani memori penyimpanan.

### 3. Laporan Keuangan SAK EMKM
- **Laba Rugi Satu Langkah (*Single-Step Income Statement*)**: Menghitung Total Pendapatan Penjualan dikurangi Total Beban Usaha (Estimasi HPP + Beban Operasional) langsung menjadi Laba/Rugi Bersih tanpa subtotal laba kotor, sesuai format SAK EMKM.
- **Laporan Posisi Keuangan (Neraca)**: Menyeimbangkan Aset Lancar (Kas & Setara Kas, Estimasi Nilai Persediaan) terhadap Liabilitas dan Ekuitas (Modal Awal + Saldo Laba Berjalan).
- **Rekap Penjualan Harian**: Kalender pemilih rentang tanggal interaktif (seret rentang tanggal atau klik satu hari). Menyajikan rekap nota, item terjual, omzet, estimasi laba kotor, serta pergerakan stok awal ke akhir per hari.
- **Pencatatan Beban Operasional**: Input pengeluaran operasional unit (seperti ATK, kertas, perlengkapan toko).
- **Format Laporan Resmi Siap Cetak**: Kop surat resmi sekolah, nama penyusun laporan, penanggung jawab kepala unit, kode dokumen, dan tata letak cetak dokumen formal pertanggungjawaban.

### 4. Asisten AI Toko (Groq)
- **Proxy Server Aman**: Kunci API Groq disimpan di server lokal (`.globaliti/groq-key.txt`) dan tidak pernah terekspos ke browser kasir.
- **Tanya Jawab Operasional**: Asisten memahami katalog stok toko, ringkasan laporan keuangan, dan panduan penggunaan sistem.
- **Human-in-the-Loop Mutations**: Asisten dapat mengusulkan perubahan stok, harga, atau produk baru, tetapi seluruh perubahan wajib disetujui kasir melalui kartu konfirmasi sebelum diterapkan ke database.

### 5. Zona Berbahaya & Manajemen Data
- **Nolkan Semua Stok**: Menyetel seluruh stok produk menjadi 0 untuk persiapan stok opname fisik menyeluruh.
- **Reset Data Keuangan**: Menghapus seluruh nota penjualan dan beban untuk persiapan pembukuan tahun ajaran baru (dengan dialog konfirmasi ganda).
- **Cadangan Harian Bergulir (Rotasi 7 Hari)**:
  - Database dicadangkan secara otomatis setiap hari menggunakan snapshot aman `VACUUM INTO` ke `.globaliti/backups/`.
  - Penamaan berkas terstandar per hari:
    - `globaliti-backup-day-1-monday.sqlite`
    - `globaliti-backup-day-2-tuesday.sqlite`
    - `globaliti-backup-day-3-wednesday.sqlite`
    - `globaliti-backup-day-4-thursday.sqlite`
    - `globaliti-backup-day-5-friday.sqlite`
    - `globaliti-backup-day-6-saturday.sqlite`
    - `globaliti-backup-day-7-sunday.sqlite`
  - **Siklus 7 Hari**: Setelah 7 hari penuh (pada hari ke-8 / Senin berikutnya), sistem secara sirkular menimpa berkas cadangan Hari ke-1 dengan data baru.
  - Status ke-7 slot cadangan dapat dipantau dan diunduh langsung dari menu **Pengaturan**.
- **Cadangan Ganda**: Ekspor dan impor data sewaktu-waktu dalam format JSON, atau unduh snapshot database biner SQLite (`.sqlite`).

---

## Arsitektur Data & Keamanan

```
   ┌─────────────────────────────────────────────────────────────┐
   │                       Browser Kasir                         │
   │  React 19 + TypeScript + UI Local Cache (localStorage)      │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ HTTP /api/db/* (Atomic Sync)
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  Node.js Local Server                       │
   │            (scripts/serve.mjs / Vite Proxy)                 │
   │  ┌───────────────────────────────────────────────────────┐  │
   │  │ node:sqlite DatabaseSync (WAL Mode + Foreign Keys)    │  │
   │  │ Penyimpanan Permanen: .globaliti/store.db             │  │
   │  └───────────────────────────────────────────────────────┘  │
   │  ┌───────────────────────────────────────────────────────┐  │
   │  │ Groq Key Proxy (.globaliti/groq-key.txt)              │  │
   │  └───────────────────────────────────────────────────────┘  │
   └─────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Keandalan Database**: Data transaksi, produk, dan laporan tidak lagi hanya bergantung pada `localStorage` browser. Server menyimpan seluruh mutasi ke database SQLite lokal (`.globaliti/store.db`) menggunakan transaksi atomik (`BEGIN` / `COMMIT`), mode WAL (*Write-Ahead Logging*), dan integritas kunci asing (*foreign keys*).

### Matriks Keamanan Jaringan & Token

| Skenario | Konfigurasi | Perilaku Keamanan |
| :--- | :--- | :--- |
| **Komputer Kasir Lokal (Bawaan)** | Host: `127.0.0.1` | Server hanya mendengarkan loopback lokal, menolak host asing, dan memblokir permintaan lintas situs (`Sec-Fetch-Site: cross-site`). |
| **Jaringan Toko / Wi-Fi (Multi-Device)** | Host: `0.0.0.0` | Memerlukan `GLOBALITI_API_TOKEN`. Masukkan token yang sama di **Pengaturan > Token akses server** pada setiap tablet/perangkat kasir. |
| **Vercel / Serverless** | Serverless Function | Wajib mengatur `GLOBALITI_API_TOKEN` dan `GROQ_API_KEY` pada *Environment Variables*. |

Semua respons server dilengkapi header keamanan standar industri: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, serta `Cache-Control: no-store` pada endpoint database.

---

## Prasyarat & Cara Menjalankan

### Kebutuhan Sistem
- **Node.js**: Versi `20.3` atau lebih baru (disarankan Node.js 22+ untuk performa `node:sqlite` bawaan).
- **NPM**: Bawaan Node.js.

### Langkah Instalasi

1. **Clone repositori dan pasang dependensi**:
   ```bash
   git clone <url-repo>
   cd globaliti-center
   npm install
   ```

2. **Jalankan server pengembangan (Development)**:
   ```bash
   npm run dev
   ```
   Buka peramban di `http://localhost:5173`.

3. **Membangun versi produksi**:
   ```bash
   npm run build
   ```

4. **Menjalankan server produksi lokal**:
   ```bash
   npm run preview
   # Atau langsung: node scripts/serve.mjs
   ```
   Aplikasi siap diakses pada `http://127.0.0.1:4173`.

5. **Menjalankan pengujian (Automated Tests)**:
   ```bash
   # Pasang browser Playwright (cukup sekali di awal):
   npx playwright install chromium

   # Jalankan seluruh pengujian:
   npm test

   # Menjalankan linter kode:
   npm run lint
   ```

---

## Konfigurasi Lingkungan (.env)

Buat file `.env` di direktori utama jika Anda memerlukan kustomisasi port atau token jaringan (lihat [.env.example](file:///c:/Users/brat/Scripts/globaliti-center/.env.example)):

```bash
# Port dan Host Server
PORT=4173
HOST=127.0.0.1

# Lokasi File Database SQLite (Bawaan: .globaliti/store.db)
# GLOBALITI_DB_FILE=/path/absolut/store.db

# Kunci API Groq (Opsional, lebih disarankan via Pengaturan UI)
# GROQ_API_KEY=gsk_...
# GLOBALITI_GROQ_KEY_FILE=/path/absolut/groq-key.txt

# Token Akses (Wajib bila aplikasi diakses lintas perangkat via HOST=0.0.0.0)
# GLOBALITI_API_TOKEN=rahasia-toko-123

# Host yang diizinkan (Opsional)
# GLOBALITI_ALLOWED_HOSTS=192.168.1.50,kasir.local
```

---

## Prinsip & Catatan Pembukuan

1. **Format SAK EMKM Laba Rugi**:
   - Format laporan laba rugi menggunakan model **satu langkah** (*single-step*): Total Pendapatan Usaha dikurangi Beban Usaha (Estimasi HPP ditambah beban operasional) menghasilkan Laba/Rugi Bersih.
2. **Estimasi HPP (Harga Pokok Penjualan)**:
   - Karena harga modal kulakan per batch produk es krim tidak dicatat secara individual, **HPP diestimasi 57% dari harga jual** (dapat disesuaikan di `src/lib/business.ts`). Estimasi nilai persediaan barang dagang pada neraca dihitung dengan formula rasio yang sama.
3. **Neraca (Laporan Posisi Keuangan)**:
   - Saldo Laba Berjalan sama dengan Laba Bersih periode berjalan.
   - Modal Awal mencerminkan kas awal ditambah nilai persediaan awal toko.
4. **Data Contoh Awal**:
   - Saat pertama kali dibuka, aplikasi memuat nota transaksi dan beban contoh untuk demonstrasi. Klik tombol **Hapus data contoh** pada Laporan Keuangan sebelum memulai pembukuan riil.

---

## Aplikasi Desktop & Standalone

Aplikasi dapat dijalankan secara mandiri sebagai aplikasi desktop (*standalone*) tanpa membuka browser terpisah secara manual:

### 1. Aplikasi Desktop (Electron)
Aplikasi desktop menggabungkan server Node.js SQLite lokal dan jendela Chromium kasir menjadi satu kesatuan:
```bash
# Menjalankan aplikasi desktop langsung:
npm run app

# Di Windows, bisa klik dua kali berkas (berjalan hening tanpa jendela terminal):
start-app.vbs
# Atau klik:
start-desktop.bat

# Daftarkan langsung ke Windows Start Menu & Taskbar Search:
npm run register:start-menu

# Membangun file instalasi executable (.exe Windows Setup):
npm run dist:win
```
- **Tampilan Bersih & Hening (Zero-Terminal)**:
  - Berjalan sepenuhnya di latar belakang tanpa mengekspos jendela terminal atau command prompt.
  - Menu bar sistem bawaan dinonaktifkan (`autoHideMenuBar`) agar antarmuka kasir bersih dan tidak terdistraksi.
  - Pintasan kasir tetap aktif: `F11` (layar penuh kiosk), `Ctrl+P` (cetak nota), `F5`/`Ctrl+R` (muat ulang), `F12` (dev tools).
- **Integrasi Windows Search & Taskbar**:
  - Didaftarkan dengan `AppUserModelId` (`com.globaliti.center`) dan nama produk resmi `Globaliti Creative Center`.
  - Menggunakan logo resmi perusahaan (`public/globaliti-creative-center-icon.png` yang dikemas ke format multi-resolusi `build/icon.ico`: 16x16 hingga 256x256).
  - Terindeks langsung oleh Windows Search Manager: tekan tombol `Windows` dan ketik **"Globaliti"** di bilah pencarian taskbar untuk langsung membuka aplikasi.
- **Fitur Desktop**:
  - Peluncuran otomatis server SQLite internal pada `http://127.0.0.1:4173/`.
  - Mode Layar Penuh Kiosk Kasir (`F11`).
  - Pintasan cetak nota langsung (`Ctrl+P`).
  - Pencegahan multi-instance ganda (*single instance lock*).
  - Isolasi konteks aman (`contextIsolation: true`, `sandbox: true`, tanpa eksposur nodeIntegration ke halaman web).

### 2. Standalone Web App (PWA)
Saat diakses melalui Google Chrome atau Microsoft Edge (baik di komputer kasir maupun tablet lain di jaringan toko), peramban akan menampilkan opsi **"Install Globaliti POS"** di bilah alamat:
- Berjalan di jendela aplikasi independen tanpa tab atau address bar.
- Membawa ikon toko resmi sekolah dan tema warna antarmuka.

---

## Struktur Proyek

```
globaliti-center/
├── api/                        # Serverless function handlers (Vercel kompatibel)
│   ├── db/                     # Endpoint API database SQLite (/api/db/*)
│   └── groq/                   # Endpoint proxy asisten Groq (/api/groq/*)
├── public/                     # Aset publik statis (gambar es krim, ikon, favicon)
├── scripts/                    # Skrip server dan backend storage
│   ├── serve.mjs               # Server produksi lokal terpadu (Static + APIs)
│   ├── sqlite-store.mjs        # Engine SQLite lokal (node:sqlite, WAL, transaksi)
│   └── groq-key-store.mjs      # Manajemen kunci & proxy otorisasi Groq
├── src/                        # Sumber kode aplikasi React + TypeScript
│   ├── components/             # Komponen antarmuka (POS, Katalog, Laporan, Setting)
│   ├── docs/                   # Panduan operasional sistem in-app (systemManual.ts)
│   ├── lib/                    # Logika bisnis (store, SAK EMKM, barcode, HPP)
│   ├── GlobalitiApp.tsx        # Komponen utama dan perutean tampilan
│   └── types.ts                # Definisi antarmuka TypeScript
├── tests/                      # Rangkaian pengujian otomatis Playwright & unit test
│   ├── sqlite-store.spec.js    # Pengujian fungsional database SQLite
│   ├── sqlite-stress-security.spec.js # Pengujian stres, konkurensi, dan sekuriti
│   ├── settings-danger-zone.spec.js   # Pengujian reset data & zona berbahaya
│   └── catalog-sort.spec.js    # Pengujian pengurutan produk
├── package.json                # Dependensi dan skrip proyek
├── playwright.config.js        # Konfigurasi Playwright test runner
├── vite.config.ts              # Konfigurasi Vite & middleware backend development
└── README.md                   # Dokumentasi teknis sistem
```

---

## Lisensi & Hak Cipta

Dikembangkan untuk unit usaha **Globaliti Creative Center**, SMKS TI Bali Global Denpasar. Hak cipta dilindungi undang-undang.
