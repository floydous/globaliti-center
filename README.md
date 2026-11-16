# Globaliti Creative Center

Aplikasi kasir (POS), katalog stok, dan laporan keuangan SAK EMKM untuk unit usaha sekolah
Globaliti Creative Center, SMKS TI Bali Global Denpasar. Data tersimpan di database SQLite lokal
(`.globaliti/store.db`) dengan sinkronisasi ke penyimpanan lokal browser.

## Fitur

- **Kasir POS**: pindai barcode atau ketuk produk, pembayaran Tunai/QRIS, hotkey, urutan produk
  yang bisa diatur (seret atau tombol panah) agar produk yang sulit dipindai ada di atas.
- **Katalog & Stok**: tampilan kartu atau tabel, penyesuaian stok, foto produk (PNG/JPG/WebP,
  diperkecil otomatis).
- **Laporan Keuangan SAK EMKM**: laba rugi satu langkah, neraca, rekap penjualan harian dengan
  pemilih rentang tanggal (seret dari satu tanggal ke tanggal lain), pencatatan beban, dan dokumen
  resmi siap cetak/PDF.
- **Asisten AI** (opsional): memakai Groq; setiap perubahan data yang diusulkan harus disetujui
  kasir lebih dulu.

## Menjalankan

Butuh Node.js 20.3 atau lebih baru.

```bash
npm install
npm run dev        # pengembangan, http://localhost:5173
npm run build      # build produksi ke dist/
npm run preview    # server produksi, http://127.0.0.1:4173
npm test           # membangun lalu menjalankan seluruh pengujian Playwright
npm run lint
```

Pengujian memakai browser Playwright; pasang sekali dengan `npx playwright install chromium`.

## Data dan cadangan

- Data (produk, nota, beban, pengaturan) disimpan secara permanen di database SQLite lokal
  (`.globaliti/store.db`) pada mesin server dan disinkronkan dengan penyimpanan browser.
- Cadangan dapat diunduh kapan saja melalui **Pengaturan** dalam bentuk file JSON maupun database `.sqlite`.
- Berkas cadangan tidak memuat kunci API.
- Saat pertama dibuka, aplikasi memuat nota dan beban **contoh**. Hapus lewat tombol
  **Hapus data contoh** di Laporan Keuangan sebelum dipakai untuk pembukuan sebenarnya.
  Untuk persiapan pembukuan awal atau stok opname, tersedia opsi **Nolkan Semua Stok** dan
  **Reset Data Keuangan** di **Pengaturan > Zona Berbahaya**.
- Nama unit dan modal kas awal diatur di **Pengaturan > Informasi Unit Usaha**. Kop laporan,
  penyusun, kode dokumen, dan persentase HPP memakai nilai bawaan di `src/lib/business.ts`.

## Asisten AI dan keamanan

Kunci Groq tidak pernah disimpan di browser. Server menyimpannya sebagai berkas
(`.globaliti/groq-key.txt`, diabaikan git) atau membacanya dari `GROQ_API_KEY`, dan meneruskan
permintaan asisten ke Groq lewat `/api/groq/chat`. Saat asisten dipakai, kunci, percakapan, dan
ringkasan data toko dikirim ke Groq.

Karena endpoint itu memakai kunci berbayar, aksesnya dibatasi:

| Situasi | Perilaku |
| --- | --- |
| Lokal (bawaan) | Server hanya mendengarkan `127.0.0.1`, hanya menerima host lokal, dan menolak permintaan lintas situs. |
| Perangkat lain di jaringan toko | Jalankan dengan `HOST=0.0.0.0` dan atur `GLOBALITI_API_TOKEN` (atau `GLOBALITI_ALLOWED_HOSTS`). Isi token yang sama di **Pengaturan > Token akses server**. |
| Vercel / serverless | `GLOBALITI_API_TOKEN` **wajib**; tanpa token endpoint menolak semua permintaan. Isi juga `GROQ_API_KEY`, karena disk serverless tidak permanen. |

Permintaan chat dibatasi bentuk, jumlah pesan, dan panjang jawabannya. Server produksi dan
`vercel.json` mengirim header keamanan (CSP, `X-Frame-Options`, `nosniff`). Daftar variabel
lingkungan ada di `.env.example`.

Usulan asisten (stok, penjualan, beban, harga, produk baru, hotkey) diperiksa lagi sebelum
diterapkan: angka harus wajar, produk harus ada, dan gambar tidak pernah diterima dari asisten.

## Catatan pembukuan

- Laporan laba rugi memakai format **satu langkah**: total pendapatan dikurangi total beban
  (HPP + beban operasional) menghasilkan laba atau rugi bersih.
- Harga modal per produk tidak dicatat, jadi **HPP adalah estimasi** (persentase dari harga jual,
  tetap 57%). Nilai persediaan memakai estimasi yang sama.
- Neraca: saldo laba berjalan sama dengan laba bersih; modal awal adalah sisanya (kas awal
  ditambah persediaan awal). Pembelian stok tidak dicatat sebagai beban, jadi kulakan tidak
  memengaruhi kas pada laporan ini.
- Nota yang dibuat sebelum fitur tanggal ada tampil sebagai "Tanpa tanggal" dan tidak dihitung
  dalam "Hari ini".
- Perubahan stok per hari (`awal → akhir`) hanya tersedia untuk nota yang dibuat sejak fitur itu
  ada, dan hanya membandingkan stok sebelum penjualan pertama dan sesudah penjualan terakhir.

## Rencana Electron

Kode aplikasi sengaja dibuat kompatibel dengan Electron (hanya API web standar: penyimpanan
lokal, `window.print()`, input berkas, seret-lepas, SVG). Dua hal yang perlu diperhatikan saat
membungkusnya:

- Muat aplikasi dari server lokal (`scripts/serve.mjs` dijalankan oleh proses utama pada port
  tetap, lalu `loadURL('http://127.0.0.1:<port>')`), bukan `file://`. Alamat `/api/groq*`, gambar
  `/products/...`, dan header keamanan bergantung pada server itu.
- Port harus tetap. Penyimpanan lokal terikat pada asal (`http://127.0.0.1:<port>`); mengganti
  port berarti data lama tidak terbaca.

## Struktur

```
src/                aplikasi React + TypeScript (components, lib, docs)
scripts/serve.mjs   server produksi lokal (berkas statis + API asisten)
scripts/groq-key-store.mjs  penyimpanan kunci, otorisasi, dan proxy Groq
api/                fungsi serverless Vercel yang memakai modul yang sama
tests/              pengujian Playwright
```
